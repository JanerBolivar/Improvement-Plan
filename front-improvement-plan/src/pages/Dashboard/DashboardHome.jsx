import { useState, useEffect } from 'react';
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import {
    ClipboardList,
    CheckCircle2,
    AlertCircle,
    TrendingUp,
    Calendar,
    ArrowRight,
    Search,
    Loader2,
    CheckCircle,
    Filter,
    Layers,
    Award,
    MapPin,
    Activity
} from 'lucide-react';

/**
 * Componente que renderiza la página de inicio del dashboard (Dashboard Home).
 * 
 * Renderiza el panel de control con KPIs, filtros por programa/plan según rol
 * y análisis visual (distribución por estados, rendimiento por sede, avance por
 * líneas PDI y por factores/condiciones de calidad). Gestiona cargas desde API
 * (programs, plans, activities, users) y vinculación de programa (onboarding).
 * 
 * Estado que maneja (@state):
 * - programs {Array} - Lista de programas académicos.
 * - plans {Array} - Lista de planes de mejoramiento.
 * - selectedProgramId {string} - ID de programa seleccionado.
 * - selectedPlanId {string} - ID de plan seleccionado.
 * - activePlan {Object|null} - Plan activo resuelto.
 * - activities {Array} - Lista de actividades.
 * - loading {boolean} - Estado de carga general.
 * - loadingPlans {boolean} - Estado de carga de planes.
 * - selectedProgram {string|null} - Programa para vinculación.
 * - isSavingProgram {boolean} - Guardado de vinculación.
 * - stats {Object} - Métricas consolidadas.
 * 
 * Contexto consumido (@context): useAuth() → { user, updateSessionUser }.
 * 
 * Efectos secundarios (@effects):
 * - useEffect: inicializa filtros según rol/usuario. Dependencias: [user].
 * - useEffect: carga planes según selectedProgramId y rol. Dependencias: [selectedProgramId].
 * - useEffect: carga actividades y calcula estadísticas. Dependencias: [selectedPlanId, selectedProgramId, user].
 * 
 * Endpoints que consume: GET `/programs`, GET `/plans`, GET `/activities`, GET `/users` (condicional).
 * 
 * @returns {JSX.Element} Elemento JSX que representa el dashboard home.
 */
const DashboardHome = () => {
    const { user, updateSessionUser } = useAuth();
    
    // Definición de variables de estado destinadas al control y filtrado reactivo del dashboard
    const [programs, setPrograms] = useState([]);
    const [plans, setPlans] = useState([]);
    const [selectedProgramId, setSelectedProgramId] = useState('');
    const [selectedPlanId, setSelectedPlanId] = useState('');
    const [activePlan, setActivePlan] = useState(null);
    
    // Estados contenedores para los registros de actividades y el control de flujos de carga (loaders)
    const [activities, setActivities] = useState([]);
    const [loading, setLoading] = useState(true);
    const [loadingPlans, setLoadingPlans] = useState(false);
    
    // Variables de estado auxiliares destinadas al proceso de onboarding y vinculación de programa
    const [selectedProgram, setSelectedProgram] = useState(null);
    const [isSavingProgram, setIsSavingProgram] = useState(false);

    const [stats, setStats] = useState({
        totalActivities: 0,
        totalSubActivities: 0,
        totalUsers: 0,
        completedActivities: 0,
        pendingActivities: 0,
        overdueActivities: 0,
        averageProgress: 0,
        statusCounts: {
            ejecutado: 0,
            vencido: 0,
            ejecucion: 0,
            noEjecutado: 0
        }
    });

    // Efecto secundario: Inicialización de filtros y resolución del Programa Académico según el rol (RBAC)
    useEffect(() => {
        const initFilters = async () => {
            try {
                setLoading(true);
                if (user?.role === 'admin') {
                    const progRes = await api.get('/programs');
                    const availablePrograms = progRes.data.data || [];
                    setPrograms(availablePrograms);

                    // Selección del programa académico por defecto según el perfil cargado
                    const defaultProg = user?.program?._id || user?.program || availablePrograms[0]?._id;
                    if (defaultProg) {
                        setSelectedProgramId(defaultProg);
                    } else {
                        setLoading(false);
                    }
                } else {
                    const progId = user?.program?._id || user?.program;
                    if (progId) {
                        setSelectedProgramId(progId);
                    } else {
                        setLoading(false);
                    }
                }
            } catch (error) {
                console.error('Error al inicializar filtros:', error);
                setLoading(false);
            }
        };

        if (user) {
            initFilters();
        }
    }, [user]);

    // Efecto secundario: Consulta y recuperación de Planes de Mejoramiento en función del Programa Académico seleccionado
    useEffect(() => {
        const fetchPlans = async () => {
            if (!selectedProgramId) return;
            try {
                setLoadingPlans(true);
                const params = user?.role === 'admin' ? { programId: selectedProgramId } : {};
                const plansRes = await api.get('/plans', { params });
                const availablePlans = plansRes.data.data || [];
                setPlans(availablePlans);

                const active = availablePlans.find(p => p.isActive);
                if (active) {
                    setSelectedPlanId(active._id);
                    setActivePlan(active);
                } else if (availablePlans.length > 0) {
                    setSelectedPlanId(availablePlans[0]._id);
                    setActivePlan(availablePlans[0]);
                } else {
                    setSelectedPlanId('');
                    setActivePlan(null);
                }
            } catch (error) {
                console.error('Error al obtener planes del programa:', error);
            } finally {
                setLoadingPlans(false);
            }
        };

        fetchPlans();
    }, [selectedProgramId]);

    // Efecto secundario: Agregación de actividades y cálculo dinámico de métricas y KPIs consolidados
    useEffect(() => {
        const fetchActivitiesAndStats = async () => {
            if (user?.role !== 'teacher' && !selectedPlanId) {
                setActivities([]);
                setLoading(false);
                return;
            }

            try {
                setLoading(true);
                const params = {};
                if (user?.role === 'admin') {
                    params.programId = selectedProgramId;
                    params.planId = selectedPlanId;
                } else if (user?.role === 'coordinator') {
                    params.planId = selectedPlanId;
                }
                
                const actRes = await api.get('/activities', { params });
                const loadedActivities = actRes.data.data || [];
                setActivities(loadedActivities);

                // Procedimiento de agregación métrica para el cálculo de estados y cumplimiento
                const totalActs = loadedActivities.length;
                const completed = loadedActivities.filter(a => a.status === 'Ejecutado').length;
                const overdue = loadedActivities.filter(a => a.status === 'Vencido').length;
                const inProgress = loadedActivities.filter(a => a.status === 'En ejecución' || a.status === 'Por Vencer').length;
                const notStarted = totalActs - completed - overdue - inProgress;

                const allSubActs = loadedActivities.flatMap(a => a.subActivities || []);
                const totalSubActs = allSubActs.length;

                // Cálculo del promedio ponderado de avance acumulado en subactividades
                const avgProgress = totalSubActs > 0
                    ? Math.round(allSubActs.reduce((sum, sa) => sum + (sa.progressPercent || 0), 0) / totalSubActs)
                    : 0;

                // Consulta en paralelo para determinar el volumen total de usuarios (Solo perfiles directivos)
                let userCount = 0;
                if (['admin', 'coordinator'].includes(user?.role)) {
                    try {
                        const userRes = await api.get('/users');
                        userCount = userRes.data.data.length;
                    } catch { /* ignore */ }
                }

                setStats({
                    totalActivities: totalActs,
                    totalSubActivities: totalSubActs,
                    totalUsers: userCount,
                    completedActivities: completed,
                    pendingActivities: inProgress + notStarted,
                    overdueActivities: overdue,
                    averageProgress: avgProgress,
                    statusCounts: {
                        ejecutado: completed,
                        vencido: overdue,
                        ejecucion: inProgress,
                        noEjecutado: notStarted
                    }
                });
            } catch (error) {
                console.error('Error al cargar métricas del dashboard:', error);
            } finally {
                setLoading(false);
            }
        };

        if (user) {
            fetchActivitiesAndStats();
        }
    }, [selectedPlanId, selectedProgramId, user]);

    const handleAssignProgram = async () => {
        if (!selectedProgram) return;
        try {
            setIsSavingProgram(true);
            const res = await api.put('/users/me/program', { programId: selectedProgram });
            updateSessionUser(res.data.data);
            window.location.reload();
        } catch (error) {
            console.error('Error asignando programa:', error);
            alert('Error al asignar el programa');
        } finally {
            setIsSavingProgram(false);
        }
    };

    // Función de agregación y agrupamiento de estadísticas orientadas a las Líneas Estratégicas del PDI
    const getPdiLineStats = () => {
        const lines = {};
        activities.forEach(act => {
            (act.subActivities || []).forEach(sub => {
                const lineName = sub.pdiLine || 'Sin clasificar';
                if (!lines[lineName]) {
                    lines[lineName] = { sum: 0, count: 0 };
                }
                lines[lineName].sum += sub.progressPercent || 0;
                lines[lineName].count += 1;
            });
        });

        return Object.entries(lines).map(([name, data]) => ({
            name,
            count: data.count,
            progress: Math.round(data.sum / data.count)
        })).sort((a, b) => b.progress - a.progress);
    };

    // Función de agregación y agrupamiento de progreso por Factor/Condición de Calidad
    const getQualityFactorStats = () => {
        const factors = {};
        activities.forEach(act => {
            (act.subActivities || []).forEach(sub => {
                const factorName = sub.qualityFactor || 'Sin clasificar';
                if (!factors[factorName]) {
                    factors[factorName] = { sum: 0, count: 0 };
                }
                factors[factorName].sum += sub.progressPercent || 0;
                factors[factorName].count += 1;
            });
        });

        return Object.entries(factors).map(([name, data]) => ({
            name,
            count: data.count,
            progress: Math.round(data.sum / data.count)
        })).sort((a, b) => b.progress - a.progress);
    };

    // Función de agregación y segmentación de rendimiento por Sede (Campus)
    const getCampusStats = () => {
        const campuses = {};
        activities.forEach(act => {
            (act.subActivities || []).forEach(sub => {
                const campusName = sub.campus || 'Sede Principal';
                if (!campuses[campusName]) {
                    campuses[campusName] = { sum: 0, count: 0 };
                }
                campuses[campusName].sum += sub.progressPercent || 0;
                campuses[campusName].count += 1;
            });
        });

        return Object.entries(campuses).map(([name, data]) => ({
            name,
            count: data.count,
            progress: Math.round(data.sum / data.count)
        })).sort((a, b) => b.progress - a.progress);
    };

    const pdiLines = getPdiLineStats();
    const qualityFactors = getQualityFactorStats();
    const campuses = getCampusStats();

    // Utilidades de renderizado condicional para la definición de paletas semafóricas (visual mapping)
    const getProgressColor = (pct) => {
        if (pct >= 70) return 'from-emerald-500 to-teal-400';
        if (pct >= 45) return 'from-amber-500 to-orange-400';
        return 'from-rose-500 to-red-400';
    };

    const getProgressBg = (pct) => {
        if (pct >= 70) return 'bg-emerald-50 text-emerald-700 border-emerald-200';
        if (pct >= 45) return 'bg-amber-50 text-amber-700 border-amber-200';
        return 'bg-rose-50 text-rose-700 border-rose-200';
    };

    return (
        <div className="p-4 lg:p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
            {/* Vista de contingencia: Formulario de vinculación obligatoria ante ausencia de programa académico */}
            {!user?.program && (
                <div className="relative overflow-hidden bg-[#1a1a1a] border border-white/5 rounded-[2rem] p-8 md:p-12 shadow-2xl animate-in slide-in-from-top-8 duration-700">
                    <div className="absolute top-0 right-0 -mt-20 -mr-20 w-80 h-80 bg-ig-accent/10 rounded-full blur-[100px] pointer-events-none" />
                    <div className="absolute bottom-0 left-0 -mb-20 -ml-20 w-80 h-80 bg-blue-500/10 rounded-full blur-[100px] pointer-events-none" />

                    <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-10">
                        <div className="space-y-4 text-center lg:text-left max-w-xl">
                            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-white/50 text-[10px] font-bold uppercase tracking-[0.2em]">
                                <AlertCircle size={14} className="text-ig-accent" /> Configuración Inicial
                            </div>
                            <h2 className="text-3xl md:text-4xl font-bold text-white tracking-tight">
                                Personalice su <span className="text-ig-accent">Experiencia.</span>
                            </h2>
                            <p className="text-base text-white/60 leading-relaxed">
                                Para habilitar la gestión de compromisos y reportes institucionales, por favor vincule su cuenta con el programa académico correspondiente.
                            </p>
                        </div>

                        <div className="w-full lg:w-auto flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
                            <div className="relative group min-w-[300px]">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30 group-focus-within:text-ig-accent transition-colors" size={18} />
                                <select
                                    className="w-full pl-12 pr-10 py-4 bg-white/5 border border-white/10 rounded-2xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-ig-accent/50 focus:border-ig-accent transition-all appearance-none cursor-pointer hover:bg-white/10"
                                    value={selectedProgram || ''}
                                    onChange={(e) => setSelectedProgram(e.target.value)}
                                >
                                    <option value="" className="text-gray-900">Seleccionar programa...</option>
                                    {programs.map(p => (
                                        <option key={p._id} value={p._id} className="text-gray-900">
                                            {p.name}
                                        </option>
                                    ))}
                                </select>
                                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-white/30">
                                    <ArrowRight size={16} className="rotate-90" />
                                </div>
                            </div>

                            <button
                                onClick={handleAssignProgram}
                                disabled={!selectedProgram || isSavingProgram}
                                className="ig-button-primary h-[54px] px-10 flex items-center justify-center gap-3 shadow-xl shadow-ig-accent/20 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-30 disabled:hover:scale-100"
                            >
                                {isSavingProgram ? <Loader2 className="animate-spin" size={20} /> : <CheckCircle size={20} />}
                                <span className="font-bold tracking-tight">Vincular Ahora</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Sección de presentación e identificación del panel del sistema */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <h1 className="text-2xl font-bold tracking-tight text-gray-900">Panel de Control</h1>
                        <span className="px-2 py-0.5 text-[10px] font-black uppercase tracking-wider bg-indigo-50 text-indigo-600 border border-indigo-200 rounded-full">
                            BI Console
                        </span>
                    </div>
                    <p className="text-sm text-gray-500">Estadísticas avanzadas del plan de mejoramiento institucional</p>
                </div>

                {/* Consola de filtros interactivos tipo Power BI (Controles de segmentación) */}
                <div className="flex flex-wrap items-center gap-3 bg-white p-2.5 rounded-2xl border border-gray-100 shadow-sm">
                    <div className="flex items-center gap-1 text-gray-400 text-xs font-bold px-2 uppercase">
                        <Filter size={14} /> Filtros:
                    </div>

                    {/* Control de segmentación por Programa Académico (Restringido a privilegios 'admin') */}
                    {user?.role === 'admin' ? (
                        <div className="relative">
                            <select
                                className="pl-3 pr-8 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-700 focus:outline-none focus:ring-1 focus:ring-indigo-500 appearance-none cursor-pointer min-w-[180px]"
                                value={selectedProgramId}
                                onChange={(e) => setSelectedProgramId(e.target.value)}
                            >
                                <option value="">Seleccionar programa...</option>
                                {programs.map(p => (
                                    <option key={p._id} value={p._id}>{p.name}</option>
                                ))}
                            </select>
                            <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                                <ArrowRight size={10} className="rotate-90" />
                            </div>
                        </div>
                    ) : (
                        user?.program && (
                            <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-700 flex items-center gap-1.5">
                                <Layers size={12} className="text-indigo-500" />
                                <span>{user.program.name}</span>
                            </div>
                        )
                    )}

                    {/* Control de segmentación por Plan de Mejoramiento (Habilitado para 'admin' y 'coordinator') */}
                    {['admin', 'coordinator'].includes(user?.role) ? (
                        <div className="relative">
                            <select
                                className="pl-3 pr-8 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-700 focus:outline-none focus:ring-1 focus:ring-indigo-500 appearance-none cursor-pointer min-w-[160px]"
                                value={selectedPlanId}
                                onChange={(e) => setSelectedPlanId(e.target.value)}
                                disabled={loadingPlans}
                            >
                                {loadingPlans ? (
                                    <option>Cargando planes...</option>
                                ) : plans.length > 0 ? (
                                    plans.map(p => (
                                        <option key={p._id} value={p._id}>
                                            {p.name} {p.isActive ? '(Activo)' : ''}
                                        </option>
                                    ))
                                ) : (
                                    <option value="">Sin planes registrados</option>
                                )}
                            </select>
                            <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                                <ArrowRight size={10} className="rotate-90" />
                            </div>
                        </div>
                    ) : (
                        activePlan && (
                            <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-700 flex items-center gap-1.5">
                                <Calendar size={12} className="text-indigo-500" />
                                <span>Plan Activo: {activePlan.name}</span>
                            </div>
                        )
                    )}
                </div>
            </div>

            {/* Fila de indicadores clave de rendimiento (KPI Cards) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                {/* Componente métrico: Porcentaje de avance consolidado radial */}
                <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between group hover:shadow-md transition-shadow">
                    <div className="space-y-1">
                        <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Avance del Plan</p>
                        <h3 className="text-2xl font-black text-gray-800">{loading ? '...' : `${stats.averageProgress}%`}</h3>
                        <p className="text-[10px] text-gray-400">Promedio de subactividades</p>
                    </div>
                    <div className="relative w-16 h-16 flex items-center justify-center">
                        <svg className="w-full h-full transform -rotate-90">
                            <circle cx="32" cy="32" r="26" className="stroke-gray-100" strokeWidth="5" fill="transparent" />
                            <circle cx="32" cy="32" r="26" className="stroke-indigo-500 transition-all duration-1000" strokeWidth="5" fill="transparent"
                                    strokeDasharray={2 * Math.PI * 26}
                                    strokeDashoffset={2 * Math.PI * 26 * (1 - (loading ? 0 : stats.averageProgress) / 100)} />
                        </svg>
                        <span className="absolute text-[11px] font-extrabold text-indigo-600">{loading ? '0%' : `${stats.averageProgress}%`}</span>
                    </div>
                </div>

                {/* Componente métrico: Volumen total de hallazgos */}
                <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4 group hover:shadow-md transition-shadow">
                    <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
                        <ClipboardList size={22} />
                    </div>
                    <div>
                        <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Hallazgos Totales</p>
                        <h3 className="text-2xl font-black text-gray-800">{loading ? '...' : stats.totalActivities}</h3>
                        <p className="text-[10px] text-gray-400">Acciones del plan actual</p>
                    </div>
                </div>

                {/* Componente métrico: Volumen total de subactividades */}
                <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4 group hover:shadow-md transition-shadow">
                    <div className="p-3 bg-purple-50 text-purple-600 rounded-xl">
                        <Activity size={22} />
                    </div>
                    <div>
                        <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Subactividades</p>
                        <h3 className="text-2xl font-black text-gray-800">{loading ? '...' : stats.totalSubActivities}</h3>
                        <p className="text-[10px] text-gray-400">Elementos bajo seguimiento</p>
                    </div>
                </div>

                {/* Componente métrico: Índice de cumplimiento normativo temporal */}
                <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4 group hover:shadow-md transition-shadow">
                    <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
                        <CheckCircle2 size={22} />
                    </div>
                    <div>
                        <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Tasa Cumplimiento</p>
                        <h3 className="text-2xl font-black text-gray-800">
                            {loading ? '...' : `${stats.totalActivities > 0 ? Math.round(((stats.totalActivities - stats.overdueActivities) / stats.totalActivities) * 100) : 0}%`}
                        </h3>
                        <p className="text-[10px] text-gray-400">Actividades no vencidas</p>
                    </div>
                </div>
            </div>

            {/* Primera sección de analítica visual: Distribución de estados y rendimiento geográfico */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Gráfico de distribución porcentual por estado operativo */}
                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-6">
                    <div>
                        <h3 className="text-xs font-black uppercase tracking-wider text-gray-400 mb-1 flex items-center gap-1.5">
                            <TrendingUp size={14} /> Distribución de Estados
                        </h3>
                        <p className="text-[11px] text-gray-400">Avance relativo del estado de actividades</p>
                    </div>

                    <div className="space-y-4">
                        {/* Ejecutados */}
                        <div className="space-y-1">
                            <div className="flex justify-between items-center text-xs">
                                <span className="font-bold text-gray-600 flex items-center gap-1">
                                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                                    Ejecutados
                                </span>
                                <span className="font-black text-emerald-600">{stats.statusCounts.ejecutado}</span>
                            </div>
                            <div className="w-full h-2 bg-gray-50 rounded-full overflow-hidden">
                                <div className="h-full bg-emerald-500 rounded-full transition-all duration-1000"
                                     style={{ width: `${stats.totalActivities > 0 ? (stats.statusCounts.ejecutado / stats.totalActivities) * 100 : 0}%` }} />
                            </div>
                        </div>

                        {/* En ejecución */}
                        <div className="space-y-1">
                            <div className="flex justify-between items-center text-xs">
                                <span className="font-bold text-gray-600 flex items-center gap-1">
                                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                                    En ejecución
                                </span>
                                <span className="font-black text-amber-600">{stats.statusCounts.ejecucion}</span>
                            </div>
                            <div className="w-full h-2 bg-gray-50 rounded-full overflow-hidden">
                                <div className="h-full bg-amber-500 rounded-full transition-all duration-1000"
                                     style={{ width: `${stats.totalActivities > 0 ? (stats.statusCounts.ejecucion / stats.totalActivities) * 100 : 0}%` }} />
                            </div>
                        </div>

                        {/* Vencidos */}
                        <div className="space-y-1">
                            <div className="flex justify-between items-center text-xs">
                                <span className="font-bold text-gray-600 flex items-center gap-1">
                                    <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                                    Vencidos
                                </span>
                                <span className="font-black text-rose-600">{stats.statusCounts.vencido}</span>
                            </div>
                            <div className="w-full h-2 bg-gray-50 rounded-full overflow-hidden">
                                <div className="h-full bg-rose-500 rounded-full transition-all duration-1000"
                                     style={{ width: `${stats.totalActivities > 0 ? (stats.statusCounts.vencido / stats.totalActivities) * 100 : 0}%` }} />
                            </div>
                        </div>

                        {/* No ejecutados */}
                        <div className="space-y-1">
                            <div className="flex justify-between items-center text-xs">
                                <span className="font-bold text-gray-600 flex items-center gap-1">
                                    <span className="w-2.5 h-2.5 rounded-full bg-gray-400" />
                                    No ejecutados
                                </span>
                                <span className="font-black text-gray-600">{stats.statusCounts.noEjecutado}</span>
                            </div>
                            <div className="w-full h-2 bg-gray-50 rounded-full overflow-hidden">
                                <div className="h-full bg-gray-400 rounded-full transition-all duration-1000"
                                     style={{ width: `${stats.totalActivities > 0 ? (stats.statusCounts.noEjecutado / stats.totalActivities) * 100 : 0}%` }} />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Visualización analítica de rendimiento geográfico */}
                <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-6">
                    <div>
                        <h3 className="text-xs font-black uppercase tracking-wider text-gray-400 mb-1 flex items-center gap-1.5">
                            <MapPin size={14} className="text-rose-500" /> Rendimiento por Sede
                        </h3>
                        <p className="text-[11px] text-gray-400">Cumplimiento promedio ponderado por ubicación de subactividad</p>
                    </div>

                    {loading ? (
                        <div className="text-center py-10 text-gray-400 text-xs">Cargando datos...</div>
                    ) : campuses.length > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {campuses.map((c, i) => (
                                <div key={i} className="p-4 bg-gray-50 rounded-xl border border-gray-100 space-y-2">
                                    <div className="flex justify-between items-center">
                                        <span className="text-xs font-bold text-gray-700">{c.name}</span>
                                        <span className={`px-2 py-0.5 text-[9px] font-black rounded-full border ${getProgressBg(c.progress)}`}>
                                            {c.progress}%
                                        </span>
                                    </div>
                                    <div className="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden">
                                        <div className={`h-full bg-gradient-to-r ${getProgressColor(c.progress)} rounded-full`}
                                             style={{ width: `${c.progress}%` }} />
                                    </div>
                                    <p className="text-[9px] text-gray-400">{c.count} subactividades asignadas</p>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-10 text-gray-400 text-xs">No hay datos por sede para este plan.</div>
                    )}
                </div>
            </div>

            {/* Segunda sección de analítica visual: Alineación estratégica PDI y condiciones de calidad */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                
                {/* Gráfico de alineación y avance por Línea Estratégica PDI */}
                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-6">
                    <div>
                        <h3 className="text-xs font-black uppercase tracking-wider text-gray-400 mb-1 flex items-center gap-1.5">
                            <Layers size={14} className="text-indigo-500" /> Avance por Línea Estratégica PDI
                        </h3>
                        <p className="text-[11px] text-gray-400">Progreso consolidado según la planeación estratégica PDI</p>
                    </div>

                    {loading ? (
                        <div className="text-center py-10 text-gray-400 text-xs">Cargando datos...</div>
                    ) : pdiLines.length > 0 ? (
                        <div className="space-y-4">
                            {pdiLines.map((line, i) => (
                                <div key={i} className="space-y-1.5">
                                    <div className="flex justify-between items-start text-xs gap-4">
                                        <span className="font-bold text-gray-600 truncate max-w-[80%]" title={line.name}>
                                            {line.name}
                                        </span>
                                        <span className="font-black text-gray-800">{line.progress}%</span>
                                    </div>
                                    <div className="relative w-full h-3 bg-gray-50 rounded-full overflow-hidden border border-gray-100">
                                        <div className={`h-full bg-gradient-to-r ${getProgressColor(line.progress)} rounded-full transition-all duration-1000`}
                                             style={{ width: `${line.progress}%` }} />
                                    </div>
                                    <div className="flex justify-between text-[9px] text-gray-400">
                                        <span>PDI Line Registry</span>
                                        <span>{line.count} subactividades</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-10 text-gray-400 text-xs">No hay líneas PDI registradas en este plan.</div>
                    )}
                </div>

                {/* Gráfico de avance acumulado por Factores/Condiciones de Calidad */}
                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-6">
                    <div>
                        <h3 className="text-xs font-black uppercase tracking-wider text-gray-400 mb-1 flex items-center gap-1.5">
                            <Award size={14} className="text-yellow-500" /> Progreso por Factor / Condición de Calidad
                        </h3>
                        <p className="text-[11px] text-gray-400">Cumplimiento según las condiciones de calidad institucional</p>
                    </div>

                    {loading ? (
                        <div className="text-center py-10 text-gray-400 text-xs">Cargando datos...</div>
                    ) : qualityFactors.length > 0 ? (
                        <div className="space-y-4">
                            {qualityFactors.map((f, i) => (
                                <div key={i} className="space-y-1.5">
                                    <div className="flex justify-between items-start text-xs gap-4">
                                        <span className="font-bold text-gray-600 truncate max-w-[80%]" title={f.name}>
                                            {f.name}
                                        </span>
                                        <span className="font-black text-gray-800">{f.progress}%</span>
                                    </div>
                                    <div className="relative w-full h-3 bg-gray-50 rounded-full overflow-hidden border border-gray-100">
                                        <div className={`h-full bg-gradient-to-r ${getProgressColor(f.progress)} rounded-full transition-all duration-1000`}
                                             style={{ width: `${f.progress}%` }} />
                                    </div>
                                    <div className="flex justify-between text-[9px] text-gray-400">
                                        <span>Calidad Factor</span>
                                        <span>{f.count} subactividades</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-10 text-gray-400 text-xs">No hay factores de calidad registrados en este plan.</div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default DashboardHome;
