import mongoose from 'mongoose';

/**
 * Schema: ImprovementPlan
 *
 * Representa un Plan de Mejoramiento institucional con vigencia temporal.
 * Actúa como contenedor raíz de hallazgos (Activities) para un programa académico.
 * La restricción de unicidad de plan activo se implementa vía middleware pre-save
 * en lugar de índice sparse para soportar múltiples planes inactivos por programa.
 *
 * Campos principales:
 * - `name` (String, requerido) - Nombre del plan.
 * - `program` (ObjectId → `Program`, requerido) - Programa propietario del plan.
 * - `startYear` / `endYear` (Number, requeridos, mínimo 2000) - Vigencia del plan.
 * - `isActive` (Boolean, por defecto `false`) - Bandera de plan activo del programa.
 * - `status` (enum: `draft` | `active` | `closed`, por defecto `draft`) - Estado del ciclo de vida.
 * - `description` (String) - Descripción libre.
 * - `createdBy` (ObjectId → `User`, requerido) - Usuario creador.
 * - `horizons` (Object) - Rangos `shortTerm`, `midTerm` y `longTerm` con `start` y `end`.
 *
 * Opciones: `timestamps: true` y `versionKey: false`.
 *
 * @type {import('mongoose').Schema}
 */
const improvementPlanSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'El nombre del plan es obligatorio'],
        trim: true
    },
    program: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Program',
        required: [true, 'El programa asociado es obligatorio']
    },
    startYear: {
        type: Number,
        required: [true, 'El año de inicio es obligatorio'],
        min: [2000, 'Año de inicio fuera del rango permitido']
    },
    endYear: {
        type: Number,
        required: [true, 'El año de finalización es obligatorio'],
        min: [2000, 'Año de fin fuera del rango permitido']
    },
    isActive: {
        type: Boolean,
        default: false
    },
    status: {
        type: String,
        enum: ['draft', 'active', 'closed'],
        default: 'draft'
    },
    description: {
        type: String,
        trim: true,
        default: ''
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    horizons: {
        shortTerm: {
            start: { type: Number, required: [true, 'El año de inicio del corto plazo es obligatorio'] },
            end: { type: Number, required: [true, 'El año de fin del corto plazo es obligatorio'] }
        },
        midTerm: {
            start: { type: Number, required: [true, 'El año de inicio del mediano plazo es obligatorio'] },
            end: { type: Number, required: [true, 'El año de fin del mediano plazo es obligatorio'] }
        },
        longTerm: {
            start: { type: Number, required: [true, 'El año de inicio del largo plazo es obligatorio'] },
            end: { type: Number, required: [true, 'El año de fin del largo plazo es obligatorio'] }
        }
    }
}, {
    timestamps: true,
    versionKey: false
});

/**
 * Índice compuesto para optimizar queries por programa,
 * y garantizar lookups rápidos del plan activo.
 */
improvementPlanSchema.index({ program: 1, isActive: 1 });
improvementPlanSchema.index({ program: 1, status: 1 });

/**
 * Virtual: Calcula la duración en años del plan.
 */
improvementPlanSchema.virtual('durationYears').get(function () {
    return this.endYear - this.startYear + 1;
});

/**
 * Virtual: Genera el array de años del plan para metas anualizadas.
 * Reemplaza el array hardcodeado de 7 posiciones en el modelo Activity.
 */
improvementPlanSchema.virtual('yearRange').get(function () {
    return Array.from(
        { length: this.durationYears },
        (_, i) => this.startYear + i
    );
});

/**
 * Validaciones de coherencia temporal:
 *   1. endYear >= startYear
 *   2. Vigencia mínima de 6 años (garantiza distribución correcta en Corto/Mediano/Largo plazo)
 */
improvementPlanSchema.pre('validate', function () {
    if (this.endYear < this.startYear) {
        this.invalidate('endYear', 'El año de fin debe ser mayor o igual al año de inicio');
    }
    if ((this.endYear - this.startYear + 1) < 1) {
        this.invalidate('endYear', 'La vigencia mínima del plan es de 1 año');
    }

    if (this.horizons) {
        const { shortTerm, midTerm, longTerm } = this.horizons;
        if (shortTerm && midTerm && longTerm) {
            if (shortTerm.start !== this.startYear) {
                this.invalidate('horizons.shortTerm.start', 'El inicio del corto plazo debe coincidir con el inicio del plan');
            }
            if (shortTerm.end < shortTerm.start) {
                this.invalidate('horizons.shortTerm.end', 'El año de fin del corto plazo no puede ser menor a su inicio');
            }
            if (midTerm.start < shortTerm.end) {
                this.invalidate('horizons.midTerm.start', 'El inicio del mediano plazo no puede ser menor al fin del corto plazo');
            }
            if (midTerm.end < midTerm.start) {
                this.invalidate('horizons.midTerm.end', 'El año de fin del mediano plazo no puede ser menor a su inicio');
            }
            if (longTerm.start < midTerm.end) {
                this.invalidate('horizons.longTerm.start', 'El inicio del largo plazo no puede ser menor al fin del mediano plazo');
            }
            if (longTerm.end !== this.endYear) {
                this.invalidate('horizons.longTerm.end', 'El fin del largo plazo debe coincidir con el año de finalización del plan');
            }
        } else {
            this.invalidate('horizons', 'Los horizontes de corto, mediano y largo plazo son obligatorios');
        }
    } else {
        this.invalidate('horizons', 'La configuración de plazos u horizontes es obligatoria');
    }
});


/**
 * Manejo de errores de duplicado (E11000) con mensaje amigable.
 */
improvementPlanSchema.post('save', function (error, doc, next) {
    if (error.name === 'MongoServerError' && error.code === 11000) {
        next(new Error('Ya existe un plan con ese nombre para este programa.'));
    } else {
        next(error);
    }
});

/**
 * Modelo Mongoose `ImprovementPlan` (colección `improvementplans`).
 * @type {import('mongoose').Model<import('mongoose').Document>}
 */
const ImprovementPlan = mongoose.model('ImprovementPlan', improvementPlanSchema);
export default ImprovementPlan;
