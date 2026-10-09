import Program from '../models/Program.js';

/**
 * Obtiene todos los programas.
 * Consulta la colección `programs` con `find()` y `populate('coordinator')`.
 *
 * @route GET /api/programs
 * @access Privado (Admin, Coordinator).
 * @param {import('express').Request} req - Petición del cliente autenticado.
 * @param {import('express').Response} res - Respuesta JSON con la lista de programas.
 * @param {import('express').NextFunction} next - Delega errores al manejador global.
 * @returns {Promise<void>}
 * @response {200} - `{ success: true, data: Program[] }`.
 */
export const getPrograms = async (req, res, next) => {
    try {
        const programs = await Program.find().populate('coordinator');
        res.json({ success: true, data: programs });
    } catch (error) { next(error); }
};

/**
 * Crea un nuevo programa académico.
 * Inserta un documento en la colección `programs` con `Program.create(req.body)`.
 *
 * @route POST /api/programs
 * @access Privado (Admin).
 * @param {import('express').Request} req - Petición; `req.body` con los campos del programa.
 * @param {import('express').Response} res - Respuesta JSON con el programa creado.
 * @param {import('express').NextFunction} next - Delega errores al manejador global.
 * @returns {Promise<void>}
 * @response {201} - `{ success: true, data: Program }`.
 */
export const createProgram = async (req, res, next) => {
    try {
        const program = await Program.create(req.body);
        res.status(201).json({ success: true, data: program });
    } catch (error) { next(error); }
};

/**
 * Actualiza un programa académico existente.
 * Ejecuta `Program.findByIdAndUpdate` con `{ new: true, runValidators: true }`.
 *
 * @route PUT /api/programs/:id
 * @access Privado (Admin).
 * @param {import('express').Request} req - Petición; `req.params.id` y `req.body` con campos a actualizar.
 * @param {import('express').Response} res - Respuesta JSON con el programa actualizado.
 * @param {import('express').NextFunction} next - Delega errores al manejador global.
 * @returns {Promise<void>}
 * @response {200} - `{ success: true, data: Program }`.
 */
export const updateProgram = async (req, res, next) => {
    try {
        const program = await Program.findByIdAndUpdate(req.params.id, req.body, { new: true });
        res.json({ success: true, data: program });
    } catch (error) { next(error); }
};

/**
 * Elimina un programa académico existente.
 * Ejecuta `Program.findByIdAndDelete` por `req.params.id`.
 *
 * @route DELETE /api/programs/:id
 * @access Privado (Admin).
 * @param {import('express').Request} req - Petición con `req.params.id`.
 * @param {import('express').Response} res - Respuesta JSON de confirmación.
 * @param {import('express').NextFunction} next - Delega errores al manejador global.
 * @returns {Promise<void>}
 * @response {200} - `{ success: true, message: 'Programa eliminado' }`.
 */
export const deleteProgram = async (req, res, next) => {
    try {
        await Program.findByIdAndDelete(req.params.id);
        res.json({ success: true, message: 'Programa eliminado' });
    } catch (error) { next(error); }
};
