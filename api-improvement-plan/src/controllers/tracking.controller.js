import SubActivityTracking from '../models/SubActivityTracking.js';
import Activity from '../models/Activity.js';
import ImprovementPlan from '../models/ImprovementPlan.js';
import Program from '../models/Program.js';
import ExcelJS from 'exceljs';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { uploadToBucket, deleteFromBucket, buildKey, extractKeyFromUrl } from '../config/s3.client.js';
import log from '../utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const trackingController = {
    /**
     * Obtiene el registro de seguimiento asociado a una subactividad y periodo anual específico.
     *
     * Ejecuta `findOne` en `SubActivityTracking` con `subActivityId` y `year` (convertido a número).
     * Si no existe, inicializa y retorna una entidad virtual vacía con los campos
     * en `null`/cadena vacía para facilitar la renderización del formulario.
     *
     * @route GET /api/tracking/sub-activity/:subActivityId/year/:year
     * @access Privado (autenticación requerida).
     * @param {import('express').Request} req - Petición; `req.params.subActivityId` y `req.params.year`.
     * @param {import('express').Response} res - Respuesta JSON con el registro o la estructura por defecto.
     * @param {import('express').NextFunction} next - Delega errores al manejador global.
     * @returns {Promise<void>}
     * @response {200} - `{ success: true, data: tracking }`.
     */
    getBySubActivityAndYear: async (req, res, next) => {
        try {
            const { subActivityId, year } = req.params;
            
            let tracking = await SubActivityTracking.findOne({ 
                subActivityId, 
                year: Number(year) 
            });

            // Inicialización de la entidad virtual con valores nulos si no existe registro persistido
            if (!tracking) {
                tracking = {
                    subActivityId,
                    year: Number(year),
                    firstSemesterDate: null,
                    secondSemesterDate: null,
                    evidenceDescription: '',
                    evidencePdfUrl: '',
                    firstSemesterAdvance: null,
                    secondSemesterAdvance: null,
                    firstSemesterObservations: '',
                    secondSemesterObservations: ''
                };
            }

            return res.json({ success: true, data: tracking });
        } catch (error) {
            next(error);
        }
    },

    /**
     * Ejecuta una operación de actualización o inserción (upsert) para persistir el estado de seguimiento
     * de una subactividad en un periodo anual determinado.
     *
     * Valida la presencia obligatoria de `activityId`, `subActivityId` y `year`.
     * Recupera el registro previo para, tras guardar, eliminar del bucket S3
     * cualquier evidencia PDF antigua que haya sido reemplazada.
     *
     * @route POST /api/tracking
     * @access Privado.
     * @param {import('express').Request} req - Petición; `req.body` con campos de seguimiento.
     * @param {import('express').Response} res - Respuesta JSON con el registro guardado.
     * @param {import('express').NextFunction} next - Delega errores al manejador global.
     * @returns {Promise<void>}
     * @response {200} - `{ success: true, data: tracking }`.
     * @response {400} - Falta alguno de los campos obligatorios.
     */
    save: async (req, res, next) => {
        try {
            const { 
                activityId,
                subActivityId, 
                year,
                firstSemesterDate,
                secondSemesterDate,
                evidenceDescription,
                evidencePdfUrl,
                firstSemesterAdvance,
                secondSemesterAdvance,
                firstSemesterObservations,
                secondSemesterObservations
            } = req.body;

            if (!activityId || !subActivityId || !year) {
                return res.status(400).json({ 
                    success: false, 
                    message: 'Los campos activityId, subActivityId y year son obligatorios.' 
                });
            }

            const query = { subActivityId, year: Number(year) };
            const previous = await SubActivityTracking.findOne(query);
            const update = {
                activity: activityId,
                firstSemesterDate: firstSemesterDate || null,
                secondSemesterDate: secondSemesterDate || null,
                evidenceDescription: evidenceDescription || '',
                evidencePdfUrl: evidencePdfUrl || '',
                firstSemesterAdvance: firstSemesterAdvance !== undefined && firstSemesterAdvance !== null ? Number(firstSemesterAdvance) : null,
                secondSemesterAdvance: secondSemesterAdvance !== undefined && secondSemesterAdvance !== null ? Number(secondSemesterAdvance) : null,
                firstSemesterObservations: firstSemesterObservations || '',
                secondSemesterObservations: secondSemesterObservations || ''
            };

            const tracking = await SubActivityTracking.findOneAndUpdate(query, update, {
                upsert: true,
                new: true,
                setDefaultsOnInsert: true
            });

            // Al actualizar, elimina en MinIO el objeto que ya no esta referenciado
            const newUrl = tracking.evidencePdfUrl;
            const oldUrl = previous?.evidencePdfUrl;
            if (oldUrl && oldUrl !== newUrl) {
                const oldKey = extractKeyFromUrl(oldUrl);
                if (oldKey) {
                    deleteFromBucket(oldKey).catch(err => log('S3', `No se pudo eliminar objeto antiguo: ${err.message}`, 'warn'));
                }
            }

            return res.json({ success: true, data: tracking });
        } catch (error) {
            next(error);
        }
    },

    /**
     * Elimina físicamente el objeto de soporte (PDF) alojado en MinIO.
     * La referencia en Mongo se limpia al persistir el seguimiento.
     *
     * @route DELETE /api/tracking/evidence
     * @access Privado.
     * @param {import('express').Request} req - Petición; `req.body.url` con la URL del PDF a eliminar.
     * @param {import('express').Response} res - Respuesta JSON de confirmación.
     * @param {import('express').NextFunction} next - Delega errores al manejador global.
     * @returns {Promise<void>}
     * @response {200} - `{ success: true, message: 'Documento eliminado.' }`.
     * @response {400} - URL de evidencia no válida.
     */
    deletePdf: async (req, res, next) => {
        try {
            const { url } = req.body;
            const key = extractKeyFromUrl(url || '');
            if (!key) {
                return res.status(400).json({ success: false, message: 'URL de evidencia no válida.' });
            }
            await deleteFromBucket(key);
            return res.json({ success: true, message: 'Documento eliminado.' });
        } catch (error) {
            next(error);
        }
    },

    /**
     * Procesa la carga de documentos de soporte en formato PDF.
     *
     * Sube el archivo recibido (almacenado en memoria por `multer`) a MinIO
     * generando una clave segura con UUID y la extensión original; retorna la
     * URL pública del objeto para su posterior persistencia en Mongo.
     *
     * @route POST /api/tracking/upload-pdf
     * @access Privado.
     * @param {import('express').Request} req - Petición con `req.file` (buffer, `originalname`, `mimetype`).
     * @param {import('express').Response} res - Respuesta JSON con la URL pública.
     * @param {import('express').NextFunction} next - Delega errores al manejador global.
     * @returns {Promise<void>}
     * @response {200} - `{ success: true, data: { url } }`.
     * @response {400} - No se ha subido ningún archivo.
     */
    uploadPdf: async (req, res, next) => {
        try {
            if (!req.file) {
                return res.status(400).json({ success: false, message: 'No se ha subido ningún archivo.' });
            }
            const file = req.file;
            // Genera el nombre seguro de archivo respetando la extension original
            const safeName = Buffer.from(file.originalname, 'latin1').toString('utf8').replace(/[^a-zA-Z0-9._-]/g, '_');
            const key = buildKey('reports', 'pdfs', safeName);
            const url = await uploadToBucket({
                key,
                body: file.buffer,
                contentType: file.mimetype || 'application/pdf'
            });
            return res.json({ success: true, data: { url } });
        } catch (error) {
            next(error);
        }
    },

    /**
     * Genera y exporta en formato binario de hoja de cálculo (Excel XLSX) la Matriz de Seguimiento
     * institucional consolidada para toda la vigencia del plan de mejoramiento, de acuerdo al estándar FO-S-AC-08-02.
     *
     * Aplica reglas de autorización basadas en roles (RBAC), filtra por plan y años
     * solicitados, consolida el seguimiento por subactividad/año y envía el libro
     * como flujo binario con cabeceras MIME.
     *
     * @route GET /api/tracking/export
     * @access Privado.
     * @param {import('express').Request} req - Petición; query `planId`, `programId`, `years`; `req.user` para RBAC.
     * @param {import('express').Response} res - Respuesta con `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`.
     * @param {import('express').NextFunction} next - Delega errores al manejador global.
     * @returns {Promise<void>}
     * @response {200} - Archivo XLSX en el cuerpo de la respuesta.
     * @response {403} - Sin programa asignado o plan fuera de alcance.
     * @response {404} - Plan o datos para exportar no encontrados.
     */
    exportTracking: async (req, res, next) => {
        try {
            const { program: userProgramId, role } = req.user;
            const { planId, programId: queryProgramId, years } = req.query;

            const targetProgram = role === 'admin' 
                ? (queryProgramId || userProgramId) 
                : userProgramId;

            if (!targetProgram && !planId && role !== 'admin') {
                return res.status(403).json({ success: false, message: 'Debe tener un programa asignado para exportar.' });
            }

            // Fase 1: Resolución del plan de mejoramiento aplicable y su alcance programático
            let plan = null;
            let activityFilter = {};

            if (role === 'teacher') {
                plan = await ImprovementPlan.findOne({ program: targetProgram, isActive: true }).populate('program');
                if (!plan) return res.status(404).json({ success: false, message: 'Plan activo no encontrado para este programa.' });
                activityFilter.improvementPlan = plan._id;
                activityFilter.program = targetProgram;
            } else {
                if (planId) {
                    plan = await ImprovementPlan.findById(planId).populate('program');
                    if (!plan) return res.status(404).json({ success: false, message: 'Plan no encontrado.' });
                    if (role === 'coordinator' && String(plan.program?._id || plan.program) !== String(targetProgram)) {
                        return res.status(403).json({ success: false, message: 'Acceso denegado: el plan no pertenece a su programa.' });
                    }
                    activityFilter.improvementPlan = planId;
                } else {
                    plan = await ImprovementPlan.findOne({ program: targetProgram, isActive: true }).populate('program');
                    if (!plan) return res.status(404).json({ success: false, message: 'Plan activo no encontrado para este programa.' });
                    activityFilter.improvementPlan = plan._id;
                    activityFilter.program = targetProgram;
                }
            }

            const programDoc = plan.program;
            const programName = programDoc?.name || 'PROGRAMA NO ESPECIFICADO';
            
            // Recuperar el listado de actividades/hallazgos vinculados al plan de mejoramiento
            const activities = await Activity.find(activityFilter).sort({ createdAt: 1 });

            if (!activities || activities.length === 0) {
                return res.status(404).json({ success: false, message: 'No hay datos para exportar.' });
            }

            // Extraer identificadores y consultar registros de seguimiento histórico en lote (Batch Query)
            const activityIds = activities.map(a => a._id);
            const trackings = await SubActivityTracking.find({
                activity: { $in: activityIds }
            });

            // Proyección del espectro temporal (rango de años de vigencia)
            let planYears = Array.from({ length: plan.endYear - plan.startYear + 1 }, (_, i) => plan.startYear + i);
            if (years) {
                const requestedYears = years.split(',').map(y => parseInt(y, 10)).filter(y => !isNaN(y));
                if (requestedYears.length > 0) {
                    planYears = planYears.filter(y => requestedYears.includes(y));
                }
            }

            // Fase 2: Instanciación e inicialización de la estructura del libro y hoja de cálculo
            const workbook = new ExcelJS.Workbook();
            const sheet = workbook.addWorksheet('Matriz de Seguimiento');
            sheet.pageSetup = {
                printTitlesRow: '1:6',
                orientation: 'landscape',
                fitToPage: true,
                fitToWidth: 1,
                fitToHeight: 0
            };

            sheet.columns = [
                { key: 'id',          width: 7  },  // A
                { key: 'description', width: 30.13 },  // B
                { key: 'campus',      width: 15.13 },  // C
                { key: 'action',      width: 33.88 },  // D
                { key: 'indicator',   width: 29.25 },  // E
                { key: 'baseline',    width: 11  },  // F
                { key: 'totalGoal',   width: 11.5 },  // G
                { key: 'vigenciaGoal',width: 9.88 },  // H
                { key: 'date1',       width: 13 },  // I
                { key: 'date2',       width: 13 },  // J
                { key: 'evidence',    width: 30.13 },  // K
                { key: 'advance1',    width: 17 },  // L
                { key: 'advance2',    width: 17 },  // M
                { key: 'status',      width: 15.13 },  // N
                { key: 'obs1',        width: 30.13 },  // O
                { key: 'obs2',        width: 30.13 }   // P
            ];

            const totalCols = 16;

            const borderStyle = {
                top:    { style: 'thin', color: { argb: 'FF000000' } },
                left:   { style: 'thin', color: { argb: 'FF000000' } },
                bottom: { style: 'thin', color: { argb: 'FF000000' } },
                right:  { style: 'thin', color: { argb: 'FF000000' } }
            };
            const centerAlign = { vertical: 'middle', horizontal: 'center', wrapText: true };
            const leftAlign   = { vertical: 'middle', horizontal: 'left', wrapText: true };
            const arialFont   = (size = 8, bold = false) => ({ name: 'Arial', size, bold });
            const headerFill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF92D050' } }; // Verde institucional

            [1, 2, 3].forEach(r => { sheet.getRow(r).height = 30; });

            // Integración de recurso gráfico de identidad institucional (A1:B2)
            sheet.mergeCells('A1:B2');
            const logoPath = path.join(__dirname, '../assets/logo.png');
            if (fs.existsSync(logoPath)) {
                workbook.addImage({ filename: logoPath, extension: 'png' });
                sheet.addImage(0, { tl: { col: 1.8, row: 0 }, ext: { width: 100, height: 86.25 } });
            }

            // Encabezado principal del reporte FO-S-AC-08-02
            sheet.mergeCells('C1:P1');
            const titleCell = sheet.getCell('C1');
            titleCell.value = 'FORMATO MATRIZ DE SEGUIMIENTO A LOS PLANES DE MEJORAMIENTO DE LOS PROGRAMAS ACADÉMICOS';
            titleCell.font = { name: 'Arial', size: 11, bold: true };
            titleCell.alignment = centerAlign;
            titleCell.border = borderStyle;

            const setControl = (range, label, value) => {
                sheet.mergeCells(range);
                const cell = sheet.getCell(range.split(':')[0]);
                cell.value = { richText: [
                    { font: { name: 'Arial', size: 8, bold: true }, text: `${label}:\n` },
                    { font: { name: 'Arial', size: 8, bold: false }, text: value }
                ]};
                cell.alignment = centerAlign;
                cell.border = borderStyle;
            };
            
            setControl('C2:H2', 'CÓDIGO', 'FO-S-AC-08-02');
            setControl('I2:K2', 'VERSIÓN', '3');
            setControl('L2:N2', 'FECHA', '24-02-2025');
            setControl('O2:P2', 'PÁGINA', '1 de 1');

            sheet.mergeCells('A3:B3');
            sheet.getCell('A3').value = 'PROGRAMA ACADÉMICO:';
            sheet.getCell('A3').font = { name: 'Arial', size: 11, bold: true };
            sheet.getCell('A3').alignment = leftAlign;
            sheet.getCell('A3').border = borderStyle;

            sheet.mergeCells('C3:P3');
            sheet.getCell('C3').value = programName.toUpperCase();
            sheet.getCell('C3').font = { name: 'Arial', size: 9, bold: true };
            sheet.getCell('C3').alignment = leftAlign;
            sheet.getCell('C3').border = borderStyle;

            for (let c = 1; c <= totalCols; c++) {
                sheet.getCell(1, c).border = borderStyle;
                sheet.getCell(2, c).border = borderStyle;
                sheet.getCell(3, c).border = borderStyle;
            }

            sheet.getRow(4).height = 25;
            sheet.getRow(5).height = 20;
            sheet.getRow(6).height = 25;

            const setHeader = (c1, r1, c2, r2, value) => {
                if (c1 !== c2 || r1 !== r2) sheet.mergeCells(r1, c1, r2, c2);
                const cell = sheet.getCell(r1, c1);
                cell.value = value;
                cell.font = arialFont(7.5, true);
                cell.alignment = centerAlign;
                cell.border = borderStyle;
                cell.fill = headerFill;
            };

            setHeader(1, 4, 2, 4, 'OPORTUNIDAD DE MEJORA');
            setHeader(1, 5, 1, 6, 'ID');
            setHeader(2, 5, 2, 6, 'DESCRIPCIÓN');
            setHeader(3, 4, 3, 6, 'SEDE');
            setHeader(4, 4, 4, 6, 'ACTIVIDAD / ACCIÓN');
            setHeader(5, 4, 5, 6, 'INDICADOR');
            setHeader(6, 4, 6, 6, 'LÍNEA BASE');
            setHeader(7, 4, 7, 6, 'META TOTAL DEL PLAN');
            setHeader(8, 4, 8, 6, 'META PARA LA VIGENCIA');

            setHeader(9, 4, 10, 4, 'FECHA DE SEGUIMIENTO\n(dd-mm-aaaa)');
            setHeader(9, 5, 9, 6, 'PRIMER\nSEMESTRE');
            setHeader(10, 5, 10, 6, 'SEGUNDO\nSEMESTRE');

            setHeader(11, 4, 11, 6, 'PRODUCTO O MEDIO DE VERIFICACIÓN');

            setHeader(12, 4, 14, 4, 'EVALUACIÓN DE METAS');
            setHeader(12, 5, 13, 5, 'SEGUIMIENTO AL CUMPLIMIENTO DE LAS METAS (%)');
            setHeader(12, 6, 12, 6, 'PRIMER SEMESTRE\nAVANCE');
            setHeader(13, 6, 13, 6, 'SEGUNDO SEMESTRE\nAVANCE');
            setHeader(14, 5, 14, 6, 'ESTADO DE LA\nOPORTUNIDAD DE\nMEJORA (%)');

            setHeader(15, 4, 15, 6, 'OBSERVACIONES AL SEGUIMIENTO\nPRIMER SEMESTRE');
            setHeader(16, 4, 16, 6, 'OBSERVACIONES AL SEGUIMIENTO\nSEGUNDO SEMESTRE');

            for (let r = 4; r <= 6; r++) {
                for (let c = 1; c <= totalCols; c++) {
                    const cell = sheet.getCell(r, c);
                    cell.border = borderStyle;
                    cell.fill = headerFill;
                    cell.font = arialFont(7.5, true);
                    cell.alignment = centerAlign;
                }
            }

            // Procesamiento e inyección iterativa del conjunto de datos estructurados (Data Binding)
            let globalIndex = 1;
            let currentRow = 7;

            for (const finding of activities) {
                for (const sub of finding.subActivities) {
                    for (const year of planYears) {
                        const row = sheet.getRow(currentRow);
                        row.height = 35;

                        const yearIndex = year - plan.startYear + 1;
                        const goal = sub.annualGoals.find(g => g.yearIndex === yearIndex);
                        const goalValue = goal?.value ?? null;

                        // Solo generar fila si existe una meta a cumplir en el año
                        if (goalValue === null || goalValue <= 0) {
                            continue;
                        }

                        const track = trackings.find(t => String(t.subActivityId) === String(sub._id) && t.year === year);

                        let pct1 = '';
                        let pct2 = '';
                        let finalPct = '';
                        let isNA = true;

                        if (goalValue !== null && goalValue > 0) {
                            isNA = false;
                            if (track) {
                                if (track.firstSemesterAdvance !== null) {
                                    pct1 = `${((track.firstSemesterAdvance / goalValue) * 100).toFixed(1)}%`;
                                }
                                if (track.secondSemesterAdvance !== null) {
                                    pct2 = `${((track.secondSemesterAdvance / goalValue) * 100).toFixed(1)}%`;
                                }
                                
                                if (track.firstSemesterAdvance !== null || track.secondSemesterAdvance !== null) {
                                    const totalAchieved = (track.firstSemesterAdvance || 0) + (track.secondSemesterAdvance || 0);
                                    finalPct = `${((totalAchieved / goalValue) * 100).toFixed(1)}%`;
                                } else {
                                    finalPct = '0.0%';
                                }
                            } else {
                                finalPct = '0.0%';
                            }
                        }

                        row.getCell(1).value = globalIndex;
                        row.getCell(2).value = finding.findingDescription;
                        row.getCell(3).value = sub.campus || 'Sede Principal';
                        row.getCell(4).value = sub.description;
                        row.getCell(5).value = sub.indicatorName;
                        row.getCell(6).value = sub.baseline ?? '-';
                        row.getCell(7).value = goalValue !== null ? goalValue : ''; // Cuantificación de la meta anualizada
                        row.getCell(8).value = year; // Periodo anual de vigencia evaluado
                        
                        row.getCell(9).value = track?.firstSemesterDate ? new Date(track.firstSemesterDate).toLocaleDateString('es-ES') : '';
                        row.getCell(10).value = track?.secondSemesterDate ? new Date(track.secondSemesterDate).toLocaleDateString('es-ES') : '';
                        
                        // Extracción y parseo semántico de la evidencia física para identificar hipervínculos externos
                        let evidenceText = track?.evidenceDescription || '';
                        const parts = [];

                        const urlRegex = /(https?:\/\/[^\s]+)/g;
                        let lastIndex = 0;
                        let match;

                        while ((match = urlRegex.exec(evidenceText)) !== null) {
                            const plainSegment = evidenceText.substring(lastIndex, match.index);
                            if (plainSegment) {
                                parts.push({
                                    text: plainSegment,
                                    font: { name: 'Arial', size: 7.5, color: { argb: 'FF000000' } }
                                });
                            }
                            parts.push({
                                text: match[0],
                                font: { name: 'Arial', size: 7.5, color: { argb: 'FF0056B3' }, underline: true }
                            });
                            lastIndex = urlRegex.lastIndex;
                        }

                        const remaining = evidenceText.substring(lastIndex);
                        if (remaining) {
                            parts.push({
                                text: remaining,
                                font: { name: 'Arial', size: 7.5, color: { argb: 'FF000000' } }
                            });
                        }

                        if (track?.evidencePdfUrl) {
                            // La URL almacenada ya es publica (MinIO); solo se resuelve el legacy relativo
                            const relative = !/^https?:\/\//.test(track.evidencePdfUrl);
                            const fullPdfUrl = relative
                                ? `${req.protocol}://${req.get('host')}${track.evidencePdfUrl}`
                                : track.evidencePdfUrl;
                            
                            parts.push({
                                text: '\n\nDocumento Soporte:\n',
                                font: { name: 'Arial', size: 7.5, color: { argb: 'FF000000' } }
                            });
                            parts.push({
                                text: fullPdfUrl,
                                font: { name: 'Arial', size: 7.5, color: { argb: 'FF0056B3' }, underline: true }
                            });
                        }

                        const evidenceCell = row.getCell(11);
                        if (parts.length > 0) {
                            evidenceCell.value = { richText: parts };
                        } else {
                            evidenceCell.value = '';
                        }
                        
                        row.getCell(12).value = isNA ? 'N/A' : pct1;
                        row.getCell(13).value = isNA ? 'N/A' : pct2;
                        row.getCell(14).value = isNA ? 'N/A' : finalPct;
                        
                        row.getCell(15).value = track?.firstSemesterObservations || '';
                        row.getCell(16).value = track?.secondSemesterObservations || '';

                        row.eachCell((cell, colNum) => {
                            cell.border = borderStyle;
                            if (colNum !== 11) {
                                cell.font = arialFont(7.5);
                            }
                            cell.alignment = colNum === 2 || colNum === 4 || colNum === 5 || colNum === 11 || colNum === 15 || colNum === 16
                                ? leftAlign
                                : centerAlign;
                        });

                        const statusCell = row.getCell(14);
                        if (isNA) {
                            statusCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF2F2F2' } };
                            statusCell.font = { name: 'Arial', size: 7.5, color: { argb: 'FF7F7F7F' } };
                        } else {
                            const numericVal = parseFloat(finalPct);
                            if (isNaN(numericVal)) {
                                statusCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFF0000' } };
                                statusCell.font = { name: 'Arial', size: 7.5, color: { argb: 'FF000000' }, bold: true };
                            } else if (numericVal <= 40.0) {
                                statusCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFF0000' } };
                                statusCell.font = { name: 'Arial', size: 7.5, color: { argb: 'FF000000' }, bold: true };
                            } else if (numericVal <= 60.0) {
                                statusCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFC000' } };
                                statusCell.font = { name: 'Arial', size: 7.5, color: { argb: 'FF000000' }, bold: true };
                            } else {
                                statusCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF92D050' } };
                                statusCell.font = { name: 'Arial', size: 7.5, color: { argb: 'FF000000' }, bold: true };
                            }
                        }

                        if (globalIndex % 20 === 0) {
                            row.addPageBreak();
                        }
                        currentRow++;
                        globalIndex++;
                    }
                }
            }

            // Renderización de acotaciones informativas e instructivos al pie de la hoja (Conformidad Normativa)
            currentRow += 2;
            const infoStartRow = currentRow;

            const addInfoNote = (label, text) => {
                sheet.mergeCells(`A${currentRow}:J${currentRow}`);
                const cell = sheet.getCell(`A${currentRow}`);
                cell.value = { richText: [
                    { font: { name: 'Arial', size: 7.5, bold: true }, text: `${label}: ` },
                    { font: { name: 'Arial', size: 7.5, italic: true }, text: text }
                ]};
                cell.alignment = leftAlign;
                currentRow++;
            };

            addInfoNote('Fecha de seguimiento', 'Diligenciada por la Oficina Asesora de de Aseguramiento de la Calidad');
            addInfoNote('Producto o Medio de Verificación', 'Reportes de las actividades desarrolladas');
            addInfoNote('Seguimiento al Cumplimiento de las Metas (%)', 'Porcentaje de avance en la ejecución de la meta propuesta para la vigencia');
            addInfoNote('Estado de la Oportunidad de Mejora (%)', 'Porcentaje de avance de la meta acumulada, respecto del cumplimiento de la meta de la vigencia');
            addInfoNote('Observaciones al Seguimiento', 'Espacio para comentar las dificultades o aspectos relevantes en la ejecución de la meta propuesta');

            let convRow = infoStartRow;
            
            sheet.mergeCells(`L${convRow}:N${convRow}`);
            const convHeader = sheet.getCell(`L${convRow}`);
            convHeader.value = 'CONVENCIONES';
            convHeader.font = { name: 'Arial', size: 8, bold: true };
            convHeader.alignment = centerAlign;
            convHeader.border = borderStyle;
            convHeader.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE6E6E6' } };

            const addConventionRow = (pctRange, label, fillHex, fontColorHex) => {
                convRow++;
                sheet.mergeCells(`L${convRow}:M${convRow}`);
                const cellRange = sheet.getCell(`L${convRow}`);
                cellRange.value = pctRange;
                cellRange.font = arialFont(7.5);
                cellRange.alignment = centerAlign;
                cellRange.border = borderStyle;

                const cellLabel = sheet.getCell(`N${convRow}`);
                cellLabel.value = label;
                cellLabel.font = { name: 'Arial', size: 7.5, bold: true, color: { argb: fontColorHex } };
                cellLabel.alignment = centerAlign;
                cellLabel.border = borderStyle;
                cellLabel.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: fillHex } };
            };

            addConventionRow('0% - 40%',   'Bajo (B)',  'FFFF0000', 'FFFFFFFF');
            addConventionRow('41% - 60%',  'Medio (M)', 'FFFFC000', 'FF000000');
            addConventionRow('61% - 100%', 'Alto (A)',  'FF92D050', 'FF000000');
            addConventionRow('N/A',        'No inicia', 'FFF2F2F2', 'FF7F7F7F');

            // Transmisión del flujo binario resultante (Stream) al cliente HTTP con cabeceras MIME correspondientes
            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            res.setHeader('Content-Disposition', `attachment; filename=Matriz_Seguimiento_${plan.name.replace(/\s+/g, '_')}.xlsx`);

            await workbook.xlsx.write(res);
            res.end();

        } catch (error) {
            next(error);
        }
    }
};
