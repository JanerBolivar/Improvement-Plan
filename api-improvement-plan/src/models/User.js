import mongoose from 'mongoose';
import crypto from 'crypto';

/**
 * User Schema - Mapea el payload del SSO y la información del usuario en el sistema.
 *
 * Campos principales:
 * - `uuid` (String) - Identificador interno generado con `crypto.randomUUID()`.
 * - `oid` (String, único, sparse) - Identificador del proveedor SSO.
 * - `email` (String, único, requerido) - Correo electrónico normalizado a minúsculas.
 * - `fullName`, `firstName`, `lastName` (String) - Nombre completo y sus partes.
 * - `role` (enum: `admin` | `coordinator` | `teacher`, por defecto `teacher`) - Rol del usuario.
 * - `status` (enum: `active` | `inactive`, por defecto `active`) - Estado de la cuenta.
 * - `program` (ObjectId → `Program`, por defecto `null`) - Programa al que está adscrito.
 *
 * Opciones: `timestamps: true` y `versionKey: false`.
 *
 * @type {import('mongoose').Schema}
 */
const userSchema = new mongoose.Schema({
    uuid: {
        type: String,
        default: () => crypto.randomUUID()
    },
    oid: {
        type: String,
        unique: true,
        sparse: true
    },
    email: {
        type: String,
        required: [true, 'El correo electrónico es obligatorio'],
        unique: true,
        lowercase: true,
        trim: true
    },
    fullName: {
        type: String,
        required: [true, 'El nombre completo es obligatorio']
    },
    firstName: { type: String },
    lastName: { type: String },
    role: {
        type: String,
        enum: ['admin', 'coordinator', 'teacher'],
        default: 'teacher'
    },
    status: {
        type: String,
        enum: ['active', 'inactive'],
        default: 'active'
    },
    program: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Program',
        default: null
    }
}, {
    timestamps: true,
    versionKey: false
});

/**
 * Hook `post('save')` - Manejo amigable de errores de duplicados (E11000).
 * Convierte el error de clave duplicada en un mensaje legible según el campo
 * afectado (`email` u `oid`) antes de propagarlo al siguiente middleware.
 *
 * @param {Error} error - Error devuelto por MongoDB.
 * @param {Object} doc - Documento que provocó el error.
 * @param {Function} next - Continúa la cadena de errores con el mensaje personalizado.
 * @returns {void}
 */
userSchema.post('save', function (error, doc, next) {
    if (error.name === 'MongoServerError' && error.code === 11000) {
        const field = Object.keys(error.keyPattern)[0];
        const msg = field === 'email' ? 'Este correo ya está registrado.' : 'Este identificador (OID) ya pertenece a otro usuario.';
        next(new Error(msg));
    } else {
        next(error);
    }
});

/**
 * Modelo Mongoose `User` (colección `users`).
 * @type {import('mongoose').Model<import('mongoose').Document & Object>}
 */
const User = mongoose.model('User', userSchema);
export default User;
