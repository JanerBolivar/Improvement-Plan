import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import HomePage from './pages/GeneralPages/HomePage';
import AuthRedirect from './pages/AuthPages/AuthRedirect';
import NotFound from './pages/GeneralPages/NotFound';
import ProtectedRoute from './components/Auth/ProtectedRoute';
import DashboardLayout from './components/Layout/DashboardLayout';
import ProgramsPage from './pages/Dashboard/ProgramsPage';
import UsersPage from './pages/Dashboard/UsersPage';
import AdminPage from './pages/Dashboard/AdminPage';
import ActivitiesPage from './pages/Dashboard/ActivitiesPage';
import ImprovementPlansPage from './pages/Dashboard/ImprovementPlansPage';
import DashboardHome from './pages/Dashboard/DashboardHome';
import SubActivityTrackingPage from './pages/Dashboard/SubActivityTrackingPage';


/**
 * Componente raíz de la aplicación.
 * 
 * Renderiza el árbol de rutas de la SPA (React Router 7), proporcionando
 * el contexto de autenticación (AuthProvider) a toda la aplicación.
 * 
 * Estructura de enrutamiento:
 * - Rutas públicas: "/" (HomePage), "/auth/callback" (AuthRedirect)
 * - Rutas protegidas: /dashboard (DashboardLayout) con roles permitidos ["admin", "coordinator", "teacher"]
 *   - index: DashboardHome
 *   - "/dashboard/activities": ActivitiesPage
 *   - "/dashboard/activities/tracking/:activityId/:subActivityId": SubActivityTrackingPage
 *   - Subrutas anidadas con roles adicionales:
 *     - roles ["admin", "coordinator"]: "/dashboard/programs" (ProgramsPage), "/dashboard/plans" (ImprovementPlansPage)
 *     - roles ["admin"]: "/dashboard/users" (UsersPage), "/dashboard/admin" (AdminPage)
 * - Ruta catch-all: "*" → NotFound
 * 
 * @returns {JSX.Element} Elemento JSX que representa el árbol de rutas y proveedores.
 */
function App() {
  return (
    <Router>
      <AuthProvider>
        <Routes>
          {/* Rutas Públicas */}
          <Route path="/" element={<HomePage />} />
          <Route path="/auth/callback" element={<AuthRedirect />} />

          {/* Rutas Protegidas / Dashboard */}
          <Route element={<ProtectedRoute allowedRoles={['admin', 'coordinator', 'teacher']} />}>
            <Route path="/dashboard" element={<DashboardLayout />}>
              <Route index element={<DashboardHome />} />
              <Route path="activities" element={<ActivitiesPage />} />
              <Route path="activities/tracking/:activityId/:subActivityId" element={<SubActivityTrackingPage />} />

              {/* Programas - Solo Admin y Coordinador */}
              <Route element={<ProtectedRoute allowedRoles={['admin', 'coordinator']} />}>
                <Route path="programs" element={<ProgramsPage />} />
                {/* Planes de Mejoramiento - Admin y Coordinator con scope propio */}
                <Route path="plans" element={<ImprovementPlansPage />} />
              </Route>

              {/* Usuarios - Solo Admin */}
              <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
                <Route path="users" element={<UsersPage />} />
              </Route>

              {/* Admin - Solo Admin */}
              <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
                <Route path="admin" element={<AdminPage />} />
              </Route>
            </Route>
          </Route>

          {/* Ruta 404 */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </AuthProvider>
    </Router>
  );
}

export default App;
