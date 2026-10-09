# Agente Backend (API) - Plan de Mejoramiento

API REST del sistema de Plan de Mejoramiento, desarrollada con Express 5, Mongoose 9 y MongoDB. Utiliza ES Modules, JWT para autenticación, almacenamiento de archivos en S3/MinIO y documentación con Scalar. Arquitectura orientada al patrón MVC, con middlewares de autenticación/autorización y manejo centralizado de errores.

## 1. Estructura de carpetas

Árbol real de `api-improvement-plan/src` (excluyendo `node_modules`):

```text
src/
├── app.js                    # Bootstrap del servidor: middlewares, conexión MongoDB, montaje de rutas, docs, health
├── assets/                  # Recursos estáticos (logo institucional)
├── config/                  # Configuración central: variables de entorno y cliente S3
│   ├── envs.js              # Carga .env y agrupa SERVER_CONFIG, DB_CREDENTIALS, S3_CONFIG
│   └── s3.client.js          # Cliente S3 y utilidades (subir, eliminar, extraer key, build URL)
├── controllers/            # Capa de lógica de negocio (MVC)
│   ├── activity.controller.js
│   ├── admin.controller.js
│   ├── catalog.controller.js
│   ├── improvementPlan.controller.js
│   ├── program.controller.js
│   ├── tracking.controller.js
│   └── user.controller.js
├── middlewares/            # Middlewares Express
│   ├── auth.middleware.js   # protect (JWT) y authorize (RBAC por roles)
│   └── error.middleware.js  # notFound (404) y errorHandler (respuestas uniformes)
├── models/                 # Esquemas y modelos Mongoose
│   ├── Activity.js
│   ├── Campus.js
│   ├── FactorInst.js
│   ├── FactorProg.js
│   ├── IdSource.js
│   ├── ImprovementPlan.js
│   ├── PDILine.js
│   ├── PDIObjective.js
│   ├── PDIProgram.js
│   ├── Program.js
│   ├── QualityInst.js
│   ├── QualityProg.js
│   ├── SubActivityTracking.js
│   └── User.js
├── routes/                 # Definición y montaje de endpoints
│   ├── activity.routes.js
│   ├── admin.routes.js
│   ├── catalog.routes.js
│   ├── improvementPlan.routes.js
│   ├── program.routes.js
│   ├── tracking.routes.js
│   └── user.routes.js
└── utils/                  # Utilidades reutilizables
    ├── logger.js           # Logger consola con marcas de tiempo y colores
    └── token.js            # Generación de JWT
```

## 2. Patrones de diseño

- **MVC (Routes → Controllers → Models)**: las rutas delegan a controladores, los controladores orquestan consultas/escrituras contra modelos Mongoose.
- **Middlewares**: `protect` valida JWT y adjunta `req.user`, `authorize` aplica RBAC por rol (`admin`, `coordinator`, `teacher`). `errorHandler` centraliza el mapeo de errores (CastError→404, 11000→400).
- **Factory de controladores**: `createCatalogController(Model, label)` genera CRUD estándar para catálogos de parametrización.
- **Configuración centralizada**: `config/envs.js` lee `.env` y expone `SERVER_CONFIG`, `DB_CREDENTIALS`, `S3_CONFIG`. `config/s3.client.js` inicializa cliente y utilidades.
- **Logging**: logger interno unificado en `utils/logger.js`.
- **Validación/normalización**: hooks Mongoose (`pre`/`post`), índices compuestos y manejo amigable de duplicados.
- **Convenciones de nombres**: `*.controller.js`, `*.routes.js`, `*.model.js` (archivos con mayúscula inicial corresponden a modelos Mongoose), carpetas `config`, `middlewares`, `utils`.

## 3. Flujo de una petición típica

El recorrido de una petición se describe como: `Ruta → Middleware (JWT/RBAC) → Controlador → Modelo Mongoose → MongoDB → respuesta JSON`.

**Ejemplo concreto:** `GET /api/programs`

1. **Ruta**: `src/routes/program.routes.js` define `router.get('/', protect, getPrograms)`. 
2. **Middleware auth**: `protect` extrae el token Bearer, verifica con `JWT_SECRET`, carga `User.findById(...).select('-password')` y adjunta `req.user`. Luego `getPrograms` en la ruta no requiere `authorize` explícito (acceso a `admin`, `coordinator` según semántica del controlador/ruta; véase implementación).
3. **Controlador**: `src/controllers/program.controller.js::getPrograms` ejecuta `Program.find().populate('coordinator')` contra Mongoose.
4. **Modelo/DB**: `src/models/Program.js` define el esquema; Mongoose consulta MongoDB y retorna documentos.
5. **Respuesta**: el controlador responde `res.json({ success: true, data: programs })`. Si ocurre error, delega a `next(error)` que es atendido por `errorHandler`.

## 4. Variables de entorno necesarias

Cargadas mediante `dotenv` desde `src/config/envs.js`. El archivo `.env` reside en la raíz del backend (`api-improvement-plan/.env`). No se incluyen valores secretos reales.

| Nombre | Propósito | Valor por defecto | Obligatoria |
|---|---|---|---|
| `PORT` | Puerto de escucha HTTP del servidor | `3001` | No |
| `JWT_SECRET` | Clave secreta para firmar/verificar JWT | — | Sí |
| `FRONTEND_URL` | Origen permitido en CORS | `http://localhost:5173` | No |
| `MONGODB_URI` | URI de conexión a MongoDB | — | Sí |
| `S3_ENDPOINT` | Endpoint del servicio S3/MinIO | `http://localhost:9000` | No |
| `S3_REGION` | Región del servicio S3 | `us-east-1` | No |
| `S3_ACCESS_KEY_ID` | Clave de acceso al bucket S3 | — | Sí |
| `S3_SECRET_ACCESS_KEY` | Clave secreta de acceso al bucket S3 | — | Sí |
| `S3_BUCKET` | Nombre del bucket de almacenamiento | — | Sí |
| `S3_FORCE_PATH_STYLE` | `true` salvo que sea `'false'` (path-style) | `true` | No |

## 5. Endpoints principales

Resumen extraído de los archivos de rutas reales. Todos los endpoints montados bajo `/api/*` (véase `src/app.js`).

| Método | Path | Auth requerida | Notas |
|---|---|---|---|
| POST | `/api/users/sso-login` | Público | Autenticación/registro vía SSO |
| GET | `/api/users/search` | Privado | Búsqueda de usuarios |
| GET | `/api/users/coordinators` | Privado (`admin`) | Lista de coordinadores activos |
| PUT | `/api/users/me/program` | Privado | Actualiza programa del usuario autenticado |
| GET | `/api/users` | Privado (`admin`, `coordinator`) | Lista de usuarios (filtrado por rol) |
| PUT | `/api/users/:id` | Privado (`admin`, `coordinator`) | Actualiza usuario |
| GET | `/api/programs` | Privado | Lista de programas |
| POST | `/api/programs` | Privado (`admin`) | Crea programa |
| PUT | `/api/programs/:id` | Privado (`admin`) | Actualiza programa |
| DELETE | `/api/programs/:id` | Privado (`admin`) | Elimina programa |
| GET | `/api/catalogs/*` | Privado (`admin`, `coordinator`, `teacher`) | Catálogos (campuses, id-sources, PDI, factores, calidad). CRUD con `authorize` selectivo (PUT/DELETE restringidos a `admin` en `catalog.routes.js`) |
| POST | `/api/admin/setup-system` | Privado (`admin`) | Inicialización masiva del sistema |
| GET | `/api/activities/suggestions` | Privado | Sugerencias para campos (debe ir antes de `/:id`) |
| GET | `/api/activities/export` | Privado | Exporta plan a Excel |
| GET | `/api/activities` | Privado | Lista hallazgos (aplica RBAC y plan activo) |
| GET | `/api/activities/:id` | Privado | Obtiene hallazgo por id |
| POST | `/api/activities` | Privado | Crea hallazgo |
| PATCH | `/api/activities/:id` | Privado | Actualiza hallazgo |
| DELETE | `/api/activities/:id` | Privado (`admin`, `coordinator`) | Elimina hallazgo |
| GET | `/api/plans` | Privado | Lista planes (scope por rol) |
| GET | `/api/plans/by-program/:programId` | Privado | Planes por programa |
| GET | `/api/plans/active/:programId` | Privado | Plan activo de un programa |
| POST | `/api/plans` | Privado (`admin`, `coordinator`) | Crea plan |
| POST | `/api/plans/:id/copy` | Privado (`admin`, `coordinator`) | Clona plan y hallazgos |
| PUT | `/api/plans/:id` | Privado (`admin`, `coordinator`) | Actualiza plan |
| PATCH | `/api/plans/:id/activate` | Privado (`admin`, `coordinator`) | Activa plan |
| DELETE | `/api/plans/:id` | Privado (`admin`, `coordinator`) | Elimina plan (solo si sin hallazgos) |
| GET | `/api/tracking/export` | Privado | Exporta matriz de seguimiento (XLSX) |
| GET | `/api/tracking/sub-activity/:subActivityId/year/:year` | Privado | Obtiene seguimiento por subactividad/año |
| POST | `/api/tracking` | Privado | Upsert de seguimiento |
| POST | `/api/tracking/upload-pdf` | Privado | Sube evidencia PDF (multer memoryStorage, 15MB) |
| DELETE | `/api/tracking/evidence` | Privado | Elimina evidencia PDF del bucket |

Endpoints no `/api/*`: `/health` (health check, 200) y `/api-docs` (Scalar API Reference) definidos en `app.js`.

## 6. Comandos

| Comando | Descripción |
|---|---|
| `npm install` | Instala dependencias del proyecto |
| `npm run dev` | Ejecuta servidor con `node --watch` (recarga automática) |
| `npm start` | Ejecuta servidor en producción (`node src/app.js`) |
| `npm test` | Ejecuta tests (`node --test`) |
| `npm run docs:generate` | Regenera la especificación OpenAPI en `src/docs/openapi.json` desde las rutas (`src/config/swagger.js`) |

Notas adicionales:
- Documentación interactiva disponible en `/api-docs` (Scalar). La UI carga la especificación desde `/api-docs/openapi.json` (documento generado con `npm run docs:generate`, servido dinámicamente desde `src/docs/openapi.json`).
- Health check disponible en `/health`.
- Almacenamiento de archivos en MinIO/S3 (los archivos ya no se sirven desde carpeta estática local; véase comentario en `app.js`).
