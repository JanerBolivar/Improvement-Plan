import mongoose from 'mongoose';

/**
 * SubActivityTracking Schema - Registro de seguimiento semestral de una subactividad.
 *
 * Campos principales:
 * - `activity` (ObjectId → `Activity`, requerido) - Hallazgo propietario.
 * - `subActivityId` (ObjectId, requerido) - Subactividad a la que se da seguimiento.
 * - `year` (Number, requerido) - Periodo anual del registro.
 * - `firstSemesterDate` / `secondSemesterDate` (Date, por defecto `null`) - Fechas de seguimiento por semestre.
 * - `evidenceDescription` / `evidencePdfUrl` (String) - Descripción y URL del documento de soporte en S3.
 * - `firstSemesterAdvance` / `secondSemesterAdvance` (Number, por defecto `null`) - Avance cuantitativo por semestre.
 * - `firstSemesterObservations` / `secondSemesterObservations` (String) - Observaciones por semestre.
 *
 * Opciones: `timestamps: true` y `versionKey: false`.
 *
 * @type {import('mongoose').Schema}
 */
const subActivityTrackingSchema = new mongoose.Schema({
    activity: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Activity',
        required: true
    },
    subActivityId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true
    },
    year: {
        type: Number,
        required: true
    },
    firstSemesterDate: {
        type: Date,
        default: null
    },
    secondSemesterDate: {
        type: Date,
        default: null
    },
    evidenceDescription: {
        type: String,
        default: ''
    },
    evidencePdfUrl: {
        type: String,
        default: ''
    },
    firstSemesterAdvance: {
        type: Number,
        default: null
    },
    secondSemesterAdvance: {
        type: Number,
        default: null
    },
    firstSemesterObservations: {
        type: String,
        default: ''
    },
    secondSemesterObservations: {
        type: String,
        default: ''
    }
}, {
    timestamps: true,
    versionKey: false
});

/**
 * Restricción de integridad en la capa de persistencia:
 * Implementación de un índice compuesto único que previene la existencia de múltiples registros de seguimiento
 * para una misma subactividad dentro del mismo periodo anual, garantizando consistencia transaccional.
 */
subActivityTrackingSchema.index({ subActivityId: 1, year: 1 }, { unique: true });

/**
 * Modelo Mongoose `SubActivityTracking` (colección `subactivitytrackings`).
 * @type {import('mongoose').Model<import('mongoose').Document>}
 */
const SubActivityTracking = mongoose.model('SubActivityTracking', subActivityTrackingSchema);
export default SubActivityTracking;
