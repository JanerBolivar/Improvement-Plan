import User from '../models/User.js';
import { generateToken } from '../utils/token.js';

/**
 * Autentica o registra automáticamente a un usuario mediante SSO institucional.
 *
 * Recibe en `req.body` el objeto `{ token, user }` del SSO, extrae y normaliza
 * el correo, nombre, rol y estado, y realiza un `findOneAndUpdate` con `upsert`
 * sobre la colección `users` (crea el usuario si no existe). Emite el token
 * JWT firmado junto con el documento del usuario.
 *
 * @route POST /api/users/sso-login
 * @access Público.
 * @param {import('express').Request} req - Petición; `req.body` con `token` y `user` (con `email` obligatorio).
 * @param {import('express').Response} res - Respuesta JSON.
 * @param {import('express').NextFunction} next - Delega errores no capturados al manejador global.
 * @returns {Promise<void>}
 * @response {200} - `{ success: true, data: { token, user } }`.
 * @response {400} - Faltan datos de SSO (`token`, `user` o `user.email`).
 */
export const ssoLogin = async (req, res, next) => {
    try {
        const { token: ssoToken, user: ssoUser } = req.body;

        if (!ssoToken || !ssoUser || !ssoUser.email) {
            return res.status(400).json({ success: false, message: 'Datos de SSO requeridos' });
        }

        const email = ssoUser.email.toLowerCase().trim();
        const rawRole = (ssoUser.role || 'teacher').toLowerCase();
        const rawStatus = (ssoUser.status || 'active').toLowerCase();

        const updateData = {
            email,
            fullName: ssoUser.fullName || `${ssoUser.firstName} ${ssoUser.lastName}`,
            firstName: ssoUser.firstName || ssoUser.fullName?.split(' ')[0],
            lastName: ssoUser.lastName || ssoUser.fullName?.split(' ').slice(1).join(' '),
            oid: ssoUser.oid || ssoUser.id,
            role: rawRole,
            status: ['active', 'inactive'].includes(rawStatus) ? rawStatus : 'active'
        };

        // El rol solo se establece en la creación, no se sobrescribe en cada login
        // a menos que sea un campo que el SSO controle estrictamente.
        let user = await User.findOneAndUpdate(
            { email },
            { $set: updateData },
            { new: true, upsert: true, setDefaultsOnInsert: true }
        );

        res.json({
            success: true,
            data: {
                token: generateToken(user),
                user
            }
        });
    } catch (error) { next(error); }
};

/**
 * Obtiene todos los usuarios (Admin ve todos, Coordinador solo su programa).
 *
 * Consulta la colección `users` con `find` y `populate('program')`. Si el
 * usuario autenticado es `coordinator`, restringe el filtro a su
 * `req.user.program` y devuelve una lista vacía si no tiene programa asignado.
 *
 * @route GET /api/users
 * @access Privado (Admin, Coordinator).
 * @param {import('express').Request} req - Petición; usa `req.user.role` y `req.user.program`.
 * @param {import('express').Response} res - Respuesta JSON con la lista de usuarios.
 * @param {import('express').NextFunction} next - Delega errores al manejador global.
 * @returns {Promise<void>}
 * @response {200} - `{ success: true, data: User[] }`.
 */
export const getUsers = async (req, res, next) => {
    try {
        let query = {};
        if (req.user.role === 'coordinator') {
            if (!req.user.program) return res.json({ success: true, data: [] });
            query = { program: req.user.program };
        }

        const users = await User.find(query).populate('program');
        res.json({ success: true, data: users });
    } catch (error) { next(error); }
};

/**
 * Actualiza un usuario existente por su identificador.
 *
 * Busca el documento en la colección `users` mediante `findById` y aplica los
 * campos de `req.body` con `findByIdAndUpdate`. Un `coordinator` solo puede
 * modificar usuarios pertenecientes a su mismo programa.
 *
 * @route PUT /api/users/:id
 * @access Privado (Admin, Coordinator).
 * @param {import('express').Request} req - Petición; `req.params.id` y `req.body` con los campos a actualizar.
 * @param {import('express').Response} res - Respuesta JSON con el usuario actualizado.
 * @param {import('express').NextFunction} next - Delega errores al manejador global.
 * @returns {Promise<void>}
 * @response {200} - `{ success: true, data: User }`.
 * @response {403} - El coordinador intenta modificar un usuario de otro programa.
 * @response {404} - Usuario no encontrado.
 */
export const updateUser = async (req, res, next) => {
    try {
        const userToUpdate = await User.findById(req.params.id);
        if (!userToUpdate) return res.status(404).json({ success: false, message: 'Usuario no encontrado' });

        if (req.user.role === 'coordinator' && userToUpdate.program?.toString() !== req.user.program?.toString()) {
            return res.status(403).json({ success: false, message: 'Sin permisos sobre este usuario' });
        }

        const user = await User.findByIdAndUpdate(req.params.id, req.body, { new: true });
        res.json({ success: true, data: user });
    } catch (error) { next(error); }
};

/**
 * Busca usuarios por nombre o email (para asignación de responsables).
 *
 * Ejecuta una consulta `find` con `$regex` insensible a mayúsculas sobre
 * `firstName`, `lastName` y `email` en la colección `users`, limitando el
 * resultado a 10 documentos y proyectando solo nombre y correo.
 *
 * @route GET /api/users/search
 * @access Privado.
 * @param {import('express').Request} req - Petición; `req.query.query` con el texto de búsqueda.
 * @param {import('express').Response} res - Respuesta JSON con los usuarios coincidentes.
 * @param {import('express').NextFunction} next - Delega errores al manejador global.
 * @returns {Promise<void>}
 * @response {200} - `{ success: true, data: User[] }`; lista vacía si no se envía `query`.
 */
export const searchUsers = async (req, res, next) => {
    try {
        const { query } = req.query;
        if (!query) return res.json({ success: true, data: [] });

        const searchFilter = {
            $or: [
                { firstName: { $regex: query, $options: 'i' } },
                { lastName: { $regex: query, $options: 'i' } },
                { email: { $regex: query, $options: 'i' } }
            ]
        };

        const users = await User.find(searchFilter)
            .select('firstName lastName email')
            .limit(10);

        res.json({ success: true, data: users });
    } catch (error) { next(error); }
};

/**
 * Actualiza el programa del usuario autenticado.
 *
 * Realiza un `findByIdAndUpdate` sobre el usuario identificado por `req.user._id`
 * para asignarle `program` con el valor `programId` recibido en `req.body`,
 * retornando el documento poblado con `populate('program')`.
 *
 * @route PUT /api/users/me/program
 * @access Privado.
 * @param {import('express').Request} req - Petición; `req.user._id` y `req.body.programId`.
 * @param {import('express').Response} res - Respuesta JSON con el usuario actualizado.
 * @param {import('express').NextFunction} next - Delega errores al manejador global.
 * @returns {Promise<void>}
 * @response {200} - `{ success: true, data: User }`.
 * @response {400} - `ID de programa requerido` si falta `programId`.
 */
export const updateMyProgram = async (req, res, next) => {
    try {
        const { programId } = req.body;
        if (!programId) return res.status(400).json({ success: false, message: 'ID de programa requerido' });

        const user = await User.findByIdAndUpdate(
            req.user._id,
            { program: programId },
            { new: true }
        ).populate('program');

        res.json({ success: true, data: user });
    } catch (error) { next(error); }
};

/**
 * Obtiene la lista de coordinadores (para modal de programas).
 *
 * Consulta `users` con filtro `role` en `{ 'coordinator', 'admin' }` y
 * `status` igual a `'active'`, proyectando `firstName`, `lastName`, `fullName`
 * y `email`.
 *
 * @route GET /api/users/coordinators
 * @access Privado (Admin).
 * @param {import('express').Request} req - Petición del cliente autenticado.
 * @param {import('express').Response} res - Respuesta JSON con la lista de coordinadores.
 * @param {import('express').NextFunction} next - Delega errores al manejador global.
 * @returns {Promise<void>}
 * @response {200} - `{ success: true, data: User[] }`.
 */
export const getCoordinators = async (req, res, next) => {
    try {
        const coordinators = await User.find({ 
            role: { $in: ['coordinator', 'admin'] },
            status: 'active'
        }).select('firstName lastName fullName email');
        
        res.json({ success: true, data: coordinators });
    } catch (error) { next(error); }
};
