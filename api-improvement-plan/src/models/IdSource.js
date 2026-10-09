import mongoose from 'mongoose';

/**
 * IdSource Schema - Catálogo de fuentes de identificación de hallazgos.
 *
 * Campos: `name` (String, requerido, único) y `description` (String).
 * Opciones: `timestamps: true`.
 *
 * @type {import('mongoose').Schema}
 */
const idSourceSchema = new mongoose.Schema({
    name: { type: String, required: true, unique: true },
    description: { type: String }
}, { timestamps: true });

/**
 * Hook `post('save')` - Convierte el error de duplicado (E11000) en un
 * mensaje amigable cuando la fuente de identificación ya existe.
 *
 * @param {Error} error - Error devuelto por MongoDB.
 * @param {Object} doc - Documento que provocó el error.
 * @param {Function} next - Continúa la cadena con el mensaje personalizado.
 * @returns {void}
 */
idSourceSchema.post('save', function(error, doc, next) {
    if (error.name === 'MongoServerError' && error.code === 11000) {
        next(new Error('Ya existe una fuente de identificación con este nombre.'));
    } else next(error);
});

/**
 * Modelo Mongoose `IdSource` (colección `idsources`).
 * @type {import('mongoose').Model<import('mongoose').Document>}
 */
export default mongoose.model('IdSource', idSourceSchema);
