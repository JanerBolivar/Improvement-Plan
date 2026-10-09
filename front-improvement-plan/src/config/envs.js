/**
 * Módulo de configuración para variables de entorno consumidas por el frontend (Vite).
 * 
 * Proporciona constantes derivadas de las variables de entorno Vite definidas en el proyecto.
 * No se exponen valores secretos, únicamente nombres de variables.
 * 
 * @module config/envs
 */

/**
 * URL base del backend.
 * 
 * @constant {string|undefined}
 * @name urlBackend
 * @description Valor de `import.meta.env.VITE_URL_BACKEND` (nombre de variable de entorno Vite).
 */
export const urlBackend = import.meta.env.VITE_URL_BACKEND;

/**
 * URL base para los endpoints REST de la API.
 * 
 * @constant {string|undefined}
 * @name urlApi
 * @description Se construye como `${urlBackend}/api` a partir de {@link urlBackend}.
 */
export const urlApi = `${urlBackend}/api`;

/**
 * URL del endpoint/API para inicio de sesión SSO.
 * 
 * @constant {string|undefined}
 * @name urlApiLogin
 * @description Valor de `import.meta.env.VITE_API_LOGIN` (nombre de variable de entorno Vite).
 */
export const urlApiLogin = import.meta.env.VITE_API_LOGIN;