import log from '../utils/logger.js';

/**
 * Middleware manejador de rutas no encontradas (404).
 *
 * Se registra al final de la cadena de rutas: marca el estado de la respuesta
 * como 404 y delega un `Error` en el siguiente middleware (`errorHandler`).
 *
 * @param {import('express').Request} req - Petición recibida (usa `req.originalUrl` para el mensaje).
 * @param {import('express').Response} res - Respuesta cuyo status se fija en 404.
 * @param {import('express').NextFunction} next - Pasa el error generado al manejador global.
 * @returns {void}
 */
export const notFound = (req, res, next) => {
    const error = new Error(`Ruta no encontrada - ${req.originalUrl}`);
    res.status(404);
    next(error);
};

/**
 * Middleware manejador de errores global (último de la cadena).
 *
 * Normaliza la respuesta de error en formato JSON `{ success, message, stack }`.
 * Reglas de mapeo: un `CastError` de ObjectId de MongoDB se convierte en 404,
 * un código de duplicado `11000` en 400; en cualquier otro caso conserva el
 * status previamente fijado o asume 500. La traza solo se incluye fuera de
 * producción. Registra el error con el logger interno.
 *
 * @param {Error & {name?: string, kind?: string, code?: number, stack?: string}} err - Error capturado.
 * @param {import('express').Request} req - Petición asociada al error.
 * @param {import('express').Response} res - Respuesta sobre la que se envía el JSON de error.
 * @param {import('express').NextFunction} next - Siguiente middleware (requerido por la firma de Express).
 * @returns {void}
 * @response {400} - Datos duplicados o inválidos.
 * @response {404} - Identificador no válido (`CastError`).
 * @response {500} - Error interno no clasificado.
 */
export const errorHandler = (err, req, res, next) => {
    let statusCode = res.statusCode === 200 ? 500 : res.statusCode;
    let message = err.message;

    // Manejo de errores específicos de MongoDB
    if (err.name === 'CastError' && err.kind === 'ObjectId') {
        statusCode = 404;
        message = 'Recurso no encontrado';
    } else if (err.code === 11000) {
        statusCode = 400;
        message = 'Error: Ya existe un registro con estos datos duplicados.';
    }

    log('ERROR', `${req.method} ${req.url} - ${message}`, 'error');

    res.status(statusCode).json({
        success: false,
        message,
        stack: process.env.NODE_ENV === 'production' ? null : err.stack,
    });
};
