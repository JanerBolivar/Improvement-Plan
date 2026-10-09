/**
 * Definición de rutas de administración y parametrización.
 *
 * Contiene los endpoints reservados a la inicialización del sistema. El
 * prefijo de montaje en `src/app.js` es `/api/admin`.
 */
import express from 'express';
import { protect, authorize } from '../middlewares/auth.middleware.js';
import { setupSystem } from '../controllers/admin.controller.js';

const router = express.Router();

/**
 * POST /api/admin/setup-system - Ruta crítica para la inicialización masiva de
 * tablas maestras (catálogos y PDI). Requiere rol `admin`.
 * Controlador: `setupSystem`.
 */
router.post('/setup-system',
    /* #swagger.tags = ['Administración']
       #swagger.summary = 'Inicializa el sistema con tablas maestras'
       #swagger.description = 'Ejecuta la inicialización masiva de tablas maestras (catálogos y PDI). Ruta crítica reservada al rol admin.'
       #swagger.security = [{ bearerAuth: [] }]
       #swagger.responses[200] = { description: 'Sistema inicializado correctamente.' }
       #swagger.responses[401] = { description: 'No autenticado.' }
       #swagger.responses[403] = { description: 'Sin permisos de administrador.' } */
    protect,
    authorize('admin'),
    setupSystem);

export default router;