import jwt from 'jsonwebtoken';
import { SERVER_CONFIG } from '../config/envs.js';
import User from '../models/User.js';

/**
 * Middleware de autenticación JWT (`protect`).
 *
 * Se ejecuta antes de los controladores protegidos. Extrae el token de la
 * cabecera `Authorization: Bearer <token>`, lo verifica con el secreto JWT,
 * busca el usuario en la colección `users` (sin el campo `password`) y lo
 * adjunta a `req.user`. Invoca `next()` únicamente cuando la autenticación
 * es exitosa.
 *
 * @memberof module:middlewares/auth.middleware
 * @param {import('express').Request} req - Petición HTTP; se espera `req.headers.authorization`.
 * @param {import('express').Response} res - Respuesta HTTP utilizada si la validación falla.
 * @param {import('express').NextFunction} next - Siguiente middleware en la cadena.
 * @returns {Promise<void>} `undefined` si no hay token; responde y corta la cadena en caso de error.
 * @response {401} - `Token no válido o expirado`, `Usuario no encontrado` o `No hay token, acceso denegado`.
 */
export const protect = async (req, res, next) => {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            token = req.headers.authorization.split(' ')[1];
            const decoded = jwt.verify(token, SERVER_CONFIG.JWT_SECRET);
            
            req.user = await User.findById(decoded.id).select('-password');
            
            if (!req.user) {
                return res.status(401).json({ success: false, message: 'Usuario no encontrado' });
            }

            next();
        } catch (error) {
            return res.status(401).json({ success: false, message: 'Token no válido o expirado' });
        }
    }

    if (!token) {
        return res.status(401).json({ success: false, message: 'No hay token, acceso denegado' });
    }
};

/**
 * Middleware de autorización por roles (`authorize`).
 *
 * Debe ejecutarse después de `protect`, ya que depende de `req.user.role`.
 * Comprueba que el rol del usuario autenticado figure entre los roles
 * permitidos; si no coincide, responde 403 y detiene la cadena; en caso
 * contrario llama a `next()`.
 *
 * @memberof module:middlewares/auth.middleware
 * @param {...string} roles - Roles permitidos (`admin`, `coordinator`, `teacher`).
 * @returns {(req: import('express').Request, res: import('express').Response, next: import('express').NextFunction) => void} Middleware de Express.
 * @response {403} - Cuando el rol del usuario no está autorizado para la acción.
 */
export const authorize = (...roles) => {
    return (req, res, next) => {
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                message: `El rol ${req.user.role} no tiene permiso para esta acción`
            });
        }
        next();
    };
};
