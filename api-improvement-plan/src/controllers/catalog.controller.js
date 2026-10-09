/**
 * Fábrica de controladores CRUD genéricos para catálogos de parametrización.
 *
 * Crea un conjunto de métodos `getAll`, `create`, `update`, `delete` acoplados
 * al `Model` de Mongoose indicado. Para `getAll`, detecta referencias en el
 * esquema y pobla automáticamente los campos `ref` asociados. `update` retorna
 * 404 si no existe el registro; `delete` retorna 404 si no existe el registro.
 *
 * @param {import('mongoose').Model} Model - Modelo de Mongoose sobre el que operar.
 * @param {string} [label='registro'] - Etiqueta descriptiva usada en los mensajes de respuesta.
 * @returns {{
 *  getAll: (req: import('express').Request, res: import('express').Response, next: import('express').NextFunction) => Promise<void>,
 *  create: (req: import('express').Request, res: import('express').Response, next: import('express').NextFunction) => Promise<void>,
 *  update: (req: import('express').Request, res: import('express').Response, next: import('express').NextFunction) => Promise<void>,
 *  delete: (req: import('express').Request, res: import('express').Response, next: import('express').NextFunction) => Promise<void>
 * }} Controlador CRUD del catálogo.
 */
export const createCatalogController = (Model, label = 'registro') => {
    return {
        /**
         * Obtiene todos los registros del catálogo.
         *
         * Detecta los campos con `ref` en el esquema del modelo y los popula
         * automáticamente. Ordena el resultado por `createdAt` en orden
         * descendente.
         *
         * @param {import('express').Request} req - Petición HTTP sin parámetros de consulta obligatorios.
         * @param {import('express').Response} res - Respuesta JSON con la lista de registros.
         * @param {import('express').NextFunction} next - Delega errores al manejador global.
         * @returns {Promise<void>}
         * @response {200} - `{ success: true, data: Document[] }`.
         */
        getAll: async (req, res, next) => {
            try {
                // Si el modelo tiene referencias, poblarlas automáticamente (ej: PDIProgram -> line)
                const populateFields = Model.schema.obj && Object.keys(Model.schema.obj)
                    .filter(key => Model.schema.obj[key].ref);
                
                let query = Model.find();
                if (populateFields.length > 0) {
                    populateFields.forEach(field => query = query.populate(field));
                }
                
                const data = await query.sort({ createdAt: -1 });
                res.json({ success: true, data });
            } catch (error) { next(error); }
        },

        /**
         * Crea un nuevo registro en el catálogo.
         *
         * Inserta el documento con `Model.create(req.body)`.
         *
         * @param {import('express').Request} req - Petición; `req.body` con los campos del registro.
         * @param {import('express').Response} res - Respuesta JSON con el registro creado.
         * @param {import('express').NextFunction} next - Delega errores al manejador global.
         * @returns {Promise<void>}
         * @response {201} - `{ success: true, data: Document }`.
         */
        create: async (req, res, next) => {
            try {
                const data = await Model.create(req.body);
                res.status(201).json({ success: true, data });
            } catch (error) { next(error); }
        },

        /**
         * Actualiza un registro del catálogo por su identificador.
         *
         * Ejecuta `Model.findByIdAndUpdate` con `{ new: true, runValidators: true }`.
         *
         * @param {import('express').Request} req - Petición; `req.params.id` y `req.body` con los campos a actualizar.
         * @param {import('express').Response} res - Respuesta JSON con el registro actualizado.
         * @param {import('express').NextFunction} next - Delega errores al manejador global.
         * @returns {Promise<void>}
         * @response {200} - `{ success: true, data: Document }`.
         * @response {404} - No se encontró el registro indicado.
         */
        update: async (req, res, next) => {
            try {
                const data = await Model.findByIdAndUpdate(req.params.id, req.body, { 
                    new: true, 
                    runValidators: true 
                });
                if (!data) return res.status(404).json({ success: false, message: `No se encontró el ${label}` });
                res.json({ success: true, data });
            } catch (error) { next(error); }
        },

        /**
         * Elimina un registro del catálogo por su identificador.
         *
         * Ejecuta `Model.findByIdAndDelete` sobre `req.params.id`.
         *
         * @param {import('express').Request} req - Petición; `req.params.id`.
         * @param {import('express').Response} res - Respuesta JSON de confirmación.
         * @param {import('express').NextFunction} next - Delega errores al manejador global.
         * @returns {Promise<void>}
         * @response {200} - `{ success: true, message: '<Label> eliminado correctamente' }`.
         * @response {404} - No se encontró el registro indicado.
         */
        delete: async (req, res, next) => {
            try {
                const data = await Model.findByIdAndDelete(req.params.id);
                if (!data) return res.status(404).json({ success: false, message: `No se encontró el ${label}` });
                res.json({ success: true, message: `${label.charAt(0).toUpperCase() + label.slice(1)} eliminado correctamente` });
            } catch (error) { next(error); }
        }
    };
};
