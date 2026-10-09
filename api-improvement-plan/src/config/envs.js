/**
 * Módulo de configuración central del backend.
 *
 * Carga las variables de entorno mediante `dotenv` (archivo `.env` en la raíz del
 * proyecto) y las expone agrupadas en tres constantes: `SERVER_CONFIG`,
 * `DB_CREDENTIALS` y `S3_CONFIG`. No expone valores, únicamente los consume.
 *
 * Variables de entorno consumidas:
 * - `PORT` - Puerto HTTP del servidor (por defecto 3001).
 * - `JWT_SECRET` - Clave secreada usada para firmar y verificar los tokens JWT.
 * - `FRONTEND_URL` - Origen permitido en CORS para el cliente web.
 * - `MONGODB_URI` - URI de conexión a MongoDB.
 * - `S3_ENDPOINT` - Endpoint del servicio S3/MinIO.
 * - `S3_REGION` - Región del servicio S3.
 * - `S3_ACCESS_KEY_ID` - Identificador de acceso al bucket S3.
 * - `S3_SECRET_ACCESS_KEY` - Clave secreta de acceso al bucket S3.
 * - `S3_BUCKET` - Nombre del bucket de almacenamiento.
 * - `S3_FORCE_PATH_STYLE` - Indica si se fuerza el estilo path-style (`'false'` lo desactiva).
 *
 * @module config/envs
 */

/**
 * Configuración general del servidor HTTP.
 * @namespace SERVER_CONFIG
 * @property {number|string} PORT - Puerto de escucha del servidor (por defecto 3001).
 * @property {string|undefined} JWT_SECRET - Secreto para la firma de tokens JWT.
 * @property {string} FRONTEND_URL - URL del frontend permitida en CORS (por defecto http://localhost:5173).
 */
export const SERVER_CONFIG = {
    PORT: process.env.PORT || 3001,
    JWT_SECRET: process.env.JWT_SECRET,
    FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:5173',
};

/**
 * Credenciales y opciones de conexión a MongoDB.
 * @namespace DB_CREDENTIALS
 * @property {string} URI - URI de conexión obtenida de la variable `MONGODB_URI`.
 * @property {{autoIndex: boolean}} OPTIONS - Opciones de conexión (creación automática de índices).
 */
export const DB_CREDENTIALS = {
    URI: process.env.MONGODB_URI,
    OPTIONS: {
        autoIndex: true,
    }
};

/**
 * Configuración del cliente de almacenamiento de objetos S3/MinIO.
 * @namespace S3_CONFIG
 * @property {string} ENDPOINT - Endpoint del servicio (`S3_ENDPOINT`).
 * @property {string} REGION - Región del servicio (`S3_REGION`, por defecto us-east-1).
 * @property {string|undefined} ACCESS_KEY_ID - Identificador de acceso (`S3_ACCESS_KEY_ID`).
 * @property {string|undefined} SECRET_ACCESS_KEY - Clave secreta de acceso (`S3_SECRET_ACCESS_KEY`).
 * @property {string|undefined} BUCKET - Nombre del bucket (`S3_BUCKET`).
 * @property {boolean} FORCE_PATH_STYLE - `true` salvo que `S3_FORCE_PATH_STYLE` sea `'false'`.
 */
export const S3_CONFIG = {
    ENDPOINT: process.env.S3_ENDPOINT || 'http://localhost:9000',
    REGION: process.env.S3_REGION || 'us-east-1',
    ACCESS_KEY_ID: process.env.S3_ACCESS_KEY_ID,
    SECRET_ACCESS_KEY: process.env.S3_SECRET_ACCESS_KEY,
    BUCKET: process.env.S3_BUCKET,
    FORCE_PATH_STYLE: process.env.S3_FORCE_PATH_STYLE !== 'false'
};
