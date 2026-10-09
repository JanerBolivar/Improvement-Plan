import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";

/**
 * Contexto React para la gestión de autenticación.
 * 
 * @constant {import('react').Context<Object|null>}
 * @name AuthContext
 */
const AuthContext = createContext();

/**
 * Proveedor de autenticación (AuthProvider).
 * 
 * Gestiona el estado de autenticación global: usuario, token, estado de carga (loading)
 * y proporciona funciones para login, logout y actualización de datos de sesión.
 * 
 * Estado que maneja (@state):
 * - user {Object|null} - Datos del usuario autenticado (estructura según backend).
 * - token {string|null} - Token JWT de autenticación.
 * - loading {boolean} - Indica si se está verificando/restaurando la sesión (true durante inicialización).
 * 
 * Efectos secundarios (@effects):
 * - useEffect de inicialización: verifica `localStorage.auth_data`, comprueba expiración (SESSION_DURATION 8h),
 *   restaura sesión si válida o ejecuta logout si expirada. Ejecuta una única vez al montar el proveedor
 *   (dependencia [logout]).
 * 
 * Contexto consumido: AuthContext (valor proporcionado a consumidores).
 * 
 * @param {Object} props - Propiedades del componente.
 * @param {import('react').ReactNode} props.children - Elementos hijos a los que se provee el contexto.
 * @returns {JSX.Element} Proveedor de AuthContext con sus hijos renderizados cuando loading es false.
 */
export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [token, setToken] = useState(null);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    const SESSION_DURATION = 8 * 60 * 60 * 1000; // 8 horas en milisegundos

    const logout = useCallback(() => {
        localStorage.removeItem("auth_data");
        setUser(null);
        setToken(null);
        navigate("/");
    }, [navigate]);

    /**
     * Efectúa el inicio de sesión del usuario.
     * 
     * Almacena los datos de autenticación en localStorage con tiempo de expiración (8 horas)
     * y actualiza el estado global (user, token), redirigiendo a la ruta especificada.
     * 
     * @param {Object} authData - Datos de autenticación recibidos del flujo SSO/backend.
     * @param {Object} authData.user - Datos del usuario.
     * @param {string} authData.token - Token JWT.
     * @param {string} [redirectPath="/dashboard"] - Ruta a la que redirigir tras login.
     * @returns {void}
     */
    const login = (authData, redirectPath = "/dashboard") => {
        const expirationTime = new Date().getTime() + SESSION_DURATION;
        const dataToSave = {
            ...authData, // Contiene user y token de tu API
            expiresAt: expirationTime,
        };

        localStorage.setItem("auth_data", JSON.stringify(dataToSave));
        setUser(authData.user);
        setToken(authData.token);
        navigate(redirectPath);
    };

    /**
     * Actualiza los datos del usuario en la sesión activa.
     * 
     * Modifica el estado global (user) y persiste la actualización en localStorage.auth_data.
     * 
     * @param {Object} newUserData - Nuevos datos del usuario a persistir.
     * @returns {void}
     */
    const updateSessionUser = (newUserData) => {
        setUser(newUserData);
        const storedData = localStorage.getItem("auth_data");
        if (storedData) {
            try {
                const parsedData = JSON.parse(storedData);
                parsedData.user = newUserData;
                localStorage.setItem("auth_data", JSON.stringify(parsedData));
            } catch {
                // Ignora errores de parseo
            }
        }
    };

    useEffect(() => {
        const checkAuth = () => {
            const storedData = localStorage.getItem("auth_data");

            if (!storedData) {
                setLoading(false);
                return;
            }

            const parsedData = JSON.parse(storedData);
            const currentTime = new Date().getTime();

            if (currentTime > parsedData.expiresAt) {
                // La sesión caducó
                logout();
            } else {
                setUser(parsedData.user);
                setToken(parsedData.token);
            }
            setLoading(false);
        };

        checkAuth();
    }, [logout]);

    /**
     * Valor que provee el contexto de autenticación.
     * 
     * @type {Object}
     * @property {Object|null} user - Usuario autenticado.
     * @property {string|null} token - Token JWT.
     * @property {Function} login - Función para iniciar sesión.
     * @property {Function} logout - Función para cerrar sesión (memoizada).
     * @property {Function} updateSessionUser - Función para actualizar datos de usuario.
     * @property {boolean} isAuthenticated - True si existe token válido.
     * @property {boolean} loading - Estado de carga de sesión.
     */
    const contextValue = { user, token, login, logout, updateSessionUser, isAuthenticated: !!token, loading };

    return (
        <AuthContext.Provider value={contextValue}>
            {!loading && children}
        </AuthContext.Provider>
    );
};

/**
 * Hook para consumir el contexto de autenticación.
 * 
 * @returns {Object} Valor del contexto AuthContext (user, token, login, logout, updateSessionUser, isAuthenticated, loading).
 * @throws {Error} Lanza error si no se utiliza dentro de un AuthProvider.
 */
export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) throw new Error("useAuth debe usarse dentro de un AuthProvider");
    return context;
};