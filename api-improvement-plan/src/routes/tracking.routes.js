/**
 * Definición de rutas de seguimiento de subactividades.
 *
 * Aplica el middleware `protect` de forma global y configura Multer con
 * almacenamiento en memoria para la carga de evidencias PDF (máx. 15 MB),
 * las cuales se transmiten desde el controlador a MinIO/S3. El prefijo de
 * montaje en `src/app.js` es `/api/tracking`.
 */
import express from 'express';
import multer from 'multer';
import { protect } from '../middlewares/auth.middleware.js';
import { trackingController } from '../controllers/tracking.controller.js';

// Buffer en memoria: el archivo se sube a MinIO en el controlador
const upload = multer({
    storage: multer.memoryStorage(),
    fileFilter: (req, file, cb) => {
        if (file.mimetype === 'application/pdf') {
            cb(null, true);
        } else {
            cb(new Error('Solo se admiten documentos en formato PDF.'), false);
        }
    },
    limits: { fileSize: 15 * 1024 * 1024 } // 15MB límite
});

const router = express.Router();

// Todas las rutas de seguimiento requieren autenticación
router.use(protect);

/**
 * GET /api/tracking/export - Exporta la matriz de seguimiento a Excel (XLSX).
 * Debe declararse antes del enrutamiento con identificadores.
 * Controlador: `trackingController.exportTracking`.
 */
router.get('/export',
    /* #swagger.tags = ['Seguimiento']
       #swagger.summary = 'Exporta la matriz de seguimiento a Excel'
       #swagger.description = 'Genera el archivo XLSX con la matriz de seguimiento de subactividades para un plan y programa con los años indicados.'
       #swagger.security = [{ bearerAuth: [] }]
       #swagger.parameters = [{ name: 'planId', in: 'query', required: true, description: 'Identificador del plan de mejoramiento.', schema: { type: 'string' } }, { name: 'programId', in: 'query', description: 'Identificador del programa.', schema: { type: 'string' } }, { name: 'years', in: 'query', description: 'Años a incluir.', schema: { type: 'array', items: { type: 'number' } } }]
       #swagger.responses[200] = { description: 'Archivo XLSX de seguimiento.' }
       #swagger.responses[401] = { description: 'No autenticado.' } */
    trackingController.exportTracking);

router.get('/sub-activity/:subActivityId/year/:year',
    /* #swagger.tags = ['Seguimiento']
       #swagger.summary = 'Obtiene el seguimiento de una subactividad por año'
       #swagger.description = 'Consulta el registro de seguimiento de una subactividad específica para un año académico.'
       #swagger.security = [{ bearerAuth: [] }]
       #swagger.parameters = [{ name: 'subActivityId', in: 'path', required: true, description: 'Identificador de la subactividad.', schema: { type: 'string' } }, { name: 'year', in: 'path', required: true, description: 'Año académico.', schema: { type: 'number' } }]
       #swagger.responses[200] = { description: 'Registro de seguimiento.' }
       #swagger.responses[401] = { description: 'No autenticado.' }
       #swagger.responses[404] = { description: 'Registro no encontrado.' } */
    trackingController.getBySubActivityAndYear);

router.post('/',
    /* #swagger.tags = ['Seguimiento']
       #swagger.summary = 'Crea o actualiza un registro de seguimiento'
       #swagger.description = 'Realiza un upsert del registro de seguimiento de una subactividad: crea el registro si no existe o lo actualiza en caso contrario.'
       #swagger.security = [{ bearerAuth: [] }]
       #swagger.requestBody = { required: true, content: { 'application/json': { schema: { type: 'object', required: ['activityId', 'subActivityId', 'year'], properties: { activityId: { type: 'string' }, subActivityId: { type: 'string' }, year: { type: 'number' }, firstSemesterDate: { type: 'string', format: 'date' }, secondSemesterDate: { type: 'string', format: 'date' }, evidenceDescription: { type: 'string' }, evidencePdfUrl: { type: 'string' }, firstSemesterAdvance: { type: 'number' }, secondSemesterAdvance: { type: 'number' }, firstSemesterObservations: { type: 'string' }, secondSemesterObservations: { type: 'string' } } } } } }
       #swagger.responses[200] = { description: 'Registro de seguimiento guardado.' }
       #swagger.responses[400] = { description: 'Faltan campos obligatorios.' }
       #swagger.responses[401] = { description: 'No autenticado.' } */
    trackingController.save);

router.post('/upload-pdf',
    /* #swagger.tags = ['Seguimiento']
       #swagger.summary = 'Sube una evidencia PDF'
       #swagger.description = 'Recibe una evidencia en formato PDF (multipart/form-data, campo `pdf`) y la transfiere al bucket MinIO/S3, devolviendo su URL.'
       #swagger.security = [{ bearerAuth: [] }]
       #swagger.requestBody = { required: true, content: { 'multipart/form-data': { schema: { type: 'object', properties: { pdf: { type: 'string', format: 'binary' } } } } } }
       #swagger.responses[200] = { description: 'URL de la evidencia subida.' }
       #swagger.responses[400] = { description: 'Archivo no recibido o formato no permitido.' }
       #swagger.responses[401] = { description: 'No autenticado.' } */
    upload.single('pdf'),
    trackingController.uploadPdf);

router.delete('/evidence',
    /* #swagger.tags = ['Seguimiento']
       #swagger.summary = 'Elimina una evidencia PDF'
       #swagger.description = 'Elimina una evidencia PDF del bucket a partir de su URL. Solicita las llaves S3 con un prefijo institucional exigido por seguridad.'
       #swagger.security = [{ bearerAuth: [] }]
       #swagger.requestBody = { required: true, content: { 'application/json': { schema: { type: 'object', required: ['url'], properties: { url: { type: 'string', description: 'URL de la evidencia a eliminar.' } } } } } }
       #swagger.responses[200] = { description: 'Evidencia eliminada.' }
       #swagger.responses[400] = { description: 'URL inválida o con prefijo no permitido.' }
       #swagger.responses[401] = { description: 'No autenticado.' } */
    trackingController.deletePdf);

export default router;