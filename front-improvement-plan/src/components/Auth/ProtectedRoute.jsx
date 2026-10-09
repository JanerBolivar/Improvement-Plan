import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

/**
 * Componente que restringe el acceso por autenticación y roles.
 * 
 * Valida el estado de autenticación y autorización del usuario. Mientras se verifica
 * la sesión (loading), muestra un loader. Si no está autenticado, redirige a "/".
 * Si el usuario no tiene ninguno de los roles permitidos, redirige a "/dashboard".
 * Si cumple con los criterios, renderiza las rutas hijas mediante <Outlet />.
 * 
 * Estado consumido (@context):
 * - useAuth(): { isAuthenticated, user, loading }
 * 
 * @param {Object} props - Propiedades del componente.
 * @param {string[]} [props.allowedRoles] - Lista de roles permitidos para acceder a la ruta.
 * @returns {JSX.Element} Loader, componente Navigate o <Outlet /> según validación.
 * @example
 * <Route element={<ProtectedRoute allowedRoles={['admin', 'coordinator']} />}>
 *   <Route path="programs" element={<ProgramsPage />} />
 * </Route>
 */
const ProtectedRoute = ({ allowedRoles }) => {
    const { isAuthenticated, user, loading } = useAuth();

    // Mientras se verifica la sesión, no renderizamos nada o un loader
    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50">
                <div className="w-12 h-12 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin"></div>
            </div>
        );
    }

    // Si no está autenticado, al Login (Home)
    if (!isAuthenticated) {
        return <Navigate to="/" replace />;
    }

    // Si el rol no está permitido, al Dashboard (Home del panel)
    if (allowedRoles && !allowedRoles.includes(user?.role)) {
        return <Navigate to="/dashboard" replace />;
    }

    // Si todo es correcto, renderiza las rutas hijas
    return <Outlet />;
};

export default ProtectedRoute;
