/**
 * Definición de rutas de catálogos de parametrización.
 *
 * Registra dinámicamente un bloque CRUD (GET/POST/PUT/DELETE) por cada
 * catálogo mediante la fábrica `createCatalogController`. Lectura permitida a
 * `admin`, `coordinator` y `teacher`; escritura (PUT/DELETE) restringida a
 * `admin`. El prefijo de montaje en `src/app.js` es `/api/catalogs`.
 */
import express from 'express';
import { protect, authorize } from '../middlewares/auth.middleware.js';
import { createCatalogController } from '../controllers/catalog.controller.js';

// Importar todos los modelos
import Campus from '../models/Campus.js';
import IdSource from '../models/IdSource.js';
import PDILine from '../models/PDILine.js';
import PDIProgram from '../models/PDIProgram.js';
import PDIObjective from '../models/PDIObjective.js';
import FactorInst from '../models/FactorInst.js';
import FactorProg from '../models/FactorProg.js';
import QualityInst from '../models/QualityInst.js';
import QualityProg from '../models/QualityProg.js';

const router = express.Router();

/**
 * Función auxiliar para registrar rutas de catálogo de forma compacta.
 * @param {string} path - URL del recurso
 * @param {Object} Model - Modelo de Mongoose
 * @param {string} label - Etiqueta para mensajes
 */
const registerCatalog = (path, Model, label) => {
    const ctrl = createCatalogController(Model, label);
    
    router.get(path, protect, authorize('admin', 'coordinator', 'teacher'), ctrl.getAll);
    router.post(path, protect, authorize('admin', 'coordinator', 'teacher'), ctrl.create);
    router.put(`${path}/:id`, protect, authorize('admin'), ctrl.update);
    router.delete(`${path}/:id`, protect, authorize('admin'), ctrl.delete);
};

// Registro de todos los catálogos
registerCatalog('/campuses', Campus, 'sede');
registerCatalog('/id-sources', IdSource, 'fuente de identificación');
registerCatalog('/pdi-lines', PDILine, 'línea estratégica');
registerCatalog('/pdi-programs', PDIProgram, 'programa estratégico');
registerCatalog('/pdi-objectives', PDIObjective, 'objetivo estratégico');
registerCatalog('/factors-inst', FactorInst, 'factor institucional');
registerCatalog('/factors-prog', FactorProg, 'factor de programa');
registerCatalog('/quality-inst', QualityInst, 'condición de calidad institucional');
registerCatalog('/quality-prog', QualityProg, 'condición de calidad de programa');

export default router;
