import mongoose from 'mongoose';

/**
 * FactorProg Schema - Catálogo de factores de programa.
 *
 * Campos: `code` (String, requerido, único), `name` (String, requerido, único)
 * y `description` (String). Opciones: `timestamps: true`.
 *
 * @type {import('mongoose').Schema}
 */
const factorProgSchema = new mongoose.Schema({
    code: { type: String, required: true, unique: true },
    name: { type: String, required: true, unique: true },
    description: { type: String }
}, { timestamps: true });

/**
 * Hook `post('save')` - Convierte el error de duplicado (E11000) en un
 * mensaje amigable cuando el código o nombre del factor ya existen.
 *
 * @param {Error} error - Error devuelto por MongoDB.
 * @param {Object} doc - Documento que provocó el error.
 * @param {Function} next - Continúa la cadena con el mensaje personalizado.
 * @returns {void}
 */
factorProgSchema.post('save', function(error, doc, next) {
    if (error.name === 'MongoServerError' && error.code === 11000) {
        next(new Error('Ya existe un factor de programa con este código o nombre.'));
    } else next(error);
});

/**
 * Modelo Mongoose `FactorProg` (colección `factorprogs`).
 * @type {import('mongoose').Model<import('mongoose').Document>}
 */
export default mongoose.model('FactorProg', factorProgSchema);
