/**
 * Definición de rutas de planes de mejoramiento.
 *
 * Aplica el middleware `protect` de forma global a todas las rutas del
 * router. Los endpoints de mutación están restringidos a los roles `admin`
 * y `coordinator`, con validación adicional de programa en el controlador.
 * El prefijo de montaje en `src/app.js` es `/api/plans`.
 */
import express from 'express';
import { protect, authorize } from '../middlewares/auth.middleware.js';
import { improvementPlanController } from '../controllers/improvementPlan.controller.js';

const router = express.Router();

// Guard global: todas las rutas requieren sesión autenticada
router.use(protect);

/**
 * Endpoints de consulta (read-only) — accesibles a todos los roles autenticados.
 * El controlador aplica el scope por rol internamente (RBAC en capa de negocio).
 */
router.get('/',
    /* #swagger.tags = ['Planes de Mejoramiento']
       #swagger.summary = 'Lista los planes de mejoramiento'
       #swagger.description = 'Obtiene los planes de mejoramiento aplicando el alcance por rol: un coordinador ve solo los planes de su programa.'
       #swagger.security = [{ bearerAuth: [] }]
       #swagger.responses[200] = { description: 'Lista de planes de mejoramiento.' }
       #swagger.responses[401] = { description: 'No autenticado.' } */
    improvementPlanController.getAll);

router.get('/by-program/:programId',
    /* #swagger.tags = ['Planes de Mejoramiento']
       #swagger.summary = 'Lista los planes de un programa'
       #swagger.description = 'Obtiene los planes de mejoramiento del programa indicado.'
       #swagger.security = [{ bearerAuth: [] }]
       #swagger.parameters = [{ name: 'programId', in: 'path', required: true, description: 'Identificador del programa.', schema: { type: 'string' } }]
       #swagger.responses[200] = { description: 'Lista de planes del programa.' }
       #swagger.responses[401] = { description: 'No autenticado.' } */
    improvementPlanController.getByProgram);

router.get('/active/:programId',
    /* #swagger.tags = ['Planes de Mejoramiento']
       #swagger.summary = 'Obtiene el plan activo de un programa'
       #swagger.description = 'Consulta el plan de mejoramiento activo del programa indicado.'
       #swagger.security = [{ bearerAuth: [] }]
       #swagger.parameters = [{ name: 'programId', in: 'path', required: true, description: 'Identificador del programa.', schema: { type: 'string' } }]
       #swagger.responses[200] = { description: 'Plan activo del programa.' }
       #swagger.responses[404] = { description: 'No existe un plan activo para el programa.' }
       #swagger.responses[401] = { description: 'No autenticado.' } */
    improvementPlanController.getActivePlan);

/**
 * Endpoints de mutación — restringidos a admin y coordinator.
 * El controlador valida adicionalmente que el coordinator opere sobre su propio programa.
 */
router.post('/',
    /* #swagger.tags = ['Planes de Mejoramiento']
       #swagger.summary = 'Crea un plan de mejoramiento'
       #swagger.description = 'Registra un plan de mejoramiento para un programa con su vigencia y configuración de plazos.'
       #swagger.security = [{ bearerAuth: [] }]
       #swagger.requestBody = { required: true, content: { 'application/json': { schema: { type: 'object', required: ['name', 'programId', 'startYear', 'endYear', 'horizons'], properties: { name: { type: 'string' }, programId: { type: 'string' }, startYear: { type: 'number' }, endYear: { type: 'number' }, description: { type: 'string' }, isActive: { type: 'boolean' }, horizons: { type: 'object' } } } } } }
       #swagger.responses[201] = { description: 'Plan creado.' }
       #swagger.responses[400] = { description: 'Datos inválidos o plan duplicado.' }
       #swagger.responses[401] = { description: 'No autenticado.' }
       #swagger.responses[403] = { description: 'Sin permisos.' } */
    authorize('admin', 'coordinator'),
    improvementPlanController.create);

router.post('/:id/copy',
    /* #swagger.tags = ['Planes de Mejoramiento']
       #swagger.summary = 'Clona un plan de mejoramiento'
       #swagger.description = 'Duplica un plan existente junto con sus hallazgos y subactividades, permitiendo indicar datos del nuevo plan en el cuerpo.'
       #swagger.security = [{ bearerAuth: [] }]
       #swagger.parameters = [{ name: 'id', in: 'path', required: true, description: 'Identificador del plan a clonar.', schema: { type: 'string' } }]
       #swagger.requestBody = { required: false, content: { 'application/json': { schema: { type: 'object' } } } }
       #swagger.responses[201] = { description: 'Plan clonado.' }
       #swagger.responses[401] = { description: 'No autenticado.' }
       #swagger.responses[403] = { description: 'Sin permisos.' }
       #swagger.responses[404] = { description: 'Plan origen no encontrado.' } */
    authorize('admin', 'coordinator'),
    improvementPlanController.copy);

router.put('/:id',
    /* #swagger.tags = ['Planes de Mejoramiento']
       #swagger.summary = 'Actualiza un plan de mejoramiento'
       #swagger.description = 'Actualiza los datos generales y la configuración de plazos de un plan de mejoramiento.'
       #swagger.security = [{ bearerAuth: [] }]
       #swagger.parameters = [{ name: 'id', in: 'path', required: true, description: 'Identificador del plan.', schema: { type: 'string' } }]
       #swagger.requestBody = { required: true, content: { 'application/json': { schema: { type: 'object', properties: { name: { type: 'string' }, startYear: { type: 'number' }, endYear: { type: 'number' }, description: { type: 'string' }, horizons: { type: 'object' } } } } } }
       #swagger.responses[200] = { description: 'Plan actualizado.' }
       #swagger.responses[400] = { description: 'Datos inválidos.' }
       #swagger.responses[401] = { description: 'No autenticado.' }
       #swagger.responses[403] = { description: 'Sin permisos.' }
       #swagger.responses[404] = { description: 'Plan no encontrado.' } */
    authorize('admin', 'coordinator'),
    improvementPlanController.update);

router.patch('/:id/activate',
    /* #swagger.tags = ['Planes de Mejoramiento']
       #swagger.summary = 'Activa un plan de mejoramiento'
       #swagger.description = 'Marca un plan como activo, desactivando los demás planes del mismo programa.'
       #swagger.security = [{ bearerAuth: [] }]
       #swagger.parameters = [{ name: 'id', in: 'path', required: true, description: 'Identificador del plan.', schema: { type: 'string' } }]
       #swagger.responses[200] = { description: 'Plan activado.' }
       #swagger.responses[401] = { description: 'No autenticado.' }
       #swagger.responses[403] = { description: 'Sin permisos.' }
       #swagger.responses[404] = { description: 'Plan no encontrado.' } */
    authorize('admin', 'coordinator'),
    improvementPlanController.activate);

router.delete('/:id',
    /* #swagger.tags = ['Planes de Mejoramiento']
       #swagger.summary = 'Elimina un plan de mejoramiento'
       #swagger.description = 'Elimina un plan siempre que no tenga hallazgos asociados. Acción restringida a admin y coordinator.'
       #swagger.security = [{ bearerAuth: [] }]
       #swagger.parameters = [{ name: 'id', in: 'path', required: true, description: 'Identificador del plan.', schema: { type: 'string' } }]
       #swagger.responses[200] = { description: 'Plan eliminado.' }
       #swagger.responses[400] = { description: 'El plan tiene hallazgos asociados.' }
       #swagger.responses[401] = { description: 'No autenticado.' }
       #swagger.responses[403] = { description: 'Sin permisos.' }
       #swagger.responses[404] = { description: 'Plan no encontrado.' } */
    authorize('admin', 'coordinator'),
    improvementPlanController.delete);

export default router;