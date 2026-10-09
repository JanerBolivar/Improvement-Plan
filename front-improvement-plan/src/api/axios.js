import axios from 'axios';
import { urlApi } from '../config/envs';

/**
 * Instancia configurada de Axios para la comunicación con el backend.
 * 
 * @constant {import('axios').AxiosInstance}
 * @name api
 * @description Crea una instancia de axios con `baseURL` establecida a {@link urlApi}.
 */
const api = axios.create({
    baseURL: urlApi,
});

/**
 * Interceptor de peticiones (request).
 * 
 * Efecto: añade la cabecera `Authorization: Bearer <token>` si existe un token almacenado
 * en `localStorage.auth_data`. Lee `token` desde el objeto JSON almacenado.
 * 
 * @returns {import('axios').InternalAxiosRequestConfig} Configuración modificada o original.
 * @throws {Promise<Error>} Rechaza con el error recibido si ocurre.
 */
api.interceptors.request.use(
    (config) => {
        const storedData = localStorage.getItem('auth_data');
        if (storedData) {
            try {
                const { token } = JSON.parse(storedData);
                if (token) {
                    config.headers.Authorization = `Bearer ${token}`;
                }
            } catch {
                // Ignora errores de parseo de datos almacenados
            }
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

/**
 * Interceptor de respuestas (response).
 * 
 * Efecto: en caso de respuesta con estado HTTP 401, elimina `localStorage.auth_data` 
 * y redirige a la ruta raíz (`/`) para forzar nueva autenticación (gestión de token expirado).
 * 
 * @param {import('axios').AxiosResponse} response - Respuesta exitosa.
 * @returns {import('axios').AxiosResponse} Devuelve la respuesta sin modificar.
 * @param {import('axios').AxiosError} error - Error de respuesta.
 * @returns {Promise<Error>} Rechaza con el error recibido (tras posible redirección).
 */
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            localStorage.removeItem('auth_data');
            window.location.href = '/';
        }
        return Promise.reject(error);
    }
);

export default api;
