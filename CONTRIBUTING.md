# Contribuir al Sistema de Plan de Mejoramiento

Gracias por tu interés en contribuir. Este documento describe las convenciones y el flujo
de trabajo del monorepo `plan-de-mejoramiento`.

> Desarrollado por **[Ciides S.A.S. BIC](https://ciidesbic.org)** para la **Universidad de la Amazonia**.

---

## 1. Estructura del monorepo

| Paquete | Ruta | Rol |
|---|---|---|
| Backend | `api-improvement-plan/` | API REST (Express + Mongoose + MongoDB). |
| Frontend | `front-improvement-plan/` | SPA (React + Vite + Tailwind). |

El repositorio usa **npm workspaces**. Todas las dependencias se instalan desde la raíz:

```bash
npm install
```

---

## 2. Preparar el entorno

```bash
# Archivos de entorno locales
cp api-improvement-plan/.env.example   api-improvement-plan/.env
cp front-improvement-plan/.env.example front-improvement-plan/.env

# API + SPA en paralelo
npm run dev
```

Los archivos `.env` **nunca** se versionan. Solo se mantienen los `.env.example`.

---

## 3. Flujo de trabajo con Git

1. Crea una rama desde `main`:

   ```bash
   git checkout -b feat/nombre-corto
   ```

2. Realiza cambios pequeños y enfocados.
3. Verifica antes de subir (ver sección de verificación).
4. Abre un Pull Request hacia `main` describiendo el cambio.

### Nombres de rama

| Prefijo | Uso |
|---|---|
| `feat/` | Nueva funcionalidad. |
| `fix/` | Corrección de errores. |
| `refactor/` | Reestructuración sin cambio de comportamiento. |
| `docs/` | Documentación. |
| `chore/` | Tareas de mantenimiento. |

---

## 4. Mensajes de commit

Se sigue **Conventional Commits**:

```text
<tipo>(<alcance>): <descripción corta>
```

Ejemplos:

```text
feat(api): agregar endpoint de clonado de planes
fix(front): corregir redirección tras expirar el token
docs(readme): documentar variables de entorno del backend
chore(repo): migrar a npm workspaces
```

Tipos permitidos: `feat`, `fix`, `refactor`, `docs`, `test`, `chore`, `perf`, `style`, `build`.

Alcances sugeridos: `api`, `front`, `repo`, `docs`.

---

## 5. Convenciones de código

- **Idioma:** código y comentarios en **español**. Sin comentarios innecesarios.
- **Módulos:** ambos paquetes usan **ES Modules**. No usar CommonJS.
- **Backend:** patrón MVC (`routes → controllers → models`). Nombres
  `*.controller.js` / `*.routes.js`; modelos Mongoose con mayúscula inicial.
- **Frontend:** componentes en `PascalCase.jsx`; páginas en `src/pages`, componentes
  reutilizables en `src/components`; clases condicionales con `clsx`.
- **Estilos:** utilidades Tailwind y clases `ig-*` (`.ig-card`, `.ig-button-primary`, ...).
- **Dependencias:** no agregar librerías nuevas sin justificar; revisar primero lo instalado.

---

## 6. Verificación antes del Pull Request

Ejecuta y asegúrate de que todo pasa:

```bash
npm run lint        # Frontend (ESLint)
npm test            # Backend (node --test)
npm run build       # Frontend compila
npm run docs:api    # Si se tocaron rutas del backend
```

---

## 7. Checklist del Pull Request

- [ ] El cambio tiene un alcance claro y acotado.
- [ ] Se respetan las convenciones de código y de commits.
- [ ] `npm run lint`, `npm test` y `npm run build` pasan.
- [ ] No se incluyeron secretos ni archivos `.env`.
- [ ] La documentación (`README.md` / `AGENTS.md`) se actualizó si aplica.
- [ ] Se regeneró `openapi.json` si se modificaron rutas del backend.

---

## 8. Recursos

- [README.md](README.md) — Visión general del proyecto.
- [AGENTS.md](AGENTS.md) — Arquitectura y convenciones del monorepo.
- [api-improvement-plan/AGENTS.md](api-improvement-plan/AGENTS.md) — Detalle del backend.
- [front-improvement-plan/AGENTS.md](front-improvement-plan/AGENTS.md) — Detalle del frontend.
