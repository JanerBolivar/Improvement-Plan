import mongoose from 'mongoose';
import Activity from '../models/Activity.js';
import User from '../models/User.js';
import Program from '../models/Program.js';
import ImprovementPlan from '../models/ImprovementPlan.js';
import SubActivityTracking from '../models/SubActivityTracking.js';
import ExcelJS from 'exceljs';
import path from 'path';
import { fileURLToPath } from 'url';


const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Controlador de dominio encargado de orquestar la lógica de negocio para Hallazgos y Subactividades.
 */
export const activityController = {
    /**
     * Recupera el conjunto consolidado de hallazgos aplicando filtros de autorización basados en roles (RBAC)
     * y discriminación opcional por identificador de plan de mejoramiento.
     */
    getAll: async (req, res, next) => {
        try {
            const { role, _id, program } = req.user;

            if (!program && role !== 'admin') {
                return res.json({ success: true, data: [], message: 'Debe tener un programa asignado para ver actividades.' });
            }

            let filter = {};
            const { status, planId, programId } = req.query;

            // Resolución de la entidad de adscripción académica (Programa) en función del contexto de rol del usuario
            const targetProgram = role === 'admin' ? programId : program;
            if (targetProgram) {
                filter.program = targetProgram;
            }

            // Evaluación y aplicación de los criterios de filtrado por Plan y Nivel de Acceso (RBAC)
            if (role === 'teacher') {
                // Restricción para rol 'teacher': Filtrado exclusivo por plan de mejoramiento con bandera de actividad activa
                const activePlan = await ImprovementPlan.findOne({ program: targetProgram, isActive: true });
                filter.improvementPlan = activePlan ? activePlan._id : new mongoose.Types.ObjectId();
            } else {
                // Segmento de resolución para roles con privilegios extendidos ('coordinator' o 'admin')
                if (planId) {
                    filter.improvementPlan = planId;
                } else if (targetProgram) {
                    // Fallback automático al plan con estado de vigencia activo
                    const activePlan = await ImprovementPlan.findOne({ program: targetProgram, isActive: true });
                    filter.improvementPlan = activePlan ? activePlan._id : new mongoose.Types.ObjectId();
                }
            }

            if (status) filter.status = status;

            const activities = await Activity.find(filter)
                .populate('createdBy', 'firstName lastName email')
                .populate('responsibleUsers', 'firstName lastName email')
                .populate('program', 'name coordinator')
                .populate('improvementPlan', 'name startYear endYear horizons');

            const trackings = await SubActivityTracking.find({ activity: { $in: activities.map(a => a._id) } });

            const processedActivities = activities.map(act => {
                const actObj = act.toObject();
                actObj.subActivities = actObj.subActivities.map(sub => {
                    const subTrackings = trackings.filter(t => String(t.subActivityId) === String(sub._id));
                    let totalGoals = 0;
                    let totalAchieved = 0;

                    (sub.annualGoals || []).forEach(goal => {
                        if (goal.value !== null && goal.value > 0) {
                            totalGoals += goal.value;
                            const startYear = actObj.improvementPlan?.startYear || 2024;
                            const yearNum = startYear + goal.yearIndex - 1;
                            const yearTrack = subTrackings.find(t => t.year === yearNum);
                            if (yearTrack) {
                                totalAchieved += (yearTrack.firstSemesterAdvance || 0) + (yearTrack.secondSemesterAdvance || 0);
                            }
                        }
                    });

                    const progressPct = totalGoals > 0 ? Math.min(100, Math.round((totalAchieved / totalGoals) * 100)) : 0;
                    return {
                        ...sub,
                        progressPercent: progressPct
                    };
                });
                return actObj;
            });

            return res.json({ success: true, data: processedActivities });
        } catch (error) { next(error); }
    },

    /**
     * Obtiene un hallazgo por su identificador único.
     *
     * Ejecuta `Activity.findById` sobre `req.params.id` con población de
     * `createdBy`, `responsibleUsers`, `program` e `improvementPlan`.
     *
     * @route GET /api/activities/:id
     * @access Privado.
     * @param {import('express').Request} req - Petición; `req.params.id` con el identificador del hallazgo.
     * @param {import('express').Response} res - Respuesta JSON con el hallazgo encontrado.
     * @param {import('express').NextFunction} next - Delega errores al manejador global.
     * @returns {Promise<void>}
     * @response {200} - `{ success: true, data: Activity }`.
     * @response {404} - Hallazgo no encontrado.
     */
    getById: async (req, res, next) => {
        try {
            const { id } = req.params;
            const activity = await Activity.findById(id)
                .populate('createdBy', 'firstName lastName email')
                .populate('responsibleUsers', 'firstName lastName email')
                .populate('program', 'name coordinator')
                .populate('improvementPlan', 'name startYear endYear horizons');

            if (!activity) {
                return res.status(404).json({ success: false, message: 'Actividad no encontrada.' });
            }
            return res.json({ success: true, data: activity });
        } catch (error) { next(error); }
    },


    /**
     * Genera la exportación del plan de mejoramiento institucional en formato binario de hoja de cálculo (Excel XLSX),
     * proyectando dinámicamente columnas semestrales según el espectro temporal y horizontes del plan.
     */
    exportToExcel: async (req, res, next) => {
        try {
            const { program: userProgramId, role } = req.user;
            const { planId, programId: queryProgramId } = req.query;

            const targetProgram = role === 'admin' 
                ? (queryProgramId || userProgramId) 
                : userProgramId;

            if (!targetProgram && !planId && role !== 'admin') {
                return res.status(403).json({ success: false, message: 'Debe tener un programa asignado para exportar.' });
            }

            // ── Resolución del Plan de Mejoramiento ──────────────────────────
            let plan = null;
            let activityFilter = {};

            if (role === 'teacher') {
                // Restricción para perfil Docente: acotación exclusiva al Plan de Mejoramiento activo y vigente del programa adscrito
                plan = await ImprovementPlan.findOne({ program: targetProgram, isActive: true }).populate('program', 'name coordinator');
                if (!plan) return res.status(404).json({ success: false, message: 'Plan activo no encontrado para este programa.' });
                activityFilter.improvementPlan = plan._id;
                activityFilter.program = targetProgram;
            } else {
                // Resolución del flujo de datos para roles con perfil de administración o coordinación
                if (planId) {
                    plan = await ImprovementPlan.findById(planId).populate('program', 'name coordinator');
                    if (!plan) return res.status(404).json({ success: false, message: 'Plan no encontrado.' });
                    // Validación de consistencia programática: previene el acceso cruzado a planes de otros programas académicos
                    if (role === 'coordinator' && String(plan.program?._id || plan.program) !== String(targetProgram)) {
                        return res.status(403).json({ success: false, message: 'Acceso denegado: el plan no pertenece a su programa.' });
                    }
                    activityFilter.improvementPlan = planId;
                } else {
                    plan = await ImprovementPlan.findOne({ program: targetProgram, isActive: true }).populate('program', 'name coordinator');
                    if (!plan) return res.status(404).json({ success: false, message: 'Plan activo no encontrado para este programa.' });
                    activityFilter.improvementPlan = plan._id;
                    activityFilter.program = targetProgram;
                }
            }

            // Proyección temporal del plan; inicialización de contingencia (fallback de 7 periodos anuales) ante ausencia de metadatos
            const planYears = plan
                ? Array.from({ length: plan.endYear - plan.startYear + 1 }, (_, i) => plan.startYear + i)
                : [2024, 2025, 2026, 2027, 2028, 2029, 2030];
            const yearCount = planYears.length;

            const activities = await Activity.find(activityFilter)
                .populate('responsibleUsers', 'firstName lastName')
                .sort({ createdAt: 1 });

            if (!activities || activities.length === 0) {
                return res.status(404).json({ success: false, message: 'No hay datos para exportar.' });
            }

            // Consulta en base de datos para la hidratación de metadatos del programa y su respectivo coordinador
            const targetProgramId = plan?.program?._id || plan?.program || targetProgram;
            const programDoc = await Program.findById(targetProgramId).populate('coordinator', 'fullName firstName lastName');
            const coordinatorName = programDoc?.coordinator?.fullName ||
                (programDoc?.coordinator ? `${programDoc.coordinator.firstName} ${programDoc.coordinator.lastName}` : 'No asignado');

            // Definición de coordenadas del Layout para el mapeo posicional de columnas indexadas
            // Layout: A-L fijos | M=baseline | N=metaTotal | O..n=años | n+1=evidencia | n+2=tipoRec | n+3=descRec
            const C = {
                id:         1,
                finding:    2,
                factor:     3,
                campus:     4,
                source:     5,
                pdiLine:    6,
                pdiProg:    7,
                activity:   8,
                start:      9,
                end:        10,
                responsible: 11,
                indicator:  12,
                baseline:   13,  // LÍNEA BASE (nuevo campo)
                totalGoal:  14,
                firstYear:  15,
                lastYear:   14 + yearCount,
                evidence:   15 + yearCount,
                resType:    16 + yearCount,
                resDesc:    17 + yearCount
            };
            const totalCols = C.resDesc;

            // Distribución de horizontes temporales dinámica basada en horizons del plan
            let cortoEndCol, medioStartCol, medioEndCol, largoStartCol;

            if (plan && plan.horizons && plan.horizons.shortTerm && plan.horizons.midTerm && plan.horizons.longTerm) {
                const { shortTerm, midTerm } = plan.horizons;
                const shortTermCount = shortTerm.end - shortTerm.start + 1;
                const midTermCount = midTerm.end - midTerm.start + 1;

                cortoEndCol = C.firstYear + shortTermCount - 1;
                medioStartCol = cortoEndCol + 1;
                medioEndCol = cortoEndCol + midTermCount;
                largoStartCol = medioEndCol + 1;
            } else {
                // Fallback clásico: Corto=2, Largo=2, Mediano=resto
                cortoEndCol  = C.firstYear + 1;
                medioStartCol = C.firstYear + 2;
                medioEndCol  = C.lastYear - 2;
                largoStartCol = C.lastYear - 1;
            }


            // Helper: número de columna (1-indexed) → letra(s) Excel
            const colLetter = (n) => {
                let s = '';
                while (n > 0) { n--; s = String.fromCharCode(65 + (n % 26)) + s; n = Math.floor(n / 26); }
                return s;
            };
            const cellRef  = (col, row) => `${colLetter(col)}${row}`;
            const mergeStr = (c1, r1, c2, r2) => `${cellRef(c1, r1)}:${cellRef(c2, r2)}`;
            const lastColLetter = colLetter(totalCols);

            // ── Workbook + Worksheet ──────────────────────────────────────────
            const workbook = new ExcelJS.Workbook();
            const sheet = workbook.addWorksheet('Plan de Mejoramiento');

            // Definición de anchos de columna (key genérico para soporte dinámico)
            sheet.columns = [
                { key: 'id',          width: 6  },
                { key: 'finding',     width: 35 },
                { key: 'factor',      width: 25 },
                { key: 'campus',      width: 15 },
                { key: 'source',      width: 18 },
                { key: 'pdiLine',     width: 25 },
                { key: 'pdiProg',     width: 25 },
                { key: 'activity',    width: 40 },
                { key: 'start',       width: 12 },
                { key: 'end',         width: 12 },
                { key: 'responsible', width: 25 },
                { key: 'indicator',   width: 25 },
                { key: 'baseline',    width: 12 },
                { key: 'totalGoal',   width: 10 },
                ...planYears.map((y) => ({ key: `y${y}`, width: 8 })),
                { key: 'evidence',    width: 25 },
                { key: 'resType',     width: 20 },
                { key: 'resDesc',     width: 30 }
            ];

            // ── Estilos base reutilizables ────────────────────────────────────
            const borderStyle = {
                top:    { style: 'thin', color: { argb: 'FF000000' } },
                left:   { style: 'thin', color: { argb: 'FF000000' } },
                bottom: { style: 'thin', color: { argb: 'FF000000' } },
                right:  { style: 'thin', color: { argb: 'FF000000' } }
            };
            const centerAlign = { vertical: 'middle', horizontal: 'center', wrapText: true, shrinkToFit: true };
            const leftAlign   = { vertical: 'middle', horizontal: 'left' };
            const arialFont   = (size = 8, bold = false) => ({ name: 'Arial', size, bold });
            const headerFill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF92D050' } };

            [1, 2, 3, 4, 5].forEach(r => { sheet.getRow(r).height = 30; });

            // ── BLOQUE 1: Encabezado Institucional (Filas 1-5) ────────────────

            // Logo (A1:B2)
            sheet.mergeCells('A1:B2');
            const logoPath = path.join(__dirname, '../assets/logo.png');
            workbook.addImage({ filename: logoPath, extension: 'png' });
            sheet.addImage(0, { tl: { col: 1.8, row: 0 }, ext: { width: 100, height: 86.25 } });

            // Título principal — se extiende hasta la última columna dinámica
            sheet.mergeCells(`C1:${lastColLetter}1`);
            const titleCell = sheet.getCell('C1');
            titleCell.value    = 'FORMATO PLAN DE MEJORAMIENTO';
            titleCell.font     = { name: 'Arial', size: 11, bold: true };
            titleCell.alignment = centerAlign;
            titleCell.border   = borderStyle;

            // Tabla de control del documento
            const setControl = (range, label, value) => {
                sheet.mergeCells(range);
                const cell = sheet.getCell(range.split(':')[0]);
                cell.font  = { name: 'Arial', size: 11 };
                cell.value = { richText: [
                    { font: { name: 'Arial', size: 11, bold: true  }, text: `${label}:\n` },
                    { font: { name: 'Arial', size: 11, bold: false }, text: value }
                ]};
                cell.alignment = centerAlign;
                cell.border    = borderStyle;
            };
            setControl('C2:F2', 'CÓDIGO',  'FO-S-AC-01-01');
            setControl('G2:I2', 'VERSIÓN', '7');
            setControl('J2:M2', 'FECHA',   '24-01-2024');
            setControl(`N2:${lastColLetter}2`, 'PÁGINA', '1 de 1');

            // Fila 3: Programa académico
            sheet.mergeCells('A3:B3');
            sheet.getCell('A3').value = 'PROGRAMA ACADÉMICO / DEPENDENCIA';
            sheet.mergeCells(`C3:${lastColLetter}3`);
            sheet.getCell('C3').value = programDoc?.name?.toUpperCase() || '';

            // Fila 4: Responsable (coordinador)
            sheet.mergeCells('A4:B4');
            sheet.getCell('A4').value = 'RESPONSABLE';
            sheet.mergeCells(`C4:${lastColLetter}4`);
            sheet.getCell('C4').value = coordinatorName.toUpperCase();

            // Fila 5: Vigencia del plan de mejoramiento
            sheet.mergeCells('A5:B5');
            sheet.getCell('A5').value = 'VIGENCIA DEL PLAN DE MEJORAMIENTO';
            sheet.mergeCells(`C5:${lastColLetter}5`);
            sheet.getCell('C5').value = plan ? `${plan.startYear} - ${plan.endYear}` : '';

            [3, 4, 5].forEach(r => {
                sheet.getRow(r).eachCell((cell, col) => {
                    cell.border    = borderStyle;
                    cell.font      = col <= 2 ? { name: 'Arial', size: 10, bold: true } : { name: 'Arial', size: 9 };
                    cell.alignment = leftAlign;
                });
            });

            // Relleno de bordes en celdas vacías de filas 3-5
            for (let r = 3; r <= 5; r++) {
                for (let c = C.baseline; c <= totalCols; c++) {
                    sheet.getCell(r, c).border = borderStyle;
                }
            }

            // ── BLOQUE 2: Cabecera de la Tabla de Datos (Filas 6-8) ──────────
            sheet.getRow(6).height = 30;
            sheet.getRow(7).height = 20;
            sheet.getRow(8).height = 25;

            /**
             * setHeader: merge de celdas + asignación de valor en la celda maestra (top-left).
             * Usa referencias numéricas para soportar posicionamiento dinámico.
             */
            const setHeader = (c1, r1, c2, r2, value) => {
                if (c1 !== c2 || r1 !== r2) sheet.mergeCells(r1, c1, r2, c2);
                sheet.getCell(r1, c1).value = value;
            };

            // Columnas de datos fijas (merges row 6-8 o 6-7 según el caso)
            setHeader(C.id,          6, C.id,          8, 'ID');
            setHeader(C.finding,     6, C.factor,      7, 'DEBILIDAD (D), FORTALEZA (F), HALLAZGO (H), NO CONFORMIDAD (NC)');
            setHeader(C.campus,      6, C.campus,      8, 'SEDE');
            setHeader(C.source,      6, C.source,      8, 'FUENTE DE IDENTIFICACIÓN');
            setHeader(C.pdiLine,     6, C.pdiProg,     7, `ARTICULACIÓN PLAN DE DESARROLLO INSTITUCIONAL ${plan ? `${plan.startYear} - ${plan.endYear}` : ''}`);
            setHeader(C.activity,    6, C.activity,    8, 'ACTIVIDADES A REALIZAR');
            setHeader(C.start,       6, C.start,       8, 'FECHA INICIO\n(DD-MM-AAAA)');
            setHeader(C.end,         6, C.end,         8, 'FECHA FIN\n(DD-MM-AAAA)');
            setHeader(C.responsible, 6, C.responsible, 8, 'RESPONSABLE(S)');
            setHeader(C.indicator,   6, C.indicator,   8, 'INDICADOR(ES) DE RESULTADO');
            setHeader(C.baseline,    6, C.baseline,    8, 'LÍNEA BASE');
            setHeader(C.totalGoal,   6, C.totalGoal,   8, 'META TOTAL DEL PLAN');

            // META ANUALIZADA: merge de todas las columnas de años en fila 6
            setHeader(C.firstYear, 6, C.lastYear, 6, 'META ANUALIZADA');

            // Horizontes de plazo en fila 7 (distribución: Corto=2, Mediano=n-4, Largo=2)
            setHeader(C.firstYear,  7, cortoEndCol,   7, 'CORTO PLAZO');
            if (medioStartCol <= medioEndCol) {
                setHeader(medioStartCol, 7, medioEndCol, 7, 'MEDIANO PLAZO');
            }
            setHeader(largoStartCol, 7, C.lastYear, 7, 'LARGO PLAZO');

            // Años reales en fila 8 (2022, 2023... en vez de AÑO 1, AÑO 2)
            planYears.forEach((year, i) => {
                sheet.getCell(8, C.firstYear + i).value = String(year);
            });

            // Sub-headers de fila 8 para columnas compuestas
            sheet.getCell(8, C.finding).value  = 'DESCRIPCIÓN';
            sheet.getCell(8, C.factor).value   = 'FACTOR, CONDICIÓN DE CALIDAD, REQUISITO';
            sheet.getCell(8, C.pdiLine).value  = 'LÍNEA ESTRATÉGICA';
            sheet.getCell(8, C.pdiProg).value  = 'PROGRAMA ESTRATÉGICO';

            // Columnas post-años
            setHeader(C.evidence, 6, C.evidence, 8, 'PRODUCTO O EVIDENCIA');
            setHeader(C.resType,  6, C.resType,  8, 'TIPO DEL RECURSO A EMPLEAR (HUMANO - FINANCIERO - FÍSICO - TECNOLÓGICO)');
            setHeader(C.resDesc,  6, C.resDesc,  8, 'VALOR Y/O DESCRIPCIÓN DEL RECURSO A EMPLEAR');

            // Aplicar estilos uniformes a la cabecera (filas 6-8)
            for (let r = 6; r <= 8; r++) {
                for (let c = 1; c <= totalCols; c++) {
                    const cell = sheet.getCell(r, c);
                    cell.font      = arialFont(8, true);
                    cell.alignment = centerAlign;
                    cell.border    = borderStyle;
                    cell.fill      = headerFill;
                }
            }

            // ── BLOQUE 3: Inserción de Datos con Merge Vertical Dinámico ─────
            let globalIndex = 1;
            let currentRow  = 9;

            activities.forEach(finding => {
                const startRow = currentRow;
                const subCount = finding.subActivities.length;

                finding.subActivities.forEach(sub => {
                    const row = sheet.getRow(currentRow);
                    const totalGoal = sub.annualGoals.reduce((sum, g) => sum + (g.value || 0), 0);

                    // Valores de metas anualizadas mapeados al rango de años del plan
                    const yearValues = planYears.map((_, i) =>
                        sub.annualGoals.find(g => g.yearIndex === i + 1)?.value ?? ''
                    );

                    // row.values es 1-indexed: posición 0 del array → columna 1
                    row.values = [
                        globalIndex,
                        finding.findingDescription,
                        sub.qualityFactor,
                        sub.campus,
                        sub.identificationSource,
                        sub.pdiLine,
                        sub.pdiProgram,
                        sub.description,
                        sub.startDate ? new Date(sub.startDate).toLocaleDateString('es-ES') : '',
                        sub.endDate   ? new Date(sub.endDate).toLocaleDateString('es-ES')   : '',
                        sub.responsibleUnit,
                        sub.indicatorName,
                        sub.baseline ?? '',    // LÍNEA BASE
                        totalGoal || '',       // META TOTAL
                        ...yearValues,         // Años del plan (dinámico)
                        sub.productEvidence,
                        sub.resources.join(' - '),
                        sub.resourceDescription
                    ];

                    row.eachCell(cell => {
                        cell.border    = borderStyle;
                        cell.alignment = centerAlign;
                        cell.font      = arialFont(8);
                    });

                    currentRow++;
                });

                // Merge vertical para campos del hallazgo padre (ID, Descripción, Sede, Fuente)
                if (subCount > 1) {
                    sheet.mergeCells(startRow, C.id,      currentRow - 1, C.id);
                    sheet.mergeCells(startRow, C.finding, currentRow - 1, C.finding);
                    sheet.mergeCells(startRow, C.campus,  currentRow - 1, C.campus);
                    sheet.mergeCells(startRow, C.source,  currentRow - 1, C.source);
                }
                globalIndex++;
            });

            // 4. RESPUESTA
            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            res.setHeader('Content-Disposition', `attachment; filename=Plan_Mejoramiento_${programDoc?.name || 'Reporte'}.xlsx`);

            await workbook.xlsx.write(res);
            res.end();

        } catch (error) { next(error); }
    },

    /**
     * Crea un hallazgo vinculado al plan de mejoramiento especificado (o al plan
     * activo del programa por defecto).
     *
     * Resuelve el programa objetivo (el `admin` puede indicarlo en `req.body`),
     * busca el plan activo si no se envía `improvementPlan`, valida que el plan
     * pertenezca al programa objetivo y crea el documento con `createdBy`
     * igual al identificador del usuario autenticado. Retorna el documento
     * poblado.
     *
     * @route POST /api/activities
     * @access Privado.
     * @param {import('express').Request} req - Petición; `req.body` con los datos del hallazgo y `req.user` para RBAC y auditoría.
     * @param {import('express').Response} res - Respuesta JSON con el hallazgo creado.
     * @param {import('express').NextFunction} next - Delega errores al manejador global.
     * @returns {Promise<void>}
     * @response {201} - `{ success: true, data: Activity }`.
     * @response {400} - No existe plan activo o el plan no pertenece al programa.
     * @response {403} - Usuario sin programa asignado.
     */
    create: async (req, res, next) => {
        try {
            const { program: userProgram, role, _id: userId } = req.user;

            if (!userProgram && role !== 'admin') {
                return res.status(403).json({ success: false, message: 'Debe tener un programa asignado para crear hallazgos.' });
            }

            // Resolución del programa: admin puede crear en cualquier programa vía body
            const targetProgram = role === 'admin'
                ? (req.body.program || userProgram)
                : userProgram;

            let { improvementPlan } = req.body;

            // Auto-resolución: si no se provee plan, se busca el plan activo del programa
            if (!improvementPlan) {
                const activePlan = await ImprovementPlan.findOne({
                    program: targetProgram,
                    isActive: true
                });
                if (!activePlan) {
                    return res.status(400).json({
                        success: false,
                        message: 'No hay un plan de mejoramiento activo para este programa. Active o cree un plan antes de registrar hallazgos.'
                    });
                }
                improvementPlan = activePlan._id;
            }

            // Verificar que el plan pertenece al programa target (previene cross-program injection)
            const planDoc = await ImprovementPlan.findById(improvementPlan);
            if (!planDoc || String(planDoc.program) !== String(targetProgram)) {
                return res.status(400).json({
                    success: false,
                    message: 'El plan de mejoramiento no pertenece al programa indicado.'
                });
            }

            const activityData = {
                ...req.body,
                createdBy: userId,
                program: targetProgram,
                improvementPlan
            };

            const activity = await Activity.create(activityData);
            const populated = await Activity.findById(activity._id)
                .populate('createdBy', 'firstName lastName')
                .populate('responsibleUsers', 'firstName lastName')
                .populate('improvementPlan', 'name startYear endYear isActive');

            res.status(201).json({ success: true, data: populated });
        } catch (error) { next(error); }
    },


    /**
     * Actualiza un hallazgo existente por su identificador.
     *
     * Ejecuta `Activity.findByIdAndUpdate` con `{ new: true, runValidators: true }`
     * y población de `responsibleUsers`.
     *
     * @route PATCH /api/activities/:id
     * @access Privado.
     * @param {import('express').Request} req - Petición; `req.params.id` y `req.body` con los campos a actualizar.
     * @param {import('express').Response} res - Respuesta JSON con el hallazgo actualizado.
     * @param {import('express').NextFunction} next - Delega errores al manejador global.
     * @returns {Promise<void>}
     * @response {200} - `{ success: true, data: Activity }`.
     * @response {404} - Hallazgo no encontrado.
     */
    update: async (req, res, next) => {
        try {
            const activity = await Activity.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true }).populate('responsibleUsers', 'firstName lastName');
            if (!activity) return res.status(404).json({ success: false, message: 'Hallazgo no encontrado' });
            res.json({ success: true, data: activity });
        } catch (error) { next(error); }
    },

    /**
     * Elimina un hallazgo existente por su identificador.
     *
     * Ejecuta `Activity.findByIdAndDelete` sobre `req.params.id`.
     *
     * @route DELETE /api/activities/:id
     * @access Privado (Admin, Coordinator).
     * @param {import('express').Request} req - Petición; `req.params.id`.
     * @param {import('express').Response} res - Respuesta JSON de confirmación.
     * @param {import('express').NextFunction} next - Delega errores al manejador global.
     * @returns {Promise<void>}
     * @response {200} - `{ success: true, message: 'Hallazgo eliminado' }`.
     * @response {404} - Hallazgo no encontrado.
     */
    delete: async (req, res, next) => {
        try {
            const activity = await Activity.findByIdAndDelete(req.params.id);
            if (!activity) return res.status(404).json({ success: false, message: 'Hallazgo no encontrado' });
            res.json({ success: true, message: 'Hallazgo eliminado' });
        } catch (error) { next(error); }
    },

    /**
     * Obtiene sugerencias de autocompletado para campos de subactividades.
     *
     * Valida que `query.field` pertenezca a la lista permitida. Si el campo es
     * `indicatorName`, ejecuta una agregación que devuelve indicadores únicos
     * junto con la plantilla de la subactividad; en caso contrario utiliza
     * `Activity.distinct` con filtro insensible a mayúsculas. Limita el
     * resultado a 10 elementos.
     *
     * @route GET /api/activities/suggestions
     * @access Privado.
     * @param {import('express').Request} req - Petición; `query.field` (campo obligatorio) y `query.query` (texto de búsqueda opcional).
     * @param {import('express').Response} res - Respuesta JSON con las sugerencias.
     * @param {import('express').NextFunction} next - Delega errores al manejador global.
     * @returns {Promise<void>}
     * @response {200} - `{ success: true, data: any[] }`.
     * @response {400} - Campo no permitido.
     */
    getSuggestions: async (req, res, next) => {
        try {
            const { field, query } = req.query;
            const allowedFields = ['responsibleUnit', 'indicatorName', 'productEvidence', 'resourceDescription'];
            if (!allowedFields.includes(field)) return res.status(400).json({ success: false, message: 'Campo no permitido' });
            
            if (field === 'indicatorName') {
                const results = await Activity.aggregate([
                    { $unwind: "$subActivities" },
                    { $match: { "subActivities.indicatorName": { $regex: query || '', $options: 'i' } } },
                    { $group: {
                        _id: "$subActivities.indicatorName",
                        subActivity: { $first: "$subActivities" }
                    }},
                    { $limit: 10 }
                ]);
                const data = results.map(r => ({
                    indicatorName: r._id,
                    template: r.subActivity
                }));
                return res.json({ success: true, data });
            } else {
                const suggestions = await Activity.distinct(`subActivities.${field}`, { [`subActivities.${field}`]: { $regex: query || '', $options: 'i' } });
                res.json({ success: true, data: suggestions.slice(0, 10) });
            }
        } catch (error) { next(error); }
    }
};
