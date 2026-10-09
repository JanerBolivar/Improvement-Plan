import { useState } from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
    LayoutDashboard,
    BookOpen,
    Users,
    LogOut,
    ClipboardCheck,
    ShieldCheck,
    Search,
    CalendarDays
} from 'lucide-react';

/**
 * Componente que renderiza el layout principal del dashboard protegido.
 * 
 * Proporciona una estructura de navegación con sidebar (desktop), cabecera móvil,
 * área de contenido principal con <Outlet /> y barra de navegación inferior móvil.
 * Filtra elementos de menú según los roles del usuario autenticado y gestiona
 * el estado de apertura del menú "Más/Perfil" (con cierre al hacer clic externo implícito).
 * 
 * Estado que maneja (@state):
 * - isMoreOpen {boolean} - Controla la visibilidad del dropdown de perfil (desktop).
 * 
 * Contexto consumido (@context):
 * - useAuth(): { user, logout }
 * 
 * Efectos secundarios (@effects):
 * - Ninguno documentado (solo gestión de estado local).
 * 
 * @returns {JSX.Element} Elemento JSX que representa el layout del dashboard.
 */
const DashboardLayout = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const [isMoreOpen, setIsMoreOpen] = useState(false);

    const menuItems = [
        { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard, roles: ['admin', 'coordinator', 'teacher'] },
        { name: 'Seguimiento', path: '/dashboard/activities', icon: ClipboardCheck, roles: ['admin', 'coordinator', 'teacher'] },
        // Planes de Mejoramiento: scope admin + coordinator
        { name: 'Planes', path: '/dashboard/plans', icon: CalendarDays, roles: ['admin', 'coordinator'] },
        { name: 'Programas', path: '/dashboard/programs', icon: BookOpen, roles: ['admin', 'coordinator'] },
        { name: 'Usuarios', path: '/dashboard/users', icon: Users, roles: ['admin'] },
        { name: 'Administración', path: '/dashboard/admin', icon: ShieldCheck, roles: ['admin'] },
    ];

    const filteredMenu = menuItems.filter(item => item.roles.includes(user?.role));

    const handleLogout = () => {
        logout();
        navigate('/');
    };

    return (
        <div className="flex h-screen bg-[var(--ig-bg)] overflow-hidden transition-colors duration-300">
            {/* Desktop Sidebar */}
            <aside className="hidden lg:flex flex-col w-20 xl:w-72 border-r border-[var(--ig-border)] px-2 xl:px-3 pt-8 pb-4 transition-all duration-300">
                <div className="px-3 mb-10 text-center xl:text-left">
                    <h1 className="text-xl font-bold tracking-tight xl:px-1">C<span className="hidden xl:inline">IIDES</span></h1>
                </div>

                <nav className="flex-1">
                    {filteredMenu.map((item) => {
                        const isActive = location.pathname === item.path;
                        return (
                            <Link
                                key={item.path}
                                to={item.path}
                                className={`ig-nav-item group justify-center xl:justify-start ${isActive ? 'ig-nav-item-active' : ''}`}
                            >
                                <item.icon
                                    size={24}
                                    strokeWidth={isActive ? 3 : 2}
                                    className="transition-transform group-hover:scale-110"
                                />
                                <span className="text-base hidden xl:inline">{item.name}</span>
                            </Link>
                        );
                    })}
                </nav>

                <div className="px-3 mt-auto space-y-2">
                    <div className="relative">
                        {isMoreOpen && (
                            <div className="absolute bottom-full left-0 w-full mb-2 bg-[var(--ig-bg)] border border-[var(--ig-border)] rounded-xl shadow-xl overflow-hidden animate-in fade-in slide-in-from-bottom-2">
                                <div className="p-4 border-b border-[var(--ig-border)]">
                                    <p className="text-xs font-bold text-[var(--ig-text-secondary)] uppercase tracking-widest">{user?.role}</p>
                                    <p className="text-sm font-semibold truncate">{user?.name || user?.email}</p>
                                </div>
                                <button
                                    onClick={handleLogout}
                                    className="w-full flex items-center gap-3 p-4 text-red-500 hover:bg-[var(--ig-hover)] transition-colors font-semibold text-sm"
                                >
                                    <LogOut size={18} />
                                    Cerrar Sesión
                                </button>
                            </div>
                        )}
                        <button
                            onClick={() => setIsMoreOpen(!isMoreOpen)}
                            className="ig-nav-item group w-full justify-center xl:justify-start"
                        >
                            <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-yellow-400 via-red-500 to-purple-600 p-[1.5px] flex-shrink-0">
                                <div className="w-full h-full rounded-full bg-white flex items-center justify-center text-[10px] font-bold text-gray-800">
                                    {user?.name?.substring(0, 2).toUpperCase() || 'U'}
                                </div>
                            </div>
                            <span className="text-base hidden xl:inline">Perfil</span>
                        </button>
                    </div>
                </div>
            </aside>

            {/* Mobile Top Header */}
            <div className="lg:hidden fixed top-0 w-full bg-[var(--ig-bg)] border-b border-[var(--ig-border)] h-14 flex items-center justify-between px-4 z-50">
                <span className="font-bold text-lg">CIIDES</span>
                <div className="flex items-center gap-4">
                    <Search size={24} />
                    <LogOut size={24} className="text-red-500" onClick={handleLogout} />
                </div>
            </div>

            {/* Main Content Area */}
            <main className="flex-1 h-full overflow-y-auto lg:ml-0 mt-14 lg:mt-0 pb-16 lg:pb-0">
                <div className="max-w-screen-xl mx-auto">
                    <Outlet />
                </div>
            </main>

            {/* Mobile Bottom Navigation */}
            <nav className="lg:hidden fixed bottom-0 w-full bg-[var(--ig-bg)] border-t border-[var(--ig-border)] h-14 flex items-center justify-around px-2 z-50">
                {filteredMenu.slice(0, 5).map((item) => {
                    const isActive = location.pathname === item.path;
                    return (
                        <Link
                            key={item.path}
                            to={item.path}
                            className="p-2"
                        >
                            <item.icon
                                size={26}
                                strokeWidth={isActive ? 2.5 : 2}
                                className={isActive ? 'text-[var(--ig-text-main)]' : 'text-[var(--ig-text-secondary)]'}
                            />
                        </Link>
                    );
                })}
            </nav>
        </div>
    );
};

export default DashboardLayout;
