import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { S3_CONFIG } from './envs.js';
import { randomUUID } from 'crypto';
import log from '../utils/logger.js';

/**
 * Módulo cliente de almacenamiento S3/MinIO.
 *
 * Valida las credenciales obligatorias al importarse, instancia el `S3Client`
 * de AWS SDK y expone utilidades para subir, eliminar y resolver claves de
 * objetos del bucket. Lanza un error en tiempo de carga si faltan
 * `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY` o `S3_BUCKET`.
 *
 * @module config/s3.client
 * @throws {Error} Si faltan credenciales o el nombre del bucket.
 */

if (!S3_CONFIG.ACCESS_KEY_ID || !S3_CONFIG.SECRET_ACCESS_KEY || !S3_CONFIG.BUCKET) {
    throw new Error('Faltan credenciales de S3 (S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY, S3_BUCKET).');
}

/**
 * Cliente S3 configurado contra el endpoint declarado en `S3_CONFIG`.
 * @type {import('@aws-sdk/client-s3').S3Client}
 */
const s3Client = new S3Client({
    endpoint: S3_CONFIG.ENDPOINT,
    region: S3_CONFIG.REGION,
    forcePathStyle: S3_CONFIG.FORCE_PATH_STYLE,
    credentials: {
        accessKeyId: S3_CONFIG.ACCESS_KEY_ID,
        secretAccessKey: S3_CONFIG.SECRET_ACCESS_KEY
    }
});

/**
 * Construye la URL pública de acceso a un objeto.
 * Formato path-style: `<endpoint>/<bucket>/<key>`.
 *
 * @param {string} key - Clave (ruta) del objeto dentro del bucket.
 * @returns {string} URL pública completa del objeto.
 */
export function buildPublicUrl(key) {
    return `${S3_CONFIG.ENDPOINT}/${S3_CONFIG.BUCKET}/${key}`;
}

/**
 * Genera una key jerárquica respetando las subcarpetas lógicas.
 * Ejemplo: `reports/pdfs/<uuid>-<filename>`.
 *
 * @param {string} folder - Carpeta raíz dentro del bucket.
 * @param {string} subfolder - Subcarpeta dentro de la carpeta raíz.
 * @param {string} filename - Nombre original del archivo.
 * @returns {string} Key única compuesta por UUID y nombre original.
 */
export function buildKey(folder, subfolder, filename) {
    return `${folder}/${subfolder}/${randomUUID()}-${filename}`;
}

/**
 * Sube un buffer al bucket y retorna la URL pública resultante.
 *
 * @param {Object} params - Parámetros del objeto a subir.
 * @param {string} params.key - Key destino dentro del bucket.
 * @param {Buffer} params.body - Contenido binario del archivo.
 * @param {string} params.contentType - Tipo MIME del contenido.
 * @returns {Promise<string>} URL pública del objeto subido.
 * @throws {Error} Si el servicio S3 rechaza la operación de escritura.
 */
export async function uploadToBucket({ key, body, contentType }) {
    const command = new PutObjectCommand({
        Bucket: S3_CONFIG.BUCKET,
        Key: key,
        Body: body,
        ContentType: contentType
    });
    await s3Client.send(command);
    return buildPublicUrl(key);
}

/**
 * Elimina un objeto del bucket.
 * Los objetos inexistentes se ignoran (no rompen la operación).
 *
 * @param {string} [key] - Key del objeto a eliminar; si se omite o es vacía, no hace nada.
 * @returns {Promise<void>} Se resuelve sin valor cuando la eliminación concluye.
 * @throws {Error} Si la eliminación falla por una causa distinta a un 404/`NoSuchKey`.
 */
export async function deleteFromBucket(key) {
    if (!key) return;
    const command = new DeleteObjectCommand({
        Bucket: S3_CONFIG.BUCKET,
        Key: key
    });
    try {
        await s3Client.send(command);
    } catch (error) {
        if (error?.$metadata?.httpStatusCode === 404 || error?.name === 'NoSuchKey') {
            log('S3', `Objeto no encontrado al eliminar (ignorado): ${key}`, 'warn');
            return;
        }
        throw error;
    }
}

/**
 * Extrae la key del objeto a partir de la URL guardada en Mongo.
 * Soporta la URL path-style nueva y los legacy `/public/...` y `/uploads/...`.
 *
 * @param {string} [url=''] - URL almacenada del objeto.
 * @returns {string|null} La key extraída o `null` si la URL no es interpretable.
 */
export function extractKeyFromUrl(url = '') {
    if (!url) return null;
    const clean = String(url).trim();

    const pathStyle = clean.match(new RegExp(`^${S3_CONFIG.ENDPOINT}/${S3_CONFIG.BUCKET}/(.+)$`));
    if (pathStyle) return pathStyle[1];

    if (!clean.includes('://')) {
        const legacy = clean.match(/^\/(?:public|uploads)\/(.+)$/);
        return legacy ? legacy[1] : null;
    }

    return null;
}

/**
 * Cliente S3 por defecto, exportado para operaciones puntuales fuera de este módulo.
 * @type {import('@aws-sdk/client-s3').S3Client}
 */
export default s3Client;