import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import { readFileSync } from 'node:fs';
import morgan from 'morgan';
import helmet from 'helmet';
import { apiReference } from '@scalar/express-api-reference';

import { SERVER_CONFIG, DB_CREDENTIALS } from './config/envs.js';
import { notFound, errorHandler } from './middlewares/error.middleware.js';
import log from './utils/logger.js';

// --- Rutas ---
import userRoutes from './routes/user.routes.js';
import programRoutes from './routes/program.routes.js';
import catalogRoutes from './routes/catalog.routes.js';
import adminRoutes from './routes/admin.routes.js';
import activityRoutes from './routes/activity.routes.js';
import improvementPlanRoutes from './routes/improvementPlan.routes.js';
import trackingRoutes from './routes/tracking.routes.js';

const app = express();

// --- Middlewares globales ---
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({
    origin: [SERVER_CONFIG.FRONTEND_URL, 'http://localhost:3001'],
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
}));
app.use(express.json());

// Morgan personalizado usando el logger interno
app.use(morgan((tokens, req, res) => {
    const msg = `${tokens.method(req, res)} ${tokens.url(req, res)} ${tokens.status(req, res)} - ${tokens['response-time'](req, res)}ms`;
    log('HTTP', msg);
    return null;
}));

// --- Conexión a MongoDB ---
log('DATABASE', 'Conectando a MongoDB...');
mongoose.connect(DB_CREDENTIALS.URI, DB_CREDENTIALS.OPTIONS)
    .then(async () => {
        log('DATABASE', 'Conectado a MongoDB exitosamente.');
    })
    .catch(err => log('DATABASE', `Error de conexión: ${err.message}`, 'error'));

// --- Rutas de la API ---
app.use('/api/users', userRoutes);
app.use('/api/programs', programRoutes);
app.use('/api/catalogs', catalogRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/activities', activityRoutes);
app.use('/api/plans', improvementPlanRoutes);
app.use('/api/tracking', trackingRoutes);

// La carpeta de subidas estáticas se elimina: los archivos se sirven desde MinIO (S3)


// --- Scalar API Documentation ---
// La especificación OpenAPI se sirve desde `src/docs/openapi.json` (generada
// con `npm run docs:generate`) y la UI la carga mediante la URL relativa del
// documento, de modo que funcione también detrás del proxy de despliegue.
// El bundle del CDN se fija a una versión concreta para que una actualización
// futura de @scalar/api-reference no rompa el renderizado.
app.get('/api-docs/openapi.json', (_req, res) => {
    try {
        res.type('json').status(200).send(readFileSync(new URL('./docs/openapi.json', import.meta.url), 'utf8'));
    } catch (err) {
        log('DOCS', `Error leyendo src/docs/openapi.json: ${err.message}`, 'error');
        res.status(500).json({ success: false, error: 'No se pudo cargar la especificación OpenAPI.' });
    }
});

app.use('/api-docs', apiReference({
    cdn: 'https://cdn.jsdelivr.net/npm/@scalar/api-reference@1.73.0',
    url: '/api-docs/openapi.json'
}));

// --- Health Check ---
app.get('/health', (_req, res) => {
    res.status(200).json({
        success: true,
        service: 'api-improvement-plan',
        status: 'UP',
        time: new Date().toISOString(),
    });
});

// --- Manejo de errores ---
app.use(notFound);
app.use(errorHandler);

// --- Iniciar servidor ---
app.listen(SERVER_CONFIG.PORT, () => {
    log('SERVER', `API corriendo en http://localhost:${SERVER_CONFIG.PORT}`);
    log('SERVER', `Documentación Scalar: http://localhost:${SERVER_CONFIG.PORT}/api-docs`);
    log('SERVER', `Health Check: http://localhost:${SERVER_CONFIG.PORT}/health`);
});

export default app;
