import mongoose from 'mongoose';

/**
 * PDIProgram Schema - Programas estratégicos del PDI.
 *
 * Campos: `line` (ObjectId → `PDILine`, requerido) - Línea estratégica padre;
 * `code` (String, requerido, ej. `L1.P1`); `name` (String, requerido, único);
 * `description` (String). Opciones: `timestamps: true`.
 *
 * @type {import('mongoose').Schema}
 */
const pdiProgramSchema = new mongoose.Schema({
    line: { type: mongoose.Schema.Types.ObjectId, ref: 'PDILine', required: true },
    code: { type: String, required: true }, // Ej: L1.P1
    name: { type: String, required: true, unique: true },
    description: { type: String }
}, { timestamps: true });

/**
 * Hook `post('save')` - Convierte el error de duplicado (E11000) en un
 * mensaje amigable cuando el programa estratégico ya existe.
 *
 * @param {Error} error - Error devuelto por MongoDB.
 * @param {Object} doc - Documento que provocó el error.
 * @param {Function} next - Continúa la cadena con el mensaje personalizado.
 * @returns {void}
 */
pdiProgramSchema.post('save', function(error, doc, next) {
    if (error.name === 'MongoServerError' && error.code === 11000) {
        next(new Error('Ya existe un programa estratégico con este nombre o código.'));
    } else next(error);
});

/**
 * Modelo Mongoose `PDIProgram` (colección `pdiprograms`).
 * @type {import('mongoose').Model<import('mongoose').Document>}
 */
export default mongoose.model('PDIProgram', pdiProgramSchema);
