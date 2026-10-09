import { urlApi } from '../../config/envs';
import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';

/**
 * Componente que procesa la redirección del flujo de autenticación SSO.
 * 
 * Efectúa la validación y el intercambio de credenciales tras la redirección desde
 * el proveedor SSO. Extrae parámetros (token, user, error) desde la URL, valida
 * posibles errores, intenta decodificar datos del usuario (URL-decode o base64),
 * realiza petición POST a `${urlApi}/users/sso-login` y, si es exitosa, invoca
 * login() del AuthContext para establecer la sesión. Muestra estados de carga o error.
 * 
 * Estado que maneja (@state):
 * - errorMsg {string|null} - Mensaje de error a mostrar si falla la autenticación.
 * 
 * Contexto consumido (@context):
 * - useAuth(): { login }
 * 
 * Efectos secundarios (@effects):
 * - useEffect: ejecuta handleAuth() al montar/cambiar location/search; dependencia [location, login].
 * 
 * @returns {JSX.Element} Vista de carga, vista de error o redirección interna tras login exitoso.
 */
const AuthRedirect = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { login } = useAuth();
    const [errorMsg, setErrorMsg] = useState(null);

    useEffect(() => {
        const handleAuth = async () => {
            try {
                const params = new URLSearchParams(location.search);
                const errorParam = params.get('error');

                if (errorParam) {
                    let errorData;
                    try {
                        errorData = JSON.parse(decodeURIComponent(errorParam));
                    } catch {
                        errorData = { message: 'Error de autenticación.' };
                    }
                    setErrorMsg(errorData.message || 'Ocurrió un error en la autenticación.');
                    return;
                }

                const token = params.get('token');
                const userParam = params.get('user');

                if (token && userParam) {
                    let userData;
                    try {
                        userData = JSON.parse(decodeURIComponent(userParam));
                    } catch {
                        userData = JSON.parse(atob(userParam));
                    }

                    // Petición al backend de Interacción Académica para validar/registrar
                    const response = await axios.post(`${urlApi}/users/sso-login`, {
                        token,
                        user: userData
                    });

                    if (response.data && response.data.success) {
                        const { token: finalToken, user: finalUser } = response.data.data;

                        // Usamos la función login del contexto
                        login({ token: finalToken, user: finalUser });
                    } else {
                        throw new Error(response.data.message || 'La respuesta del servidor no fue exitosa');
                    }
                } else {
                    console.error('Faltan parámetros de autenticación en la URL');
                    setErrorMsg('Faltan parámetros de autenticación. Por favor, intente iniciar sesión nuevamente.');
                }
            } catch (err) {
                console.error('Error procesando la redirección de autenticación:', err);
                setErrorMsg('Error al iniciar sesión. Por favor, intente de nuevo.');
            }
        };

        handleAuth();
    }, [location, login]);

    if (errorMsg) {
        return (
            <div className="min-h-screen bg-ig-bg flex flex-col items-center justify-center p-6 text-ig-text-main font-sans">
                <div className="text-center space-y-10 animate-in fade-in zoom-in duration-500 max-w-sm">
                    <div className="flex justify-center">
                        <div className="w-20 h-20 bg-rose-500/10 rounded-2xl flex items-center justify-center border border-rose-500/20 text-rose-500 shadow-lg shadow-rose-500/10">
                            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                        </div>
                    </div>
                    <div className="space-y-3">
                        <h2 className="text-2xl font-bold tracking-tight">Error de Acceso</h2>
                        <p className="text-sm text-ig-text-secondary leading-relaxed px-6">
                            {errorMsg || 'No se pudo completar la autenticación institucional.'}
                        </p>
                    </div>
                    <button
                        onClick={() => navigate('/')}
                        className="ig-button-primary w-full py-3 text-sm font-bold tracking-tight shadow-xl shadow-ig-accent/20"
                    >
                        Volver al inicio
                    </button>
                    <div className="fixed bottom-12 text-center left-0 right-0">
                        <span className="text-[10px] font-bold text-ig-text-secondary uppercase tracking-[0.4em] opacity-30">
                            Plan de Mejoramiento &bull; CIIDES BIC
                        </span>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-ig-bg flex flex-col items-center justify-center font-sans p-6 text-ig-text-main">
            <div className="flex flex-col items-center gap-10">
                {/* Loader Premium */}
                <div className="relative group">
                    <div className="w-24 h-24 border-2 border-ig-border rounded-[2rem] animate-[spin_3s_linear_infinite]"></div>
                    <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-12 h-12 bg-ig-accent rounded-2xl animate-pulse flex items-center justify-center shadow-lg shadow-ig-accent/30">
                             <div className="w-2 h-2 bg-white rounded-full"></div>
                        </div>
                    </div>
                </div>

                <div className="text-center space-y-3">
                    <h2 className="text-2xl font-bold tracking-tight">Validando Acceso</h2>
                    <p className="text-ig-text-secondary text-sm font-medium tracking-wide animate-pulse">Sincronizando credenciales institucionales...</p>
                </div>
            </div>

            <div className="fixed bottom-12 text-center">
                <span className="text-[10px] font-bold text-ig-text-secondary uppercase tracking-[0.4em] opacity-30">
                    Plan de Mejoramiento &bull; CIIDES BIC
                </span>
            </div>
        </div>
    );
};

export default AuthRedirect;
