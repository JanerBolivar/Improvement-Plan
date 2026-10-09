# AGENTS.md — Monorepo "Plan de Mejoramiento"

Guía raíz para agentes de IA y personas que trabajan en este repositorio. Resume la
arquitectura del monorepo, cómo ejecutarlo y las convenciones que **deben** seguirse.
Cada paquete tiene su propio `AGENTS.md` con detalle exhaustivo; este documento es el
punto de entrada y la fuente de verdad para las reglas comunes.

---

## 1. Qué es este repositorio

Monorepo del **Sistema de Plan de Mejoramiento** para el seguimiento y aseguramiento de
la calidad de los programas académicos de la **Universidad de la Amazonia** (Colombia).
Desarrollado por **Ciides S.A.S. BIC** ([ciidesbic.org](https://ciidesbic.org))

Está compuesto por dos paquetes independientes que se ejecutan y despliegan por separado,
pero que evolucionan juntos:

| Paquete | Tipo | Rol |
|---|---|---|
| `api-improvement-plan` | Backend | API REST (Express + Mongoose + MongoDB) |
| `front-improvement-plan` | Frontend | SPA (React + Vite + Tailwind) |

Nombre del monorepo: `plan-de-mejoramiento`. Gestor de paquetes: **npm workspaces**.

---

## 2. Mapa del repositorio

```text
Improvement Plan/
├── api-improvement-plan/        # Backend (paquete npm)
│   ├── src/                     # Código fuente (ES Modules)
│   ├── .env.example
│   ├── AGENTS.md                # Guía detallada del backend
│   └── package.json
├── front-improvement-plan/      # Frontend (paquete npm)
│   ├── src/                     # Código fuente (JSX)
│   ├── public/                  # Assets (logos)
│   ├── Dockerfile               # Build multi-stage + nginx
│   ├── nginx.conf
│   ├── .env.example
│   ├── AGENTS.md                # Guía detallada del frontend
│   └── package.json
├── docker-compose.yml           # Dev: mongo + minio + api + web
├── package.json                 # Workspaces + scripts raíz
├── CONTRIBUTING.md
├── LICENSE
└── README.md
```

---

## 3. Requisitos

- **Node.js >= 22** (ambos paquetes lo exigen).
- **npm** (workspaces). No usar yarn/pnpm para no fragmentar el lockfile.
- **MongoDB** local o vía Docker.
- **Docker + Docker Compose** (opcional, para el entorno completo).
- **Almacenamiento S3/MinIO** (necesario solo para evidencias PDF del backend).

---

## 4. Puesta en marcha

```bash
# 1. Instalar TODAS las dependencias del monorepo (desde la raíz)
npm install

# 2. Crear los archivos de entorno locales
cp api-improvement-plan/.env.example   api-improvement-plan/.env
cp front-improvement-plan/.env.example front-improvement-plan/.env

# 3. Editar los .env con valores reales

# 4. Ejecutar backend + frontend a la vez
npm run dev
```

Alternativa con Docker (levanta Mongo, MinIO, API y Web):

```bash
npm run docker:up     # docker compose up --build
```

---

## 5. Scripts raíz

| Script | Acción |
|---|---|
| `npm install` | Instala dependencias de todos los workspaces. |
| `npm run dev` | API + SPA en paralelo (concurrently). |
| `npm run dev:api` | Solo backend (`node --watch`). |
| `npm run dev:front` | Solo frontend (Vite). |
| `npm start` | Backend en modo producción. |
| `npm run build` | Build de producción del frontend (`dist/`). |
| `npm run preview` | Sirve el build del frontend. |
| `npm run lint` | ESLint del frontend. |
| `npm test` | Tests del backend (`node --test`). |
| `npm run docs:api` | Regenera la especificación OpenAPI. |
| `npm run docker:up` / `docker:down` / `docker:reset` | Ciclo de vida de Docker Compose. |

---

## 6. Stack tecnológico

**Backend** (`api-improvement-plan`)

- Node.js 22 (ES Modules, `"type": "module"`).
- Express 5, Mongoose 9, MongoDB.
- JWT (`jsonwebtoken`) — login SSO institucional.
- `helmet`, `cors`, `morgan`.
- AWS SDK v3 (`@aws-sdk/client-s3`) para MinIO/S3.
- `multer` (memoryStorage) para evidencias PDF.
- `exceljs` para exportación XLSX.
- Documentación con `@scalar/express-api-reference` + `swagger-autogen`.
- Patrón **MVC**: `routes → controllers → models`, con middlewares y manejo centralizado de errores.

**Frontend** (`front-improvement-plan`)

- React 19 + React Router 7 (SPA, JSX).
- Vite 8 (con React Compiler vía Babel).
- Tailwind CSS 4 (`@tailwindcss/vite`, tema con variables CSS `--ig-*`).
- Axios (con interceptores JWT y manejo de 401).
- `lucide-react` (iconos), `clsx` + `tailwind-merge` (clases).
- Estado global solo con **React Context** (`AuthContext`). **No** usar Redux/Zustand.

---

## 7. Autenticación y roles

- Login vía SSO institucional (`POST /api/users/sso-login`) que emite un **JWT**.
- El frontend guarda la sesión en `localStorage.auth_data` (exp. 8 h) y envía
  `Authorization: Bearer <token>` en cada petición.
- RBAC con tres roles: **`admin`**, **`coordinator`**, **`teacher`**.
- Backend: middleware `protect` (valida JWT) + `authorize(...roles)` (RBAC).
- Frontend: `ProtectedRoute` (base) y rutas anidadas por rol.

---

## 8. Variables de entorno

**Backend** (`api-improvement-plan/.env`):

| Variable | Obligatoria | Descripción |
|---|---|---|
| `PORT` | No (3001) | Puerto HTTP de la API. |
| `MONGODB_URI` | Sí | URI de conexión a MongoDB. |
| `JWT_SECRET` | Sí | Secreto de firma/verificación de JWT. |
| `FRONTEND_URL` | No (`http://localhost:5173`) | Origen permitido en CORS. |
| `S3_ENDPOINT` | No | Endpoint de S3/MinIO. |
| `S3_REGION` | No (`us-east-1`) | Región de S3. |
| `S3_ACCESS_KEY_ID` | Sí | Credencial S3. |
| `S3_SECRET_ACCESS_KEY` | Sí | Credencial S3. |
| `S3_BUCKET` | Sí | Bucket de almacenamiento. |
| `S3_FORCE_PATH_STYLE` | No (`true`) | `'false'` desactiva path-style. |

**Frontend** (`front-improvement-plan/.env`):

| Variable | Descripción |
|---|---|
| `VITE_URL_BACKEND` | URL base del backend. |
| `VITE_API_LOGIN` | URL del endpoint/API de login SSO. |

> **Regla de oro:** nunca commitear archivos `.env` ni secretos. Solo `.env.example`.

---

## 9. Convenciones de código

- **Backend:** MVC; nombres `*.controller.js`, `*.routes.js`; modelos Mongoose con
  mayúscula inicial (`User.js`, `Program.js`). Config centralizada en `config/envs.js`
  (`SERVER_CONFIG`, `DB_CREDENTIALS`, `S3_CONFIG`). Logger propio en `utils/logger.js`.
  Errores delegados a `errorHandler`.
- **Frontend:** componentes en `PascalCase.jsx`; páginas bajo `src/pages`; componentes
  reutilizables bajo `src/components`; utilidades CSS `ig-*` (`.ig-card`, `.ig-button-primary`,
  etc.); clases condicionales con `clsx`.
- **Idioma:** código y comentarios en español; sin comentarios innecesarios.
- **ES Modules** en ambos paquetes. No CommonJS.
- **No** agregar dependencias nuevas sin justificarlo; revisar primero lo ya instalado.

---

## 10. Verificación antes de dar una tarea por terminada

```bash
npm run lint        # Frontend (ESLint)
npm test            # Backend (node --test)
npm run build       # Frontend compila
npm run docs:api    # Si se tocaron rutas del backend
```

---

## 11. Guías detalladas

- Backend: [`api-improvement-plan/AGENTS.md`](api-improvement-plan/AGENTS.md)
- Frontend: [`front-improvement-plan/AGENTS.md`](front-improvement-plan/AGENTS.md)

---

## 12. Notas de migración a monorepo

- Tras el primer `npm install` en la raíz se genera **un único `package-lock.json`** en la
  raíz; los `package-lock.json` de cada paquete quedan obsoletos y pueden eliminarse.
- El historial Git previo fue eliminado; este repositorio inicia como monorepo limpio.
- Los `AGENTS.md` de cada paquete se mantienen como documentación viva del código.
