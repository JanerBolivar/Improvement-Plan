import Campus from '../models/Campus.js';
import IdSource from '../models/IdSource.js';
import FactorInst from '../models/FactorInst.js';
import FactorProg from '../models/FactorProg.js';
import QualityInst from '../models/QualityInst.js';
import QualityProg from '../models/QualityProg.js';
import PDILine from '../models/PDILine.js';
import PDIProgram from '../models/PDIProgram.js';
import PDIObjective from '../models/PDIObjective.js';
import log from '../utils/logger.js';

/**
 * Endpoint de inicialización masiva del sistema.
 *
 * Borra todos los registros de las tablas maestras (catálogos y PDI) y los
 * repuebla con los datos recibidos en `req.body`. Soporta estructuras
 * flexibles: cuando un ítem es una cadena, la convierte a `{ name: item }`; si
 * es un objeto sin `name`, intenta inferirlo. Para el PDI reconstruye la
 * jerarquía `PDILine` → `PDIProgram` → `PDIObjective`.
 *
 * @route POST /api/admin/setup-system
 * @access Privado (Admin).
 * @param {import('express').Request} req - Petición con el payload de inicialización.
 * @param {import('express').Response} res - Respuesta JSON de éxito.
 * @param {import('express').NextFunction} next - Delega errores al manejador global.
 * @returns {Promise<void>}
 * @response {200} - `{ success: true, message: 'Sistema inicializado correctamente' }`.
 */
export const setupSystem = async (req, res, next) => {
    try {
        const {
            campuses,
            idSources,
            institutionalFactors,
            programFactors,
            institutionalQuality,
            programQuality,
            pdi
        } = req.body;

        log('ADMIN', 'Iniciando limpieza de tablas maestras para carga masiva...');

        await Promise.all([
            Campus.deleteMany({}),
            IdSource.deleteMany({}),
            FactorInst.deleteMany({}),
            FactorProg.deleteMany({}),
            QualityInst.deleteMany({}),
            QualityProg.deleteMany({}),
            PDILine.deleteMany({}),
            PDIProgram.deleteMany({}),
            PDIObjective.deleteMany({})
        ]);

        log('ADMIN', 'Tablas limpias. Procesando datos...');

        // Mapeo flexible para soportar strings o objetos con typos en las llaves
        const mapToObj = (arr) => arr?.map(item => {
            if (typeof item === 'string') return { name: item };

            // Si es un objeto y no tiene 'name', intentamos buscar una llave que parezca el contenido
            if (typeof item === 'object' && !item.name) {
                const possibleNameKey = Object.keys(item).find(k => k !== 'code' && typeof item[k] === 'string');
                if (possibleNameKey) {
                    return { ...item, name: item[possibleNameKey] };
                }
            }
            return item;
        }) || [];

        if (campuses) await Campus.insertMany(mapToObj(campuses));
        if (idSources) await IdSource.insertMany(mapToObj(idSources));
        if (institutionalFactors) await FactorInst.insertMany(mapToObj(institutionalFactors));
        if (programFactors) await FactorProg.insertMany(mapToObj(programFactors));
        if (institutionalQuality) await QualityInst.insertMany(mapToObj(institutionalQuality));
        if (programQuality) await QualityProg.insertMany(mapToObj(programQuality));

        // 3. Inserción Jerárquica PDI
        if (pdi && Array.isArray(pdi)) {
            for (const lineData of pdi) {
                const line = await PDILine.create({
                    code: lineData.code,
                    name: lineData.name,
                    description: lineData.description
                });

                if (lineData.programs && Array.isArray(lineData.programs)) {
                    for (const progData of lineData.programs) {
                        const program = await PDIProgram.create({
                            line: line._id,
                            code: progData.code,
                            name: progData.name,
                            description: progData.description
                        });

                        if (progData.objectives && Array.isArray(progData.objectives)) {
                            const objectives = progData.objectives.map(obj => ({
                                program: program._id,
                                code: obj.code,
                                name: obj.name,
                                description: obj.description
                            }));
                            await PDIObjective.insertMany(objectives);
                        }
                    }
                }
            }
        }

        log('ADMIN', '✅ Carga masiva completada con éxito.');
        res.json({ success: true, message: 'Sistema inicializado correctamente' });

    } catch (error) {
        log('ADMIN', `❌ Error en carga masiva: ${error.message}`, 'error');
        next(error);
    }
};
