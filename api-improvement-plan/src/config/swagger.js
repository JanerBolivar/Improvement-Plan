/**
 * Generador del documento OpenAPI del backend.
 *
 * Utiliza `swagger-autogen` para inspeccionar los archivos de rutas ubicados
 * en `src/routes` y producir el archivo `src/docs/openapi.json`, documento que
 * es servido después a Scalar UI mediante el endpoint `/api-docs/openapi.json`.
 *
 * Nota de diseño: `swagger-autogen` se ejecuta **una vez por archivo de ruta**
 * porque el proceso de resolución de imports presenta interferencias cuando se
 * procesan varios routers desde un único punto de entrada (bug del parser:
 * retorna `Failed` al montar más de un router con `app.use`). Cada resultado
 * parcial se fusiona aquí, anteponiendo el prefijo de montaje de cada recurso
 * (definido en `src/app.js`) para reconstruir las rutas completas `/api/*`.
 *
 * Las rutas dinámicas de los catálogos (fábrica `registerCatalog` de
 * `catalog.routes.js`) no pueden ser resueltas por el parser al depender de
 * una variable; se registran programáticamente en `registerCatalogPaths`.
 *
 * El script se ejecuta desde la raíz del backend con el comando
 * `npm run docs:generate` y debe volver a ejecutarse cada vez que se añadan,
 * modifiquen o eliminen rutas.
 *
 * @module swagger
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import swaggerAutogenFactory from 'swagger-autogen';
import log from '../utils/logger.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** Raíz del backend (directorio raíz del proyecto). */
const ROOT_DIR = path.resolve(__dirname, '..', '..');

/** Ruta absoluta del archivo de salida que contendrá la especificación OpenAPI. */
const OUTPUT_FILE = path.join(ROOT_DIR, 'src', 'docs', 'openapi.json');

/**
 * Instancia de `swagger-autogen` configurada para emitir OpenAPI 3.0.
 * @type {Function}
 */
const swaggerAutogen = swaggerAutogenFactory({ openapi: '3.0.0', disableLogs: true });

/**
 * Archivos de rutas analizados, con su prefijo de montaje en `src/app.js`.
 * El prefijo se antepone a cada ruta detectada para reconstruir las rutas
 * completas que expone la API.
 * @type {{ file: string, prefix: string }[]}
 */
const ROUTE_GROUPS = [
    { file: 'src/routes/user.routes.js', prefix: '/api/users' },
    { file: 'src/routes/program.routes.js', prefix: '/api/programs' },
    { file: 'src/routes/catalog.routes.js', prefix: '/api/catalogs' },
    { file: 'src/routes/admin.routes.js', prefix: '/api/admin' },
    { file: 'src/routes/activity.routes.js', prefix: '/api/activities' },
    { file: 'src/routes/improvementPlan.routes.js', prefix: '/api/plans' },
    { file: 'src/routes/tracking.routes.js', prefix: '/api/tracking' },
];

/**
 * Documento base de la especificación OpenAPI 3.0.
 *
 * Contiene los metadatos globales (información del servicio, servidor, tags y
 * esquema de autenticación) que `swagger-autogen` combina con los endpoints
 * detectados en cada archivo de rutas.
 * @type {Object}
 */
const doc = {
    info: {
        version: '1.0.0',
        title: 'Plan de Mejoramiento API',
        description: 'API para la gestión de programas académicos, planes de mejoramiento, hallazgos y usuarios del sistema de Plan de Mejoramiento. Incluye autenticación mediante JWT (SSO institucional) y control de acceso por roles.',
    },
    servers: [
        {
            url: '/',
            description: 'Origen del servidor de la API (misma máquina que sirve la documentación).',
        },
    ],
    tags: [
        { name: 'Usuarios', description: 'Autenticación SSO y gestión de usuarios' },
        { name: 'Programas', description: 'Gestión de programas académicos' },
        { name: 'Planes de Mejoramiento', description: 'Ciclo de vida de los planes de mejoramiento' },
        { name: 'Actividades', description: 'Hallazgos y subactividades del plan' },
        { name: 'Seguimiento', description: 'Seguimiento y evidencias de subactividades' },
        { name: 'Catálogos', description: 'Tablas maestras y parámetros de parametrización' },
        { name: 'Administración', description: 'Inicialización y mantenimiento del sistema' },
    ],
    components: {
        securitySchemes: {
            bearerAuth: {
                type: 'http',
                scheme: 'bearer',
                bearerFormat: 'JWT',
                description: 'Token JWT emitido por el endpoint de login SSO.',
            },
        },
    },
    security: [{ bearerAuth: [] }],
};

/**
 * Catálogos registrados por la fábrica `registerCatalog` de
 * `catalog.routes.js`. Cada entrada se traduce en un CRUD completo de cuatro
 * operaciones bajo `/api/catalogs`.
 * @type {string[]}
 */
const CATALOG_SLUGS = [
    'campuses',
    'id-sources',
    'pdi-lines',
    'pdi-programs',
    'pdi-objectives',
    'factors-inst',
    'factors-prog',
    'quality-inst',
    'quality-prog',
];

/**
 * Normaliza la clave de una ruta fusionada.
 *
 * Elimina barras consecutivas y la barra final (las rutas registradas en
 * Express como `/` se convierten en `/api/recurso`).
 * @param {string} key - Clave de ruta cruda (prefijo + ruta detectada).
 * @returns {string} Clave normalizada.
 */
const normalizePath = (key) => {
    let clean = key.replace(/\/{2,}/g, '/');
    if (clean.length > 1 && clean.endsWith('/')) {
        clean = clean.slice(0, -1);
    }
    return clean;
};

/**
 * Construye el subobjeto de operaciones OpenAPI de un catálogo.
 *
 * Genera GET/POST sobre la colección y PUT/DELETE sobre un documento,
 * replicando la semántica de `registerCatalog`: lectura para `admin`,
 * `coordinator` y `teacher`; escritura restringida a `admin`.
 * @param {string} slug - Identificador del catálogo (p. ej. `campuses`).
 * @returns {Object} Objeto `paths` de OpenAPI con las cuatro operaciones.
 */
const buildCatalogOperations = (slug) => {
    const base = `/api/catalogs/${slug}`;
    return {
        [base]: {
            get: {
                tags: ['Catálogos'],
                summary: `Lista los registros del catálogo ${slug}`,
                security: [{ bearerAuth: [] }],
                responses: { 200: { description: 'Lista de registros del catálogo.' } },
            },
            post: {
                tags: ['Catálogos'],
                summary: `Crea un registro en el catálogo ${slug}`,
                security: [{ bearerAuth: [] }],
                requestBody: { content: { 'application/json': { schema: { type: 'object' } } } },
                responses: { 201: { description: 'Registro creado.' } },
            },
        },
        [`${base}/{id}`]: {
            put: {
                tags: ['Catálogos'],
                summary: `Actualiza un registro del catálogo ${slug}`,
                security: [{ bearerAuth: [] }],
                parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
                requestBody: { content: { 'application/json': { schema: { type: 'object' } } } },
                responses: { 200: { description: 'Registro actualizado.' } },
            },
            delete: {
                tags: ['Catálogos'],
                summary: `Elimina un registro del catálogo ${slug}`,
                security: [{ bearerAuth: [] }],
                parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
                responses: { 200: { description: 'Registro eliminado.' } },
            },
        },
    };
};

/**
 * Fusiona las rutas detectadas por `swagger-autogen` anteponiendo el prefijo
 * de montaje y descartando rutas no resueltas (claves con `${` o vacías).
 * @param {Object} paths - Objeto `paths` detectado para un archivo de rutas.
 * @param {string} prefix - Prefijo de montaje del recurso.
 * @returns {Object} Rutas fusionadas y normalizadas.
 */
const applyPrefix = (paths, prefix) => {
    const result = {};
    Object.entries(paths).forEach(([key, operations]) => {
        if (!key || key.includes('${') || key === 'path') {
            return;
        }
        result[normalizePath(`${prefix}${key}`)] = operations;
    });
    return result;
};

log('DOCS', 'Generando especificación OpenAPI con swagger-autogen...');

const mergedPaths = {};
let success = true;

for (let idx = 0; idx < ROUTE_GROUPS.length; idx += 1) {
    const group = ROUTE_GROUPS[idx];
    const tempFile = path.join(os.tmpdir(), `openapi-partial-${idx}.json`);
    const sourceFile = path.join(ROOT_DIR, group.file);

    try {
        // eslint-disable-next-line no-await-in-loop
        await swaggerAutogen(tempFile, [sourceFile], doc);
        // eslint-disable-next-line no-await-in-loop
        const partial = JSON.parse(await fs.promises.readFile(tempFile, 'utf8'));
        Object.assign(mergedPaths, applyPrefix(partial.paths || {}, group.prefix));
    } catch (error) {
        log('DOCS', `No se pudieron analizar las rutas de ${group.file}: ${error.message}`, 'error');
        success = false;
    } finally {
        // eslint-disable-next-line no-await-in-loop
        await fs.promises.rm(tempFile, { force: true });
    }
}

CATALOG_SLUGS.forEach((slug) => {
    Object.assign(mergedPaths, buildCatalogOperations(slug));
});

if (success) {
    const finalDoc = { ...doc, paths: mergedPaths };
    try {
        fs.mkdirSync(path.dirname(OUTPUT_FILE), { recursive: true });
        fs.writeFileSync(OUTPUT_FILE, JSON.stringify(finalDoc, null, 4));
        log('DOCS', `Especificación generada en ${path.relative(ROOT_DIR, OUTPUT_FILE).replace(/\\/g, '/')} (${Object.keys(mergedPaths).length} rutas documentadas).`);
    } catch (error) {
        log('DOCS', `Error al escribir la especificación: ${error.message}`, 'error');
        process.exitCode = 1;
    }
}