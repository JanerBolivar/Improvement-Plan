import mongoose from 'mongoose';

/**
 * Campus Schema - Catálogo de sedes institucionales.
 *
 * Campos: `name` (String, requerido, único) y `description` (String).
 * Opciones: `timestamps: true`.
 *
 * @type {import('mongoose').Schema}
 */
const campusSchema = new mongoose.Schema({
    name: { type: String, required: true, unique: true },
    description: { type: String }
}, { timestamps: true });

/**
 * Hook `post('save')` - Convierte el error de duplicado (E11000) en un
 * mensaje amigable cuando la sede ya existe.
 *
 * @param {Error} error - Error devuelto por MongoDB.
 * @param {Object} doc - Documento que provocó el error.
 * @param {Function} next - Continúa la cadena con el mensaje personalizado.
 * @returns {void}
 */
campusSchema.post('save', function(error, doc, next) {
    if (error.name === 'MongoServerError' && error.code === 11000) {
        next(new Error('Ya existe una sede con este nombre.'));
    } else next(error);
});

/**
 * Modelo Mongoose `Campus` (colección `campuses`).
 * @type {import('mongoose').Model<import('mongoose').Document>}
 */
export default mongoose.model('Campus', campusSchema);
