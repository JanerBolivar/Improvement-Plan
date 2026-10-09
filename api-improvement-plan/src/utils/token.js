import jwt from 'jsonwebtoken';
import { SERVER_CONFIG } from '../config/envs.js';

/**
 * Genera un JWT firmado para un usuario autenticado.
 * El payload incluye `id`, `role` y `email`, y el token expira en 8 horas.
 * Usa el secreto definido en `SERVER_CONFIG.JWT_SECRET`.
 *
 * @param {Object} user - Objeto del usuario (debe contener `_id`, `role` y `email`).
 * @param {import('mongoose').Types.ObjectId|string} user._id - Identificador del usuario.
 * @param {string} user.role - Rol del usuario (`admin`, `coordinator` o `teacher`).
 * @param {string} user.email - Correo electrónico del usuario.
 * @returns {string} Token JWT firmado.
 */
export const generateToken = (user) => {
    return jwt.sign(
        { id: user._id, role: user.role, email: user.email },
        SERVER_CONFIG.JWT_SECRET,
        { expiresIn: '8h' }
    );
};
