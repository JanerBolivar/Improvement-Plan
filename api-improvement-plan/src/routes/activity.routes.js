/**
 * Definición de rutas de hallazgos (actividades) y subactividades.
 *
 * Aplica el middleware `protect` de forma global a todas las rutas del
 * router. El prefijo de montaje en `src/app.js` es `/api/activities`.
 */
import express from 'express';
import { protect, authorize } from '../middlewares/auth.middleware.js';
import { activityController } from '../controllers/activity.controller.js';

const router = express.Router();

// Todas las rutas están protegidas
router.use(protect);

/**
 * GET /api/activities/suggestions - Obtiene sugerencias de autocompletado para
 * campos de subactividades. Debe declararse antes de `/:id` para evitar
 * captura por el parámetro de ruta.
 * Controlador: `activityController.getSuggestions`.
 */
router.get('/suggestions',
    /* #swagger.tags = ['Actividades']
       #swagger.summary = 'Sugerencias de autocompletado'
       #swagger.description = 'Obtiene sugerencias para campos de subactividades a partir del campo y el texto indicados.'
       #swagger.security = [{ bearerAuth: [] }]
       #swagger.parameters = [{ name: 'field', in: 'query', required: true, description: 'Campo sobre el que se sugieren valores.', schema: { type: 'string' } }, { name: 'query', in: 'query', required: true, description: 'Texto para filtrar las sugerencias.', schema: { type: 'string' } }]
       #swagger.responses[200] = { description: 'Lista de sugerencias.' }
       #swagger.responses[401] = { description: 'No autenticado.' } */
    activityController.getSuggestions);

router.get('/export',
    /* #swagger.tags = ['Actividades']
       #swagger.summary = 'Exporta el plan de mejoramiento a Excel'
       #swagger.description = 'Genera el archivo XLSX del plan de mejoramiento indicado con el detalle de sus hallazgos y subactividades.'
       #swagger.security = [{ bearerAuth: [] }]
       #swagger.parameters = [{ name: 'planId', in: 'query', required: true, description: 'Identificador del plan de mejoramiento.', schema: { type: 'string' } }, { name: 'programId', in: 'query', description: 'Identificador del programa (filtrar).', schema: { type: 'string' } }, { name: 'years', in: 'query', description: 'Años a incluir.', schema: { type: 'array', items: { type: 'number' } } }]
       #swagger.responses[200] = { description: 'Archivo XLSX del plan.' }
       #swagger.responses[401] = { description: 'No autenticado.' }
       #swagger.responses[404] = { description: 'Plan no encontrado.' } */
    activityController.exportToExcel);

/**
 * GET /api/activities - Obtiene los hallazgos con filtros RBAC y por plan. Controlador: `activityController.getAll`.
 * GET /api/activities/:id - Obtiene un hallazgo por identificador. Controlador: `activityController.getById`.
 * POST /api/activities - Crea un hallazgo. Controlador: `activityController.create`.
 * PATCH /api/activities/:id - Actualiza un hallazgo. Controlador: `activityController.update`.
 */
router.get('/',
    /* #swagger.tags = ['Actividades']
       #swagger.summary = 'Lista los hallazgos'
       #swagger.description = 'Obtiene los hallazgos aplicando filtros RBAC y de plan activo según el rol del usuario autenticado.'
       #swagger.security = [{ bearerAuth: [] }]
       #swagger.parameters = [{ name: 'status', in: 'query', description: 'Estado del hallazgo.', schema: { type: 'string' } }, { name: 'planId', in: 'query', description: 'Identificador del plan de mejoramiento.', schema: { type: 'string' } }, { name: 'programId', in: 'query', description: 'Identificador del programa.', schema: { type: 'string' } }]
       #swagger.responses[200] = { description: 'Lista de hallazgos.' }
       #swagger.responses[401] = { description: 'No autenticado.' } */
    activityController.getAll);

router.get('/:id',
    /* #swagger.tags = ['Actividades']
       #swagger.summary = 'Obtiene un hallazgo por identificador'
       #swagger.description = 'Consulta un hallazgo específico con sus subactividades pobladas. Acceso controlado por RBAC y plan.'
       #swagger.security = [{ bearerAuth: [] }]
       #swagger.parameters = [{ name: 'id', in: 'path', required: true, description: 'Identificador del hallazgo.', schema: { type: 'string' } }]
       #swagger.responses[200] = { description: 'Detalle del hallazgo.' }
       #swagger.responses[401] = { description: 'No autenticado.' }
       #swagger.responses[404] = { description: 'Hallazgo no encontrado.' } */
    activityController.getById);

router.post('/',
    /* #swagger.tags = ['Actividades']
       #swagger.summary = 'Crea un hallazgo'
       #swagger.description = 'Registra un hallazgo dentro del plan de mejoramiento del programa del usuario. El administrador puede indicar el programa objetivo en el cuerpo.'
       #swagger.security = [{ bearerAuth: [] }]
       #swagger.requestBody = { required: true, content: { 'application/json': { schema: { type: 'object', properties: { description: { type: 'string' }, responsibleUnit: { type: 'string' }, indicatorName: { type: 'string' }, baseline: { type: 'number' }, productEvidence: { type: 'string' }, resourceDescription: { type: 'string' }, campus: { type: 'string' }, identificationSource: { type: 'string' }, pdiLine: { type: 'string' }, pdiProgram: { type: 'string' }, pdiObjective: { type: 'string' }, qualityFactor: { type: 'string' }, annualGoals: { type: 'object' }, findingDescription: { type: 'string' }, improvementPlan: { type: 'string' }, program: { type: 'string' } } } } } }
       #swagger.responses[201] = { description: 'Hallazgo creado.' }
       #swagger.responses[400] = { description: 'Datos inválidos.' }
       #swagger.responses[401] = { description: 'No autenticado.' } */
    activityController.create);

router.patch('/:id',
    /* #swagger.tags = ['Actividades']
       #swagger.summary = 'Actualiza un hallazgo'
       #swagger.description = 'Actualiza parcialmente un hallazgo por identificador aplicando RBAC por rol y programa.'
       #swagger.security = [{ bearerAuth: [] }]
       #swagger.parameters = [{ name: 'id', in: 'path', required: true, description: 'Identificador del hallazgo.', schema: { type: 'string' } }]
       #swagger.requestBody = { required: true, content: { 'application/json': { schema: { type: 'object' } } } }
       #swagger.responses[200] = { description: 'Hallazgo actualizado.' }
       #swagger.responses[401] = { description: 'No autenticado.' }
       #swagger.responses[403] = { description: 'Sin permisos sobre el hallazgo.' }
       #swagger.responses[404] = { description: 'Hallazgo no encontrado.' } */
    activityController.update);

router.delete('/:id',
    /* #swagger.tags = ['Actividades']
       #swagger.summary = 'Elimina un hallazgo'
       #swagger.description = 'Elimina de forma lógica un hallazgo por identificador. Acción restringida a los roles admin y coordinator.'
       #swagger.security = [{ bearerAuth: [] }]
       #swagger.parameters = [{ name: 'id', in: 'path', required: true, description: 'Identificador del hallazgo.', schema: { type: 'string' } }]
       #swagger.responses[200] = { description: 'Hallazgo eliminado.' }
       #swagger.responses[401] = { description: 'No autenticado.' }
       #swagger.responses[403] = { description: 'Sin permisos para eliminar.' }
       #swagger.responses[404] = { description: 'Hallazgo no encontrado.' } */
    authorize('admin', 'coordinator'),
    activityController.delete);

export default router;