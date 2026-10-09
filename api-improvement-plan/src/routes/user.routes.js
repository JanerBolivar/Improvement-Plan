/**
 * Definición de rutas de usuarios.
 *
 * Agrupa los endpoints de autenticación SSO, búsqueda, consulta y
 * actualización de usuarios. Los prefijos de montaje en `src/app.js` son
 * `/api/users`.
 */
import express from 'express';
import { ssoLogin, getUsers, updateUser, searchUsers, getCoordinators, updateMyProgram } from '../controllers/user.controller.js';
import { protect, authorize } from '../middlewares/auth.middleware.js';

const router = express.Router();

/**
 * POST /api/users/sso-login - Autentica o registra un usuario mediante SSO institucional. Acceso público.
 * Controlador: `ssoLogin`.
 */
router.post('/sso-login',
    /* #swagger.tags = ['Usuarios']
       #swagger.summary = 'Autenticación o registro mediante SSO institucional'
       #swagger.description = 'Recibe el token y el perfil emitidos por el SSO institucional, valida la sesión y crea o actualiza el usuario correspondiente.'
       #swagger.requestBody = { required: true, content: { 'application/json': { schema: { type: 'object', required: ['token', 'user'], properties: { token: { type: 'string' }, user: { type: 'object', properties: { email: { type: 'string' }, fullName: { type: 'string' }, role: { type: 'string' } } } } } } } }
       #swagger.responses[200] = { description: 'Autenticación exitosa. Devuelve el token JWT y el perfil del usuario.' }
       #swagger.responses[401] = { description: 'Credenciales SSO inválidas o inexistentes.' } */
    ssoLogin);

/**
 * GET /api/users/search - Busca usuarios por nombre o correo. Requiere autenticación (`protect`).
 * Controlador: `searchUsers`.
 */
router.get('/search',
    /* #swagger.tags = ['Usuarios']
       #swagger.summary = 'Busca usuarios por nombre o correo'
       #swagger.description = 'Busca usuarios por su nombre completo o correo electrónico. Requiere autenticación.'
       #swagger.security = [{ bearerAuth: [] }]
       #swagger.parameters = [{ name: 'query', in: 'query', required: true, description: 'Texto de búsqueda (nombre o correo).', schema: { type: 'string' } }]
       #swagger.responses[200] = { description: 'Lista de usuarios coincidentes.' }
       #swagger.responses[401] = { description: 'No autenticado.' } */
    protect,
    searchUsers);

/**
 * GET /api/users/coordinators - Obtiene la lista de coordinadores activos. Requiere rol `admin`.
 * Controlador: `getCoordinators`.
 */
router.get('/coordinators',
    /* #swagger.tags = ['Usuarios']
       #swagger.summary = 'Lista los coordinadores activos'
       #swagger.description = 'Obtiene la lista de usuarios con rol de coordinador y estado activo. Restringido al rol admin.'
       #swagger.security = [{ bearerAuth: [] }]
       #swagger.responses[200] = { description: 'Lista de coordinadores activos.' }
       #swagger.responses[401] = { description: 'No autenticado.' }
       #swagger.responses[403] = { description: 'Sin permisos de administrador.' } */
    protect,
    authorize('admin'),
    getCoordinators);

/**
 * PUT /api/users/me/program - Actualiza el programa vinculado al usuario autenticado. Requiere autenticación.
 * Controlador: `updateMyProgram`.
 */
router.put('/me/program',
    /* #swagger.tags = ['Usuarios']
       #swagger.summary = 'Asigna el programa del usuario autenticado'
       #swagger.description = 'Actualiza el programa vinculado al usuario autenticado mediante el identificador de programa recibido en el cuerpo.'
       #swagger.security = [{ bearerAuth: [] }]
       #swagger.requestBody = { required: true, content: { 'application/json': { schema: { type: 'object', properties: { programId: { type: 'string', description: 'Identificador del programa a asignar.' } } } } } }
       #swagger.responses[200] = { description: 'Programa asignado correctamente.' }
       #swagger.responses[401] = { description: 'No autenticado.' }
       #swagger.responses[404] = { description: 'Programa no encontrado.' } */
    protect,
    updateMyProgram);

/**
 * GET /api/users - Obtiene la lista de usuarios. Requiere rol `admin` o `coordinator`.
 * Controlador: `getUsers`.
 */
router.get('/',
    /* #swagger.tags = ['Usuarios']
       #swagger.summary = 'Lista los usuarios del sistema'
       #swagger.description = 'Obtiene la lista de usuarios del sistema. Un administrador ve todos los usuarios; un coordinador únicamente los de su programa.'
       #swagger.security = [{ bearerAuth: [] }]
       #swagger.responses[200] = { description: 'Lista de usuarios.' }
       #swagger.responses[401] = { description: 'No autenticado.' }
       #swagger.responses[403] = { description: 'Sin permisos para listar usuarios.' } */
    protect,
    authorize('admin', 'coordinator'),
    getUsers);

/**
 * PUT /api/users/:id - Actualiza un usuario por identificador. Requiere rol `admin` o `coordinator`.
 * Controlador: `updateUser`.
 */
router.put('/:id',
    /* #swagger.tags = ['Usuarios']
       #swagger.summary = 'Actualiza un usuario'
       #swagger.description = 'Actualiza los datos de un usuario por identificador. Un coordinador solo puede actualizar usuarios de su propio programa.'
       #swagger.security = [{ bearerAuth: [] }]
       #swagger.parameters = [{ name: 'id', in: 'path', required: true, description: 'Identificador del usuario.', schema: { type: 'string' } }]
       #swagger.requestBody = { required: true, content: { 'application/json': { schema: { type: 'object', properties: { fullName: { type: 'string' }, email: { type: 'string' }, role: { type: 'string' }, status: { type: 'string' }, program: { type: 'string' } } } } } }
       #swagger.responses[200] = { description: 'Usuario actualizado.' }
       #swagger.responses[401] = { description: 'No autenticado.' }
       #swagger.responses[403] = { description: 'Sin permisos sobre el usuario.' }
       #swagger.responses[404] = { description: 'Usuario no encontrado.' } */
    protect,
    authorize('admin', 'coordinator'),
    updateUser);

export default router;