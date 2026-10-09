# syntax=docker/dockerfile:1

# ============================================================
# Backend - API REST del Plan de Mejoramiento
# Express 5 + Mongoose 9 + MongoDB (Node.js 22)
# ============================================================
# Etapas:
#   - deps        : dependencias (incluidas dev, para generar docs)
#   - build       : genera src/docs/openapi.json
#   - development : `npm run dev` con `node --watch`
#   - production  : imagen final por defecto (solo deps de produccion)
# ============================================================

# ---- Base comun ----
FROM node:22-alpine AS base
WORKDIR /app
COPY package*.json ./

# ---- Dependencias (todas, incluidas dev) ----
FROM base AS deps
RUN npm install && npm cache clean --force

# ---- Build: genera la especificacion OpenAPI ----
FROM deps AS build
COPY . .
RUN node src/config/swagger.js

# ---- Desarrollo (docker compose) ----
FROM deps AS development
ENV NODE_ENV=development
COPY . .
EXPOSE 3001
CMD ["npm", "run", "dev"]

# ---- Produccion (etapa por defecto) ----
FROM node:22-alpine AS production
WORKDIR /app
ENV NODE_ENV=production
COPY package*.json ./
RUN npm install --omit=dev && npm cache clean --force
COPY --from=build /app/src ./src
EXPOSE 3001
CMD ["node", "src/app.js"]
