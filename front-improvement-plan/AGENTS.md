# Frontend - Plan de Mejoramiento (SPA)

## Descripción

SPA de gestión del Plan de Mejoramiento, desarrollada con React 19 + Vite 8 + Tailwind CSS 4 + React Router 7 (ES Modules, JSX). Gestiona autenticación mediante SSO/JWT con contexto React, rutas protegidas por roles y comunicación con backend vía Axios. El objetivo es centralizar el seguimiento, evaluación y aseguramiento de calidad de actividades, subactividades y planes de mejoramiento institucional.

## Estructura de la interfaz y sistema de enrutamiento

### Árbol de `src/` (excluyendo node_modules/dist)

```text
src/
├── api/
│   └── axios.js
├── App.jsx
├── components/
│   ├── Auth/
│   │   └── ProtectedRoute.jsx
│   ├── Dashboard/
│   │   ├── SearchSelect.jsx
│   │   └── SubActivityForm.jsx
│   └── Layout/
│       └── DashboardLayout.jsx
├── config/
│   └── envs.js
├── context/
│   └── AuthContext.jsx
├── index.css
├── main.jsx
├── pages/
│   ├── AuthPages/
│   │   └── AuthRedirect.jsx
│   ├── Dashboard/
│   │   ├── ActivitiesPage.jsx
│   │   ├── AdminPage.jsx
│   │   ├── CatalogPage.jsx
│   │   ├── DashboardHome.jsx
│   │   ├── ImprovementPlansPage.jsx
│   │   ├── ProgramsPage.jsx
│   │   ├── SubActivityTrackingPage.jsx
│   │   ├── SystemSetup.jsx
│   │   └── UsersPage.jsx
│   └── GeneralPages/
│       ├── HomePage.jsx
│       └── NotFound.jsx
```

### Tabla de rutas (según `App.jsx`)

| Path | Componente | Roles permitidos |
|---|---|---|
| `/` | `HomePage` | Público |
| `/auth/callback` | `AuthRedirect` | Público |
| `/dashboard` (anidado bajo `ProtectedRoute` base) | `DashboardLayout` + `Outlet` | `admin`, `coordinator`, `teacher` |
| `/dashboard` (index) | `DashboardHome` | Heredados (base) |
| `/dashboard/activities` | `ActivitiesPage` | Heredados (base) |
| `/dashboard/activities/tracking/:activityId/:subActivityId` | `SubActivityTrackingPage` | Heredados (base) |
| `/dashboard/programs` | `ProgramsPage` | `admin`, `coordinator` (anidado) |
| `/dashboard/plans` | `ImprovementPlansPage` | `admin`, `coordinator` (anidado) |
| `/dashboard/users` | `UsersPage` | `admin` (anidado) |
| `/dashboard/admin` | `AdminPage` | `admin` (anidado) |
| `*` | `NotFound` | Público (catch-all) |

### Páginas sin ruta propia en `App.jsx`

Las siguientes páginas existen en `src/pages/Dashboard/` pero **no** se declaran como rutas independientes en `App.jsx`; se renderizan como secciones internas de `AdminPage` (ruta `/dashboard/admin`):

- `CatalogPage.jsx` – Gestor genérico de catálogos; instanciado dentro de `AdminPage` (importado en su línea 1, renderizado como componente con props `title`, `endpoint`, `label`, `fields`).
- `SystemSetup.jsx` – Configuración/inicialización del sistema; instanciado dentro de `AdminPage`.

### Layout

`DashboardLayout.jsx` renderiza el layout protegido con:
- Sidebar desktop (responsive: w-20 xl:w-72), con navegación filtrada por rol.
- Cabecera superior móvil.
- Área de contenido principal con `<Outlet />` (máx. ancho `max-w-screen-xl`).
- Navegación inferior móvil (muestra hasta 5 elementos del menú filtrado).

## Gestión del estado global

### AuthContext (`src/context/AuthContext.jsx`)

Proveedor de autenticación global. Expone:

**Datos expuestos (context value):**
- `user {Object|null}` – Datos del usuario autenticado.
- `token {string|null}` – Token JWT.
- `isAuthenticated {boolean}` – `true` si existe token.
- `loading {boolean}` – `true` durante verificación/restauración de sesión.

**Funciones expuestas:**
- `login(authData, redirectPath="/dashboard")` – Guarda sesión en `localStorage.auth_data` con expiración (8 horas), actualiza `user`/`token`, navega a `redirectPath`.
- `logout()` – Elimina `auth_data`, limpia estado, navega a `/` (memoizada con `useCallback`).
- `updateSessionUser(newUserData)` – Actualiza `user` en estado y en `localStorage.auth_data`.

**Efectos:**
- Inicialización (mount): lee `localStorage.auth_data`, comprueba `expiresAt` vs tiempo actual; si expirado → `logout()`, si válido → restaura `user`/`token`, establece `loading=false`. Dependencias: `[logout]`.

**Patrón:** `AuthContext` + `useAuth()` hook exportado. `useAuth()` lanza error si no se usa dentro de `AuthProvider`.

### Estado local por página

Las páginas/componentes utilizan `useState` y `useEffect` para estado local (formularios, filtros, cargas de datos, UI). Ejemplos representativos: `DashboardHome.jsx` (programs/plans/activities/stats/loading), `ActivitiesPage.jsx` (actividades, catálogos, paginación, modal), `SubActivityForm.jsx` (cálculos derivados con `useMemo`).

### Cliente Axios (`src/api/axios.js`)

Instancia `api` creada con `baseURL = urlApi`.

**Interceptores:**
- Request: lee `auth_data` de `localStorage`, añade `Authorization: Bearer <token>` si existe.
- Response: ante HTTP 401 elimina `auth_data` y redirige a `/`.

**Exportación:** `default api`.

> Nota: **NO se usa Redux/Zustand** en el frontend (estado global se gestiona con React Context).

## Guía de estilos (Tailwind)

- **Tailwind CSS 4** integrado vía plugin `@tailwindcss/vite` en `vite.config.js`.
- **Estilos globales** en `src/index.css` con `@import "tailwindcss"`, tema personalizado (`@theme`) definiendo variables CSS (`--ig-bg`, `--ig-text-main`, `--ig-text-secondary`, `--ig-border`, `--ig-accent`, `--ig-hover`) y soporte claro/oscuro (`prefers-color-scheme`).
- Uso de **utilidades directamente en JSX**.
- Librerías auxiliares: `clsx` y `tailwind-merge` (utilizadas en código para composición condicional de clases).
- Iconos: `lucide-react`.

**Convenciones observadas:**
- Clases condicionales (ej. `isActive ? 'ig-nav-item-active' : ''`).
- Layouts `flex`, `grid`, `gap-*`, espaciados consistentes.
- Componentes utilitarios definidos en CSS: `.ig-card`, `.ig-button-primary`, `.ig-button-secondary`, `.ig-input`, `.ig-nav-item`, `.ig-nav-item-active`, `.ig-table-header`, `.ig-table-cell`.
- Colores temáticos vía variables CSS (`bg-[var(--ig-bg)]`, `text-[var(--ig-text-main)]`, `border-[var(--ig-border)]`).

## Variables de entorno

| Variable | Propósito | Dónde se lee |
|---|---|---|
| `VITE_URL_BACKEND` | URL base del backend | `src/config/envs.js` (`urlBackend`) y usada por `axios.defaults.baseURL` en `src/main.jsx` |
| `VITE_API_LOGIN` | URL del endpoint/API de login SSO | `src/config/envs.js` (`urlApiLogin`) y usada en `src/pages/GeneralPages/HomePage.jsx` para redirección de login |

**Nota:** No se incluyen valores secretos. Solo nombres de variables.

## Comandos

| Comando | Descripción |
|---|---|
| `npm install` | Instala dependencias del proyecto. |
| `npm run dev` | Inicia servidor de desarrollo Vite. **Puerto típico:** `5173` (por defecto Vite). |
| `npm run build` | Genera build de producción (`dist/`). |
| `npm run preview` | Sirve build de producción localmente. |
| `npm run lint` | Ejecuta ESLint sobre el código fuente. |

### Notas sobre despliegue

En el repositorio pueden existir archivos relacionados con despliegue (`nginx.conf`, `Dockerfile`) según configuración del entorno (no modificados en este trabajo). Su uso dependerá de la infraestructura de despliegue definida para el proyecto.

## Archivos documentados (JSDoc añadido)

- `src/main.jsx` – Punto de entrada, montaje React 19, configuración baseURL axios.
- `src/App.jsx` – Raíz con árbol de rutas y AuthProvider.
- `src/index.css` – Estilos globales Tailwind CSS 4 y componentes/utilidades.
- `src/config/envs.js` – Variables de entorno Vite (nombres).
- `src/api/axios.js` – Instancia axios e interceptores (request/response, 401).
- `src/context/AuthContext.jsx` – AuthProvider, estado, login/logout/updateSessionUser, `useAuth`.
- `src/components/Auth/ProtectedRoute.jsx` – Validación de autenticación/roles y redirecciones.
- `src/components/Layout/DashboardLayout.jsx` – Layout protegido con navegación responsive.
- `src/components/Dashboard/SearchSelect.jsx` – Selector con búsqueda integrada.
- `src/components/Dashboard/SubActivityForm.jsx` – Formulario de subactividad.
- `src/pages/GeneralPages/HomePage.jsx` – Landing pública.
- `src/pages/GeneralPages/NotFound.jsx` – Página 404.
- `src/pages/AuthPages/AuthRedirect.jsx` – Procesamiento de callback SSO.
- `src/pages/Dashboard/DashboardHome.jsx` – Panel de control con KPIs y análisis.
- `src/pages/Dashboard/ActivitiesPage.jsx` – Gestión de actividades y subactividades (incluye auxiliar `reconcileAnnualGoals`).
- `src/pages/Dashboard/SubActivityTrackingPage.jsx` – Seguimiento de subactividad por año.
- `src/pages/Dashboard/ProgramsPage.jsx` – Gestión de programas académicos.
- `src/pages/Dashboard/ImprovementPlansPage.jsx` – Gestión de planes de mejoramiento.
- `src/pages/Dashboard/UsersPage.jsx` – Gestión de usuarios.
- `src/pages/Dashboard/AdminPage.jsx` – Panel de administración (agrega catálogos y setup).
- `src/pages/Dashboard/CatalogPage.jsx` – Gestor genérico de catálogos (props).
- `src/pages/Dashboard/SystemSetup.jsx` – Configuración del sistema.
