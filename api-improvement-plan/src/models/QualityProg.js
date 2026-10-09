import mongoose from 'mongoose';

/**
 * QualityProg Schema - Catálogo de condiciones de calidad de programa.
 *
 * Campos: `code` (String, requerido, único), `name` (String, requerido, único)
 * y `description` (String). Opciones: `timestamps: true`.
 *
 * @type {import('mongoose').Schema}
 */
const qualityProgSchema = new mongoose.Schema({
    code: { type: String, required: true, unique: true },
    name: { type: String, required: true, unique: true },
    description: { type: String }
}, { timestamps: true });

/**
 * Hook `post('save')` - Convierte el error de duplicado (E11000) en un
 * mensaje amigable cuando la condición de calidad ya existe.
 *
 * @param {Error} error - Error devuelto por MongoDB.
 * @param {Object} doc - Documento que provocó el error.
 * @param {Function} next - Continúa la cadena con el mensaje personalizado.
 * @returns {void}
 */
qualityProgSchema.post('save', function(error, doc, next) {
    if (error.name === 'MongoServerError' && error.code === 11000) {
        next(new Error('Ya existe una condición de calidad de programa con este código o nombre.'));
    } else next(error);
});

/**
 * Modelo Mongoose `QualityProg` (colección `qualityprogs`).
 * @type {import('mongoose').Model<import('mongoose').Document>}
 */
export default mongoose.model('QualityProg', qualityProgSchema);
