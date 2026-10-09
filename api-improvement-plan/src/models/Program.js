import mongoose from 'mongoose';

/**
 * Program Schema - Representa los programas académicos de la institución.
 *
 * Campos principales:
 * - `name` (String, requerido) - Nombre del programa.
 * - `code` (String, requerido, único) - Código institucional del programa.
 * - `faculty` (String, requerido) - Facultad a la que pertenece.
 * - `level` (enum: `Pregrado` | `Posgrado` | `Maestría` | `Doctorado` | `Especialización`, requerido) - Nivel académico.
 * - `modality` (enum: `Presencial` | `Distancia` | `Virtual` | `Semi-presencial`, por defecto `Presencial`) - Modalidad.
 * - `coordinator` (ObjectId → `User`, por defecto `null`) - Usuario coordinador del programa.
 * - `status` (enum: `active` | `inactive`, por defecto `active`) - Estado del programa.
 *
 * Opciones: `timestamps: true` y `versionKey: false`.
 *
 * @type {import('mongoose').Schema}
 */
const programSchema = new mongoose.Schema({
    name: { 
        type: String, 
        required: [true, 'El nombre del programa es obligatorio'],
        trim: true 
    },
    code: { 
        type: String, 
        required: [true, 'El código del programa es obligatorio'], 
        unique: true,
        trim: true
    },
    faculty: { 
        type: String, 
        required: [true, 'La facultad es obligatoria'],
        trim: true
    },
    level: { 
        type: String, 
        enum: ['Pregrado', 'Posgrado', 'Maestría', 'Doctorado', 'Especialización'], 
        required: [true, 'El nivel académico es obligatorio'] 
    },
    modality: { 
        type: String, 
        required: [true, 'La modalidad es obligatoria'],
        enum: ['Presencial', 'Distancia', 'Virtual', 'Semi-presencial'],
        default: 'Presencial'
    },
    coordinator: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User',
        default: null
    },
    status: { 
        type: String, 
        enum: ['active', 'inactive'], 
        default: 'active' 
    }
}, { 
    timestamps: true,
    versionKey: false 
});

/**
 * Hook `post('save')` - Manejo amigable de errores de duplicados (E11000).
 * Reemplaza el error de clave duplicada por un mensaje claro cuando el
 * código del programa ya existe.
 *
 * @param {Error} error - Error devuelto por MongoDB.
 * @param {Object} doc - Documento que provocó el error.
 * @param {Function} next - Continúa la cadena con el mensaje personalizado.
 * @returns {void}
 */
programSchema.post('save', function(error, doc, next) {
    if (error.name === 'MongoServerError' && error.code === 11000) {
        next(new Error('Ya existe un programa con este código.'));
    } else {
        next(error);
    }
});

/**
 * Modelo Mongoose `Program` (colección `programs`).
 * @type {import('mongoose').Model<import('mongoose').Document>}
 */
const Program = mongoose.model('Program', programSchema);
export default Program;
