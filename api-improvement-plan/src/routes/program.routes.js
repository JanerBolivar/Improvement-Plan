/**
 * Definición de rutas de programas académicos.
 *
 * Agrupa los endpoints CRUD de programas. El prefijo de montaje en
 * `src/app.js` es `/api/programs`.
 */
import express from 'express';
import { getPrograms, createProgram, updateProgram, deleteProgram } from '../controllers/program.controller.js';
import { protect, authorize } from '../middlewares/auth.middleware.js';

const router = express.Router();

/**
 * GET /api/programs - Obtiene todos los programas con su coordinador poblado. Requiere autenticación.
 * Controlador: `getPrograms`.
 */
router.get('/',
    /* #swagger.tags = ['Programas']
       #swagger.summary = 'Lista los programas académicos'
       #swagger.description = 'Obtiene todos los programas académicos con los datos del coordinador poblados. Requiere autenticación.'
       #swagger.security = [{ bearerAuth: [] }]
       #swagger.responses[200] = { description: 'Lista de programas académicos.' }
       #swagger.responses[401] = { description: 'No autenticado.' } */
    protect,
    getPrograms);

/**
 * POST /api/programs - Crea un programa académico. Requiere rol `admin`.
 * Controlador: `createProgram`.
 */
router.post('/',
    /* #swagger.tags = ['Programas']
       #swagger.summary = 'Crea un programa académico'
       #swagger.description = 'Registra un nuevo programa académico. Acción restringida al rol admin.'
       #swagger.security = [{ bearerAuth: [] }]
       #swagger.requestBody = { required: true, content: { 'application/json': { schema: { type: 'object', required: ['name', 'code', 'faculty', 'level'], properties: { name: { type: 'string' }, code: { type: 'string' }, faculty: { type: 'string' }, level: { type: 'string' }, modality: { type: 'string' }, coordinator: { type: 'string' }, status: { type: 'string' } } } } } }
       #swagger.responses[201] = { description: 'Programa creado.' }
       #swagger.responses[400] = { description: 'Solicitud inválida o código duplicado.' }
       #swagger.responses[401] = { description: 'No autenticado.' }
       #swagger.responses[403] = { description: 'Sin permisos de administrador.' } */
    protect,
    authorize('admin'),
    createProgram);

/**
 * PUT /api/programs/:id - Actualiza un programa por identificador. Requiere rol `admin`.
 * Controlador: `updateProgram`.
 */
router.put('/:id',
    /* #swagger.tags = ['Programas']
       #swagger.summary = 'Actualiza un programa académico'
       #swagger.description = 'Actualiza los datos de un programa académico por identificador. Acción restringida al rol admin.'
       #swagger.security = [{ bearerAuth: [] }]
       #swagger.parameters = [{ name: 'id', in: 'path', required: true, description: 'Identificador del programa.', schema: { type: 'string' } }]
       #swagger.requestBody = { required: true, content: { 'application/json': { schema: { type: 'object', properties: { name: { type: 'string' }, code: { type: 'string' }, faculty: { type: 'string' }, level: { type: 'string' }, modality: { type: 'string' }, coordinator: { type: 'string' }, status: { type: 'string' } } } } } }
       #swagger.responses[200] = { description: 'Programa actualizado.' }
       #swagger.responses[400] = { description: 'Solicitud inválida o código duplicado.' }
       #swagger.responses[401] = { description: 'No autenticado.' }
       #swagger.responses[403] = { description: 'Sin permisos de administrador.' }
       #swagger.responses[404] = { description: 'Programa no encontrado.' } */
    protect,
    authorize('admin'),
    updateProgram);

/**
 * DELETE /api/programs/:id - Elimina un programa por identificador. Requiere rol `admin`.
 * Controlador: `deleteProgram`.
 */
router.delete('/:id',
    /* #swagger.tags = ['Programas']
       #swagger.summary = 'Elimina un programa académico'
       #swagger.description = 'Elimina un programa académico por identificador. Acción restringida al rol admin.'
       #swagger.security = [{ bearerAuth: [] }]
       #swagger.parameters = [{ name: 'id', in: 'path', required: true, description: 'Identificador del programa.', schema: { type: 'string' } }]
       #swagger.responses[200] = { description: 'Programa eliminado.' }
       #swagger.responses[401] = { description: 'No autenticado.' }
       #swagger.responses[403] = { description: 'Sin permisos de administrador.' }
       #swagger.responses[404] = { description: 'Programa no encontrado.' } */
    protect,
    authorize('admin'),
    deleteProgram);

export default router;