import mongoose from 'mongoose';

/**
 * Sub-esquema para las Actividades Individuales (subactividades).
 * Contiene la información técnica y operativa denormalizada.
 *
 * Campos principales:
 * - `description`, `responsibleUnit`, `indicatorName`, `productEvidence`, `resourceDescription` (String, requeridos).
 * - `baseline` (Number, por defecto `null`) - Línea base de referencia.
 * - `campus`, `identificationSource`, `pdiLine`, `pdiProgram`, `pdiObjective`, `qualityFactor` (String) - Clasificaciones.
 * - `resources` (Array de enum: `Humano` | `Financiero` | `Físico` | `Tecnológico`) - Recursos requeridos.
 * - `annualGoals` (Array de `{ yearIndex, label, value }`) - Metas por año de vigencia.
 * - `startDate` / `endDate` (Date, requeridos) - Periodo de ejecución.
 *
 * Conserva `_id` propio por subactividad (`{ _id: true }`).
 *
 * @type {import('mongoose').Schema}
 */
const subActivitySchema = new mongoose.Schema({
    description: { type: String, required: true },
    responsibleUnit: { type: String, required: true },
    indicatorName: { type: String, required: true },
    /**
     * Línea base: valor de referencia previo al inicio del plan.
     * Funciona como benchmark para medir el delta de mejora.
     */
    baseline: { type: Number, default: null },
    productEvidence: { type: String, required: true },
    resourceDescription: { type: String, required: true },

    campus: { type: String, required: true },
    identificationSource: { type: String, required: true },
    pdiLine: { type: String, required: true },
    pdiProgram: { type: String, required: true },
    pdiObjective: { type: String },

    qualityFactor: { type: String, required: true },

    resources: [{
        type: String,
        enum: ["Humano", "Financiero", "Físico", "Tecnológico"],
        required: true
    }],

    annualGoals: {
        type: [{
            yearIndex: { type: Number, required: true },
            label: { type: String },
            value: { type: Number, default: null }
        }]
        // Sin validación de longitud fija: la cardinalidad depende del rango startYear-endYear del ImprovementPlan asociado.
    },

    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true }
}, { _id: true });

/**
 * Esquema Principal: Representa el Hallazgo (Root).
 *
 * Campos principales:
 * - `findingDescription` (String, requerido) - Descripción del hallazgo.
 * - `subActivities` (Array de `subActivitySchema`) - Subactividades asociadas.
 * - `status` (enum: `Ejecutado` | `Vencido` | `En ejecución` | `Por Vencer` | `No ejecutado` | `Con Tiempo`, por defecto `No ejecutado`).
 * - `responsibleUsers` (Array de ObjectId → `User`) - Usuarios responsables.
 * - `createdBy` (ObjectId → `User`, requerido) - Autor del hallazgo.
 * - `program` (ObjectId → `Program`, requerido) - Programa al que pertenece.
 * - `improvementPlan` (ObjectId → `ImprovementPlan`, requerido) - Plan contenedor.
 *
 * Opciones: `timestamps: true` y `versionKey: false`.
 *
 * @type {import('mongoose').Schema}
 */
const activitySchema = new mongoose.Schema({
    findingDescription: { type: String, required: true },
    subActivities: [subActivitySchema],
    status: {
        type: String,
        enum: ["Ejecutado", "Vencido", "En ejecución", "Por Vencer", "No ejecutado", "Con Tiempo"],
        default: "No ejecutado"
    },
    responsibleUsers: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    program: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Program',
        required: true
    },
    /**
     * FK al ImprovementPlan contenedor.
     * Permite agrupar hallazgos por vigencia y segregar históricos.
     */
    improvementPlan: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'ImprovementPlan',
        required: true
    }
}, {
    timestamps: true,
    versionKey: false
});

/**
 * Hook `pre('validate')` - Middleware de Validación y Migración de Datos (Async moderno).
 *
 * Recorre las subactividades para: (1) migrar el campo legado `qualityFactors`
 * al campo único `qualityFactor` cuando sea necesario y (2) validar que la
 * fecha de fin sea posterior a la de inicio.
 *
 * @returns {Promise<void>} Se ejecuta de forma asíncrona antes de validar el documento.
 */
activitySchema.pre('validate', async function () {
    if (this.subActivities && this.subActivities.length > 0) {
        this.subActivities.forEach((sub, index) => {
            // Lógica de Migración
            if (sub.qualityFactors && sub.qualityFactors.length > 0 && !sub.qualityFactor) {
                sub.qualityFactor = sub.qualityFactors[0];
            }

            // Validación de coherencia de fechas
            if (sub.endDate <= sub.startDate) {
                this.invalidate(`subActivities.${index}.endDate`, 'La fecha de fin debe ser posterior a la de inicio');
            }
        });
    }
});

/**
 * Modelo Mongoose `Activity` (colección `activities`).
 * @type {import('mongoose').Model<import('mongoose').Document>}
 */
export default mongoose.model('Activity', activitySchema);
