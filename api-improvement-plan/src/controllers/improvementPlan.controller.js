import ImprovementPlan from '../models/ImprovementPlan.js';
import Activity from '../models/Activity.js';

/**
 * Controlador CRUD para ImprovementPlan.
 *
 * Aplica RBAC en cada handler:
 *   - `admin`   → acceso irrestricto a todos los programas.
 *   - `coordinator` → alcance limitado a `req.user.program`.
 *
 * El patrón de manejo de errores consiste en delegar a `next(error)` para que
 * el `errorHandler` global unifique las respuestas HTTP.
 *
 * @namespace improvementPlanController
 */
export const improvementPlanController = {

    /**
     * Obtiene el catálogo de planes según el alcance del actor autenticado.
     *
     * - `admin`: obtiene todos; acepta `query.programId` para filtrar por programa.
     * - `coordinator`: filtra por su programa (`req.user.program`); si no tiene programa, retorna lista vacía.
     * - `teacher`: retorna únicamente el plan activo de su programa (solo lectura).
     *
     * @route GET /api/plans
     * @access Privado.
     * @param {import('express').Request} req - Petición; `req.user.role`, `req.user.program`; query `programId`.
     * @param {import('express').Response} res - Respuesta JSON con lista de planes.
     * @param {import('express').NextFunction} next - Delega errores al manejador global.
     * @returns {Promise<void>}
     * @response {200} - `{ success: true, data: ImprovementPlan[] }`.
     */
    getAll: async (req, res, next) => {
        try {
            const { role, program } = req.user;
            const { programId } = req.query;

            let filter = {};

            if (role === 'admin') {
                // Admin puede filtrar por programa vía query param o recuperar todos
                if (programId) filter.program = programId;
            } else if (role === 'coordinator') {
                // Scope forzado al programa propio del coordinador
                if (!program) {
                    return res.json({ success: true, data: [], message: 'Sin programa asignado.' });
                }
                filter.program = program;
            } else {
                // Teacher: retorna solo el plan activo de su programa para consumo read-only
                filter.program = program;
                filter.isActive = true;
            }

            const plans = await ImprovementPlan.find(filter)
                .populate('program', 'name code faculty')
                .populate('createdBy', 'firstName lastName email')
                .sort({ isActive: -1, startYear: -1 });

            res.json({ success: true, data: plans });
        } catch (error) { next(error); }
    },

    /**
     * Obtiene los planes de un programa específico.
     *
     * Valida que un `coordinator` solo consulte su propio programa. Retorna
     * la lista ordenada por `isActive` descendente y `startYear` descendente.
     *
     * @route GET /api/plans/by-program/:programId
     * @access Privado.
     * @param {import('express').Request} req - Petición; `req.params.programId`; `req.user.role`, `req.user.program`.
     * @param {import('express').Response} res - Respuesta JSON con planes del programa.
     * @param {import('express').NextFunction} next - Delega errores al manejador global.
     * @returns {Promise<void>}
     * @response {200} - `{ success: true, data: ImprovementPlan[] }`.
     * @response {403} - El coordinador intenta acceder a otro programa.
     */
    getByProgram: async (req, res, next) => {
        try {
            const { programId } = req.params;
            const { role, program } = req.user;

            // Coordinadores solo pueden consultar su propio programa
            if (role === 'coordinator' && String(program) !== String(programId)) {
                return res.status(403).json({
                    success: false,
                    message: 'Acceso denegado: no tiene permisos sobre este programa.'
                });
            }

            const plans = await ImprovementPlan.find({ program: programId })
                .populate('program', 'name code')
                .sort({ isActive: -1, startYear: -1 });

            res.json({ success: true, data: plans });
        } catch (error) { next(error); }
    },

    /**
     * Obtiene el plan activo de un programa.
     *
     * @route GET /api/plans/active/:programId
     * @access Privado.
     * @param {import('express').Request} req - Petición; `req.params.programId`.
     * @param {import('express').Response} res - Respuesta JSON con el plan activo o `null` si no existe.
     * @param {import('express').NextFunction} next - Delega errores al manejador global.
     * @returns {Promise<void>}
     * @response {200} - `{ success: true, data: ImprovementPlan|null, message?: string }`.
     */
    getActivePlan: async (req, res, next) => {
        try {
            const { programId } = req.params;
            const plan = await ImprovementPlan.findOne({ program: programId, isActive: true })
                .populate('program', 'name code');

            if (!plan) {
                return res.json({ success: true, data: null, message: 'No hay plan activo para este programa.' });
            }
            res.json({ success: true, data: plan });
        } catch (error) { next(error); }
    },

    /**
     * Crea un nuevo plan de mejoramiento.
     *
     * Determina el programa objetivo según el rol (`admin` usa `programId` del body,
     * `coordinator` usa su propio programa). Si `isActive` es `true`, desactiva
     * todos los planes activos previos del mismo programa antes de crear el nuevo.
     * El nuevo plan se crea con `status` `'active'` o `'draft'` según corresponda.
     *
     * @route POST /api/plans
     * @access Privado (Admin, Coordinator).
     * @param {import('express').Request} req - Petición; `req.user` y `req.body`.
     * @param {import('express').Response} res - Respuesta JSON 201 con el plan creado y poblado.
     * @param {import('express').NextFunction} next - Delega errores al manejador global.
     * @returns {Promise<void>}
     * @response {201} - `{ success: true, data: ImprovementPlan }`.
     * @response {400} - Falta programa para crear el plan.
     * @response {403} - Coordinador intenta crear plan en otro programa.
     */
    create: async (req, res, next) => {
        try {
            const { role, program, _id: userId } = req.user;
            const { name, startYear, endYear, description, isActive, programId, horizons } = req.body;

            // Resolución del programa target según el rol del actor
            const targetProgram = role === 'admin' ? programId : String(program);

            if (!targetProgram) {
                return res.status(400).json({
                    success: false,
                    message: 'Se requiere un programa para crear el plan.'
                });
            }

            // Coordinador solo puede operar sobre su propio programa
            if (role === 'coordinator' && String(program) !== String(targetProgram)) {
                return res.status(403).json({
                    success: false,
                    message: 'No tiene permisos para crear planes en otro programa.'
                });
            }

            // Si el plan se crea como activo, se desactivan los anteriores del mismo programa
            if (isActive) {
                await ImprovementPlan.updateMany(
                    { program: targetProgram, isActive: true },
                    { $set: { isActive: false, status: 'closed' } }
                );
            }

            const plan = await ImprovementPlan.create({
                name,
                program: targetProgram,
                startYear,
                endYear,
                description,
                isActive: isActive || false,
                status: isActive ? 'active' : 'draft',
                createdBy: userId,
                horizons
            });

            const populated = await ImprovementPlan.findById(plan._id)
                .populate('program', 'name code faculty')
                .populate('createdBy', 'firstName lastName');

            res.status(201).json({ success: true, data: populated });
        } catch (error) { next(error); }
    },

    /**
     * Actualiza los metadatos del plan (nombre, vigencia, descripción y horizontes).
     * La activación se gestiona mediante `PATCH /:id/activate`.
     *
     * @route PUT /api/plans/:id
     * @access Privado (Admin, Coordinator).
     * @param {import('express').Request} req - Petición; `req.params.id`, `req.body`, `req.user`.
     * @param {import('express').Response} res - Respuesta JSON con el plan actualizado.
     * @param {import('express').NextFunction} next - Delega errores al manejador global.
     * @returns {Promise<void>}
     * @response {200} - `{ success: true, data: ImprovementPlan }`.
     * @response {403} - Coordinador intenta editar plan de otro programa.
     * @response {404} - Plan no encontrado.
     */
    update: async (req, res, next) => {
        try {
            const { role, program } = req.user;
            const plan = await ImprovementPlan.findById(req.params.id);

            if (!plan) {
                return res.status(404).json({ success: false, message: 'Plan no encontrado.' });
            }

            // RBAC: coordinador no puede editar planes de otros programas
            if (role === 'coordinator' && String(plan.program) !== String(program)) {
                return res.status(403).json({
                    success: false,
                    message: 'No tiene permisos para editar este plan.'
                });
            }

            const { name, startYear, endYear, description, horizons } = req.body;
            const updated = await ImprovementPlan.findByIdAndUpdate(
                req.params.id,
                { $set: { name, startYear, endYear, description, horizons } },
                { new: true, runValidators: true }
            ).populate('program', 'name code faculty');

            res.json({ success: true, data: updated });
        } catch (error) { next(error); }
    },

    /**
     * Activa un plan y desactiva el plan activo previo del mismo programa.
     * Garantiza la invariante: exactamente un plan activo por programa.
     *
     * @route PATCH /api/plans/:id/activate
     * @access Privado (Admin, Coordinator).
     * @param {import('express').Request} req - Petición; `req.params.id`, `req.user`.
     * @param {import('express').Response} res - Respuesta JSON con el plan activado.
     * @param {import('express').NextFunction} next - Delega errores al manejador global.
     * @returns {Promise<void>}
     * @response {200} - `{ success: true, data: ImprovementPlan, message }`.
     * @response {403} - Coordinador intenta activar plan de otro programa.
     * @response {404} - Plan no encontrado.
     */
    activate: async (req, res, next) => {
        try {
            const { role, program } = req.user;
            const plan = await ImprovementPlan.findById(req.params.id);

            if (!plan) {
                return res.status(404).json({ success: false, message: 'Plan no encontrado.' });
            }

            // RBAC guard
            if (role === 'coordinator' && String(plan.program) !== String(program)) {
                return res.status(403).json({
                    success: false,
                    message: 'No tiene permisos para activar este plan.'
                });
            }

            // Deactivation sweep: todos los planes activos del mismo programa → closed
            await ImprovementPlan.updateMany(
                { program: plan.program, isActive: true },
                { $set: { isActive: false, status: 'closed' } }
            );

            // Promoción del plan target
            const activated = await ImprovementPlan.findByIdAndUpdate(
                req.params.id,
                { $set: { isActive: true, status: 'active' } },
                { new: true }
            ).populate('program', 'name code faculty');

            res.json({ success: true, data: activated, message: 'Plan activado exitosamente.' });
        } catch (error) { next(error); }
    },

    /**
     * DELETE /api/plans/:id
     * Elimina un plan únicamente si no tiene hallazgos (Activities) asociados.
     * Previene orfandad de datos y pérdida accidental de históricos.
     */
    /**
     * Clona un plan junto con todos sus hallazgos (Activities) y subactividades.
     * El nuevo plan se crea como borrador (`isActive: false`, `status: 'draft'`).
     * No se copian registros de `SubActivityTracking` (seguimiento).
     * El body opcional permite sobrescribir `name`, `startYear`, `endYear`, `description`, `horizons`.
     *
     * @route POST /api/plans/:id/copy
     * @access Privado (Admin, Coordinator).
     * @param {import('express').Request} req - Petición; `req.params.id`, `req.body` opcional, `req.user`.
     * @param {import('express').Response} res - Respuesta JSON 201 con el plan clonado y recuento de hallazgos.
     * @param {import('express').NextFunction} next - Delega errores al manejador global.
     * @returns {Promise<void>}
     * @response {201} - `{ success: true, data: ImprovementPlan, message }`.
     * @response {403} - Coordinador intenta copiar plan de otro programa.
     * @response {404} - Plan no encontrado.
     */
    copy: async (req, res, next) => {
        try {
            const { role, program, _id: userId } = req.user;
            const source = await ImprovementPlan.findById(req.params.id)
                .populate('program', 'name code faculty');

            if (!source) {
                return res.status(404).json({ success: false, message: 'Plan no encontrado.' });
            }

            // RBAC: coordinador solo puede copiar planes de su propio programa
            if (role === 'coordinator' && String(source.program?._id || source.program) !== String(program)) {
                return res.status(403).json({
                    success: false,
                    message: 'No tiene permisos para copiar este plan.'
                });
            }

            const body = req.body || {};
            const data = {
                name: body.name || `${source.name} (Copia)`,
                program: source.program?._id || source.program,
                startYear: body.startYear ?? source.startYear,
                endYear: body.endYear ?? source.endYear,
                description: body.description !== undefined ? body.description : (source.description || ''),
                isActive: false,
                status: 'draft',
                createdBy: userId,
                horizons: body.horizons || source.horizons
            };

            const newPlan = await ImprovementPlan.create(data);

            // ── Clonar hallazgos y subactividades (sin seguimiento) ────────────
            let copiedActivities = 0;
            const sourceActivities = await Activity.find({ improvementPlan: source._id });

            if (sourceActivities.length > 0) {
                const clonedDocs = sourceActivities.map(act => {
                    const obj = act.toObject();
                    delete obj._id;
                    return {
                        findingDescription: obj.findingDescription,
                        status: obj.status,
                        responsibleUsers: obj.responsibleUsers || [],
                        program: obj.program,
                        createdBy: userId,
                        improvementPlan: newPlan._id,
                        // Cada subactividad clonada recibe un nuevo _id (se elimina el del origen)
                        subActivities: (obj.subActivities || []).map(sub => {
                            const s = { ...sub };
                            delete s._id;
                            return s;
                        })
                    };
                });

                const inserted = await Activity.insertMany(clonedDocs);
                copiedActivities = inserted.length;
            }

            const populated = await ImprovementPlan.findById(newPlan._id)
                .populate('program', 'name code faculty')
                .populate('createdBy', 'firstName lastName');

            res.status(201).json({
                success: true,
                data: populated,
                message: `Plan copiado exitosamente con ${copiedActivities} hallazgo(s). El seguimiento de actividades no se copia.`
            });
        } catch (error) { next(error); }
    },

    /**
     * Elimina un plan de mejoramiento por su identificador.
     *
     * Verifica la existencia del plan, aplica control de acceso (un
     * coordinador solo puede eliminar planes de su propio programa) y bloquea
     * la eliminación cuando el plan posee hallazgos asociados, garantizando la
     * integridad referencial.
     *
     * @route DELETE /api/plans/:id
     * @access Privado (Admin, Coordinator).
     * @param {import('express').Request} req - Petición; `req.params.id` y `req.user` con rol y programa.
     * @param {import('express').Response} res - Respuesta JSON de confirmación.
     * @param {import('express').NextFunction} next - Delega errores al manejador global.
     * @returns {Promise<void>}
     * @response {200} - `{ success: true, message: 'Plan eliminado exitosamente.' }`.
     * @response {403} - Coordinador sin permisos sobre el plan.
     * @response {404} - Plan no encontrado.
     * @response {409} - El plan tiene hallazgos asociados.
     */
    delete: async (req, res, next) => {
        try {
            const { role, program } = req.user;
            const plan = await ImprovementPlan.findById(req.params.id);

            if (!plan) {
                return res.status(404).json({ success: false, message: 'Plan no encontrado.' });
            }

            // RBAC guard
            if (role === 'coordinator' && String(plan.program) !== String(program)) {
                return res.status(403).json({
                    success: false,
                    message: 'No tiene permisos para eliminar este plan.'
                });
            }

            // Integridad referencial: bloquear eliminación si existen hallazgos ligados
            const activityCount = await Activity.countDocuments({ improvementPlan: req.params.id });
            if (activityCount > 0) {
                return res.status(409).json({
                    success: false,
                    message: `No se puede eliminar: el plan tiene ${activityCount} hallazgo(s) asociado(s).`
                });
            }

            await ImprovementPlan.findByIdAndDelete(req.params.id);
            res.json({ success: true, message: 'Plan eliminado exitosamente.' });
        } catch (error) { next(error); }
    }
};
