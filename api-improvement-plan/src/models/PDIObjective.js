import mongoose from 'mongoose';

/**
 * PDIObjective Schema - Objetivos estratégicos del PDI.
 *
 * Campos: `program` (ObjectId → `PDIProgram`, requerido) - Programa estratégico padre;
 * `code` (String, requerido, ej. `L1.P1.O1`); `name` (String, requerido, único);
 * `description` (String). Opciones: `timestamps: true`.
 *
 * @type {import('mongoose').Schema}
 */
const pdiObjectiveSchema = new mongoose.Schema({
    program: { type: mongoose.Schema.Types.ObjectId, ref: 'PDIProgram', required: true },
    code: { type: String, required: true }, // Ej: L1.P1.O1
    name: { type: String, required: true, unique: true },
    description: { type: String }
}, { timestamps: true });

/**
 * Hook `post('save')` - Convierte el error de duplicado (E11000) en un
 * mensaje amigable cuando el objetivo estratégico ya existe.
 *
 * @param {Error} error - Error devuelto por MongoDB.
 * @param {Object} doc - Documento que provocó el error.
 * @param {Function} next - Continúa la cadena con el mensaje personalizado.
 * @returns {void}
 */
pdiObjectiveSchema.post('save', function(error, doc, next) {
    if (error.name === 'MongoServerError' && error.code === 11000) {
        next(new Error('Ya existe un objetivo estratégico con este nombre o código.'));
    } else next(error);
});

/**
 * Modelo Mongoose `PDIObjective` (colección `pdiobjectives`).
 * @type {import('mongoose').Model<import('mongoose').Document>}
 */
export default mongoose.model('PDIObjective', pdiObjectiveSchema);
