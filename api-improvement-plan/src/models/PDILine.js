import mongoose from 'mongoose';

/**
 * PDILine Schema - Líneas estratégicas del Plan de Desarrollo Institucional (PDI).
 *
 * Campos: `code` (String, requerido, único), `name` (String, requerido, único)
 * y `description` (String). Opciones: `timestamps: true`.
 *
 * @type {import('mongoose').Schema}
 */
const pdiLineSchema = new mongoose.Schema({
    code: { type: String, required: true, unique: true },
    name: { type: String, required: true, unique: true },
    description: { type: String }
}, { timestamps: true });

/**
 * Hook `post('save')` - Convierte el error de duplicado (E11000) en un
 * mensaje amigable cuando la línea estratégica ya existe.
 *
 * @param {Error} error - Error devuelto por MongoDB.
 * @param {Object} doc - Documento que provocó el error.
 * @param {Function} next - Continúa la cadena con el mensaje personalizado.
 * @returns {void}
 */
pdiLineSchema.post('save', function(error, doc, next) {
    if (error.name === 'MongoServerError' && error.code === 11000) {
        next(new Error('Ya existe una línea estratégica con este código o nombre.'));
    } else next(error);
});

/**
 * Modelo Mongoose `PDILine` (colección `pdilines`).
 * @type {import('mongoose').Model<import('mongoose').Document>}
 */
export default mongoose.model('PDILine', pdiLineSchema);
