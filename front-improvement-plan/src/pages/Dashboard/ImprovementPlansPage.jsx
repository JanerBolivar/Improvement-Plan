import React, { useState, useEffect, useCallback } from 'react';
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import {
    Plus, Edit, Trash2, CheckCircle2, X, Loader2,
    Calendar, BookOpen, AlertCircle, ToggleLeft, ToggleRight,
    ChevronDown, FileText, Clock, Copy
} from 'lucide-react';

/**
 * ImprovementPlansPage
 *
 * Vista de gestión de Planes de Mejoramiento por vigencia.
 * RBAC: Admin visualiza y gestiona planes de todos los programas.
 *       Coordinator está scopeado a su propio programa.
 */
/**
 * Componente que renderiza la página de gestión de Planes de Mejoramiento (Improvement Plans).
 * 
 * Renderiza la vista para crear, listar y gestionar planes de mejoramiento.
 * Gestiona estado local para planes, programas, catálogos, carga y modal de formulario.
 * 
 * Estado que maneja (@state):
 * - plans {Array} - Lista de planes de mejoramiento.
 * - programs {Array} - Lista de programas.
 * - catalogs {Object} - Catálogos necesarios.
 * - loading {boolean} - Estado de carga.
 * - isModalOpen {boolean} - Visibilidad del modal.
 * 
 * Efectos secundarios (@effects):
 * - useEffect (mount): carga inicial de datos. Dependencias: [].
 * 
 * Endpoints que consume: `/plans`, `/programs`, catálogos.
 * 
 * @returns {JSX.Element} Elemento JSX que representa la página de planes de mejoramiento.
 */
const ImprovementPlansPage = () => {
    const { user } = useAuth();

    // --- State: datos principales ---
    const [plans, setPlans] = useState([]);
    const [programs, setPrograms] = useState([]);
    const [selectedProgramId, setSelectedProgramId] = useState('');
    const [loading, setLoading] = useState(true);

    // --- State: modal de creación/edición ---
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [editingPlan, setEditingPlan] = useState(null);
    const [formData, setFormData] = useState({
        name: '', startYear: new Date().getFullYear(),
        endYear: new Date().getFullYear() + 6,
        description: '', isActive: false, programId: '',
        horizons: {
            shortTerm: { start: new Date().getFullYear(), end: new Date().getFullYear() + 1 },
            midTerm: { start: new Date().getFullYear() + 2, end: new Date().getFullYear() + 4 },
            longTerm: { start: new Date().getFullYear() + 5, end: new Date().getFullYear() + 6 }
        }
    });

    // --- State: confirmación de eliminación ---
    const [deletingId, setDeletingId] = useState(null);

    // --- State: plan origen de la copia (clon profundo: plan + hallazgos) ---
    const [copySource, setCopySource] = useState(null);

    // --- State: feedback toast ---
    const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

    const isAdmin = user?.role === 'admin';
    const isCoordinator = user?.role === 'coordinator';

    // ─────────────────────────────────────────────────────────────────────────
    // Data fetching
    // ─────────────────────────────────────────────────────────────────────────

    const fetchPlans = useCallback(async () => {
        try {
            setLoading(true);
            const params = selectedProgramId ? `?programId=${selectedProgramId}` : '';
            const res = await api.get(`/plans${params}`);
            setPlans(res.data.data || []);
        } catch (err) {
            showToast('Error al cargar los planes.', 'error');
        } finally {
            setLoading(false);
        }
    }, [selectedProgramId]);

    useEffect(() => {
        fetchPlans();
    }, [fetchPlans]);

    useEffect(() => {
        // Solo el admin necesita el selector de programas
        if (isAdmin) {
            api.get('/programs').then(res => setPrograms(res.data.data || [])).catch(() => {});
        }
    }, [isAdmin]);

    // ─────────────────────────────────────────────────────────────────────────
    // Handlers
    // ─────────────────────────────────────────────────────────────────────────

    const showToast = (message, type = 'success') => {
        setToast({ show: true, message, type });
        setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 4000);
    };

    // Ajustar horizontes automáticamente cuando cambia la vigencia
    useEffect(() => {
        const { startYear, endYear, horizons } = formData;
        const dur = endYear - startYear + 1;
        if (dur >= 1) {
            const currentShortStart = horizons?.shortTerm?.start;
            const currentLongEnd = horizons?.longTerm?.end;
            if (currentShortStart !== startYear || currentLongEnd !== endYear) {
                let shortEnd = startYear;
                let midStart = startYear;
                let midEnd = endYear;
                let longStart = endYear;

                if (dur >= 4) {
                   shortEnd = startYear + 1;
                   midStart = shortEnd + 1;
                   midEnd = endYear - 2;
                   if (midEnd < midStart) midEnd = midStart;
                   longStart = midEnd + 1;
                } else if (dur === 3) {
                   shortEnd = startYear;
                   midStart = startYear + 1;
                   midEnd = startYear + 1;
                   longStart = endYear;
                } else if (dur === 2) {
                   shortEnd = startYear;
                   midStart = startYear;
                   midEnd = startYear + 1;
                   longStart = endYear;
                }

                setFormData(prev => ({
                    ...prev,
                    horizons: {
                        shortTerm: { start: prev.startYear, end: shortEnd },
                        midTerm: { start: midStart, end: midEnd },
                        longTerm: { start: longStart, end: prev.endYear }
                    }
                }));
            }
        }
    }, [formData.startYear, formData.endYear]);

    const handleShortTermEndChange = (endVal) => {
        const val = Number(endVal);
        setFormData(prev => {
            const newShortEnd = val;
            const newMidStart = newShortEnd + 1;
            let newMidEnd = prev.horizons?.midTerm?.end || (newMidStart + 1);
            if (newMidEnd < newMidStart) {
                newMidEnd = newMidStart;
            }
            const newLongStart = newMidEnd + 1;
            return {
                ...prev,
                horizons: {
                    shortTerm: { start: prev.startYear, end: newShortEnd },
                    midTerm: { start: newMidStart, end: newMidEnd },
                    longTerm: { start: newLongStart, end: prev.endYear }
                }
            };
        });
    };

    const handleMidTermEndChange = (endVal) => {
        const val = Number(endVal);
        setFormData(prev => {
            const newMidEnd = val;
            const newLongStart = newMidEnd + 1;
            return {
                ...prev,
                horizons: {
                    ...prev.horizons,
                    midTerm: { ...prev.horizons.midTerm, end: newMidEnd },
                    longTerm: { start: newLongStart, end: prev.endYear }
                }
            };
        });
    };

    const openCreateModal = () => {
        const startY = new Date().getFullYear();
        const endY = startY;
        setCopySource(null);
        setEditingPlan(null);
        setFormData({
            name: '',
            startYear: startY,
            endYear: endY,
            description: '',
            isActive: false,
            // Admin preselecciona el programa del selector; coordinator usa el suyo
            programId: isAdmin ? (selectedProgramId || '') : String(user?.program?._id || user?.program || ''),
            horizons: {
                shortTerm: { start: startY, end: startY },
                midTerm: { start: startY, end: startY },
                longTerm: { start: startY, end: startY }
            }
        });
        setIsModalOpen(true);
    };

    const openEditModal = (plan) => {
        setCopySource(null);
        setEditingPlan(plan);
        setFormData({
            name: plan.name,
            startYear: plan.startYear,
            endYear: plan.endYear,
            description: plan.description || '',
            isActive: plan.isActive,
            programId: plan.program?._id || plan.program,
            horizons: plan.horizons || {
                shortTerm: { start: plan.startYear, end: plan.startYear + 1 },
                midTerm: { start: plan.startYear + 2, end: plan.endYear - 2 },
                longTerm: { start: plan.endYear - 1, end: plan.endYear }
            }
        });
        setIsModalOpen(true);
    };

    const openCopyModal = (plan) => {
        setCopySource(plan);
        setEditingPlan(null);
        setFormData({
            name: `${plan.name} (Copia)`,
            startYear: plan.startYear,
            endYear: plan.endYear,
            description: plan.description || '',
            isActive: false,
            programId: plan.program?._id || plan.program,
            horizons: plan.horizons || {
                shortTerm: { start: plan.startYear, end: plan.startYear },
                midTerm: { start: plan.startYear, end: plan.startYear },
                longTerm: { start: plan.startYear, end: plan.startYear }
            }
        });
        setIsModalOpen(true);
    };

    const handleSave = async (e) => {
        e.preventDefault();
        const duration = formData.endYear - formData.startYear + 1;
        if (formData.endYear < formData.startYear) {
            return showToast('El año de fin debe ser mayor o igual al año de inicio.', 'error');
        }
        if (duration < 1) {
            return showToast(`La vigencia mínima es de 1 año. Vigencia actual: ${duration} año(s).`, 'error');
        }
        try {
            setIsSaving(true);
            if (editingPlan) {
                await api.put(`/plans/${editingPlan._id}`, formData);
                showToast('Plan actualizado exitosamente.', 'success');
            } else if (copySource) {
                // Copia profunda: endpoint clona plan + hallazgos (sin seguimiento)
                const res = await api.post(`/plans/${copySource._id}/copy`, formData);
                showToast(res.data?.message || 'Plan copiado exitosamente.', 'success');
            } else {
                await api.post('/plans', formData);
                showToast('Plan creado exitosamente.', 'success');
            }
            setIsModalOpen(false);
            setCopySource(null);
            fetchPlans();
        } catch (err) {
            showToast(err.response?.data?.message || 'Error al guardar el plan.', 'error');
        } finally {
            setIsSaving(false);
        }
    };

    const handleActivate = async (planId) => {
        try {
            await api.patch(`/plans/${planId}/activate`);
            showToast('Plan activado. El plan anterior fue marcado como cerrado.', 'success');
            fetchPlans();
        } catch (err) {
            showToast(err.response?.data?.message || 'Error al activar el plan.', 'error');
        }
    };

    const handleDelete = async (planId) => {
        try {
            await api.delete(`/plans/${planId}`);
            showToast('Plan eliminado exitosamente.', 'success');
            setDeletingId(null);
            fetchPlans();
        } catch (err) {
            showToast(err.response?.data?.message || 'No se puede eliminar este plan.', 'error');
            setDeletingId(null);
        }
    };

    // ─────────────────────────────────────────────────────────────────────────
    // Helpers de presentación
    // ─────────────────────────────────────────────────────────────────────────

    const getStatusBadge = (plan) => {
        if (plan.isActive) {
            return (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-600 border border-emerald-100">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    ACTIVO
                </span>
            );
        }
        if (plan.status === 'closed') {
            return (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-gray-50 text-gray-500 border border-gray-100">
                    <Clock size={10} /> CERRADO
                </span>
            );
        }
        return (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-50 text-amber-600 border border-amber-100">
                <FileText size={10} /> BORRADOR
            </span>
        );
    };

    const durationYears = (plan) => plan.endYear - plan.startYear + 1;

    // ─────────────────────────────────────────────────────────────────────────
    // Render
    // ─────────────────────────────────────────────────────────────────────────

    return (
        <div className="p-4 lg:p-8 max-w-[1400px] mx-auto space-y-8 animate-in fade-in duration-500 relative">

            {/* Toast */}
            {toast.show && (
                <div className="fixed top-8 left-1/2 -translate-x-1/2 z-[200] animate-in slide-in-from-top-4 duration-300">
                    <div className={`px-6 py-3 rounded-full shadow-2xl backdrop-blur-md border flex items-center gap-3 ${toast.type === 'success'
                        ? 'bg-emerald-500/90 text-white border-emerald-400'
                        : 'bg-rose-500/90 text-white border-rose-400'}`}>
                        {toast.type === 'success' ? <CheckCircle2 size={18} /> : <X size={18} />}
                        <span className="text-sm font-bold tracking-tight">{toast.message}</span>
                    </div>
                </div>
            )}

            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
                <div>
                    <h1 className="text-2xl font-semibold tracking-tight">Planes de Mejoramiento</h1>
                    <p className="text-sm text-[var(--ig-text-secondary)]">
                        Gestión de vigencias institucionales por programa académico
                    </p>
                </div>
                <button
                    onClick={openCreateModal}
                    disabled={isAdmin && !selectedProgramId && !user?.program}
                    className="ig-button-primary flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                >
                    <Plus size={18} /> Nuevo Plan
                </button>
            </div>

            {/* Filtro por programa (solo admin) */}
            {isAdmin && (
                <div className="ig-card rounded-xl p-4">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                        <div className="flex items-center gap-2 text-[var(--ig-text-secondary)]">
                            <BookOpen size={16} />
                            <span className="text-xs font-bold uppercase tracking-wider">Filtrar por Programa</span>
                        </div>
                        <div className="relative flex-1 max-w-sm">
                            <select
                                value={selectedProgramId}
                                onChange={(e) => setSelectedProgramId(e.target.value)}
                                className="ig-input w-full appearance-none pr-10 cursor-pointer"
                            >
                                <option value="">— Todos los programas —</option>
                                {programs.map(p => (
                                    <option key={p._id} value={p._id}>{p.name}</option>
                                ))}
                            </select>
                            <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--ig-text-secondary)] pointer-events-none" />
                        </div>
                        {selectedProgramId && (
                            <span className="text-[11px] text-[var(--ig-text-secondary)]">
                                {plans.length} plan(es) encontrado(s)
                            </span>
                        )}
                    </div>
                </div>
            )}

            {/* Alerta: admin sin programa seleccionado para crear */}
            {isAdmin && !selectedProgramId && (
                <div className="bg-amber-50 border border-amber-100 p-4 rounded-xl flex items-center gap-3 text-amber-700">
                    <AlertCircle size={18} />
                    <p className="text-sm">Seleccione un programa para crear un nuevo plan.</p>
                </div>
            )}

            {/* Grid de planes */}
            {loading ? (
                <div className="flex items-center justify-center py-20">
                    <Loader2 className="animate-spin text-[var(--ig-accent)]" size={32} />
                </div>
            ) : plans.length === 0 ? (
                <div className="ig-card rounded-xl p-12 flex flex-col items-center justify-center gap-4 text-center">
                    <div className="w-16 h-16 rounded-full bg-[var(--ig-hover)] flex items-center justify-center">
                        <Calendar size={28} className="text-[var(--ig-text-secondary)]" />
                    </div>
                    <div>
                        <p className="font-semibold text-[var(--ig-text-main)]">Sin planes registrados</p>
                        <p className="text-sm text-[var(--ig-text-secondary)] mt-1">
                            Cree el primer plan de mejoramiento para comenzar a registrar hallazgos.
                        </p>
                    </div>
                    <button onClick={openCreateModal} className="ig-button-primary flex items-center gap-2">
                        <Plus size={16} /> Crear Primer Plan
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {plans.map(plan => (
                        <div
                            key={plan._id}
                            className={`ig-card rounded-xl overflow-visible transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 ${plan.isActive
                                ? 'border-[var(--ig-accent)] ring-1 ring-[var(--ig-accent)]/20'
                                : ''}`}
                        >
                            {/* Card Header */}
                            <div className="p-5 border-b border-[var(--ig-border)] flex items-start justify-between gap-3">
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap mb-2">
                                        {getStatusBadge(plan)}
                                        {isAdmin && plan.program && (
                                            <span className="text-[10px] font-medium text-[var(--ig-text-secondary)] bg-[var(--ig-hover)] border border-[var(--ig-border)] px-2 py-0.5 rounded-full truncate max-w-[140px]">
                                                {plan.program.name}
                                            </span>
                                        )}
                                    </div>
                                    <h3 className="font-semibold text-[var(--ig-text-main)] leading-tight line-clamp-2">
                                        {plan.name}
                                    </h3>
                                </div>
                            </div>

                            {/* Card Body */}
                            <div className="p-5 space-y-4">
                                {/* Vigencia visual */}
                                <div className="flex items-center gap-3">
                                    <div className="flex-1 relative">
                                        <div className="h-1.5 bg-[var(--ig-hover)] rounded-full overflow-hidden">
                                            <div
                                                className={`h-full rounded-full transition-all duration-700 ${plan.isActive ? 'bg-[var(--ig-accent)]' : 'bg-gray-300'}`}
                                                style={{
                                                    width: `${Math.min(100, Math.max(5, ((new Date().getFullYear() - plan.startYear) / durationYears(plan)) * 100))}%`
                                                }}
                                            />
                                        </div>
                                        <div className="flex justify-between mt-1.5">
                                            <span className="text-[10px] font-bold text-[var(--ig-text-secondary)]">{plan.startYear}</span>
                                            <span className="text-[10px] font-bold text-[var(--ig-accent)]">{durationYears(plan)} años</span>
                                            <span className="text-[10px] font-bold text-[var(--ig-text-secondary)]">{plan.endYear}</span>
                                        </div>
                                    </div>
                                </div>

                                {plan.description && (
                                    <p className="text-xs text-[var(--ig-text-secondary)] line-clamp-2 leading-relaxed">
                                        {plan.description}
                                    </p>
                                )}

                                {plan.horizons && (
                                    <div className="bg-[var(--ig-hover)]/30 border border-[var(--ig-border)] rounded-lg p-2 flex items-center justify-between text-[10px] text-[var(--ig-text-secondary)] gap-1">
                                        <div className="text-center flex-1 border-r border-[var(--ig-border)]">
                                            <span className="font-bold block text-[var(--ig-text-main)]">Corto</span>
                                            <span>{plan.horizons.shortTerm?.start}–{plan.horizons.shortTerm?.end}</span>
                                        </div>
                                        <div className="text-center flex-1 border-r border-[var(--ig-border)]">
                                            <span className="font-bold block text-[var(--ig-text-main)]">Mediano</span>
                                            <span>{plan.horizons.midTerm?.start}–{plan.horizons.midTerm?.end}</span>
                                        </div>
                                        <div className="text-center flex-1">
                                            <span className="font-bold block text-[var(--ig-text-main)]">Largo</span>
                                            <span>{plan.horizons.longTerm?.start}–{plan.horizons.longTerm?.end}</span>
                                        </div>
                                    </div>
                                )}

                                <div className="text-[10px] text-[var(--ig-text-secondary)] flex items-center gap-1.5">
                                    <Calendar size={10} />
                                    <span>
                                        Creado por {plan.createdBy?.firstName} {plan.createdBy?.lastName}
                                    </span>
                                </div>
                            </div>

                            {/* Card Actions */}
                            <div className="px-5 pb-5 flex flex-wrap items-center gap-2">
                                {/* Botón Activar */}
                                {!plan.isActive && (
                                    <button
                                        onClick={() => handleActivate(plan._id)}
                                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold text-emerald-600 border border-emerald-200 hover:bg-emerald-50 transition-colors"
                                    >
                                        <ToggleRight size={14} /> Activar
                                    </button>
                                )}
                                {plan.isActive && (
                                    <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold text-[var(--ig-accent)] border border-[var(--ig-accent)]/20 bg-[var(--ig-accent)]/5">
                                        <ToggleLeft size={14} /> Plan Vigente
                                    </span>
                                )}

                                <div className="ml-auto flex items-center gap-1">
                                    {/* Copiar */}
                                    <button
                                        onClick={() => openCopyModal(plan)}
                                        className="p-2 rounded-lg hover:bg-[var(--ig-hover)] transition-colors"
                                        title="Crear copia"
                                    >
                                        <Copy size={15} className="text-[var(--ig-text-main)]" />
                                    </button>

                                    {/* Editar */}
                                    <button
                                        onClick={() => openEditModal(plan)}
                                        className="p-2 rounded-lg hover:bg-[var(--ig-hover)] transition-colors"
                                        title="Editar plan"
                                    >
                                        <Edit size={15} className="text-[var(--ig-text-main)]" />
                                    </button>

                                    {/* Eliminar */}
                                    {deletingId === plan._id ? (
                                        <div className="flex items-center gap-1 bg-rose-50 border border-rose-100 rounded-lg px-2 py-1">
                                            <span className="text-[10px] text-rose-600 font-bold">¿Confirmar?</span>
                                            <button
                                                onClick={() => handleDelete(plan._id)}
                                                className="text-rose-600 hover:text-rose-700 p-0.5"
                                            >
                                                <CheckCircle2 size={14} />
                                            </button>
                                            <button
                                                onClick={() => setDeletingId(null)}
                                                className="text-[var(--ig-text-secondary)] hover:text-[var(--ig-text-main)] p-0.5"
                                            >
                                                <X size={14} />
                                            </button>
                                        </div>
                                    ) : (
                                        <button
                                            onClick={() => setDeletingId(plan._id)}
                                            className="p-2 rounded-lg hover:bg-rose-50 transition-colors"
                                            title="Eliminar plan"
                                        >
                                            <Trash2 size={15} className="text-rose-500" />
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* ────────────────── Modal de Creación / Edición ────────────────── */}
            {isModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="bg-[var(--ig-bg)] border border-[var(--ig-border)] rounded-2xl w-full max-w-lg max-h-full shadow-2xl flex flex-col overflow-hidden">

                        {/* Modal Header */}
                        <div className="p-6 border-b border-[var(--ig-border)] flex justify-between items-center shrink-0">
                            <div>
                                <h2 className="text-lg font-semibold tracking-tight">
                                    {editingPlan ? 'Editar Plan' : copySource ? 'Copiar Plan de Mejoramiento' : 'Nuevo Plan de Mejoramiento'}
                                </h2>
                                <p className="text-xs text-[var(--ig-text-secondary)] mt-0.5">
                                    {editingPlan
                                        ? 'Modifique la metadata del plan. Para cambiar el estado use el botón Activar.'
                                        : copySource
                                            ? 'Se clonarán el plan y sus hallazgos. El seguimiento de actividades se reinicia (no se copia).'
                                            : 'Defina la vigencia temporal del nuevo plan.'}
                                </p>
                            </div>
                            <button onClick={() => setIsModalOpen(false)} className="p-2 hover:opacity-70 transition-opacity">
                                <X size={22} />
                            </button>
                        </div>

                        {/* Modal Body */}
                        <form onSubmit={handleSave} className="p-6 space-y-5 overflow-y-auto flex-1 min-h-0">

                            {/* Selector de programa (solo admin en creación) */}
                            {isAdmin && !editingPlan && (
                                <div className="space-y-2">
                                    <label className="text-xs font-semibold text-[var(--ig-text-secondary)] uppercase ml-1">
                                        Programa Académico <span className="text-rose-500">*</span>
                                    </label>
                                    <div className="relative">
                                        <select
                                            required
                                            value={formData.programId}
                                            onChange={(e) => setFormData({ ...formData, programId: e.target.value })}
                                            className="ig-input w-full appearance-none pr-10 cursor-pointer"
                                        >
                                            <option value="">Seleccionar programa...</option>
                                            {programs.map(p => (
                                                <option key={p._id} value={p._id}>{p.name} ({p.code})</option>
                                            ))}
                                        </select>
                                        <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--ig-text-secondary)] pointer-events-none" />
                                    </div>
                                </div>
                            )}

                            {/* Nombre del plan */}
                            <div className="space-y-2">
                                <label className="text-xs font-semibold text-[var(--ig-text-secondary)] uppercase ml-1">
                                    Nombre del Plan <span className="text-rose-500">*</span>
                                </label>
                                <input
                                    required
                                    type="text"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    className="ig-input w-full"
                                    placeholder="Ej: Plan de Mejoramiento 2022-2029"
                                />
                            </div>

                            {/* Vigencia (año inicio / año fin) */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-xs font-semibold text-[var(--ig-text-secondary)] uppercase ml-1">
                                        Año Inicio <span className="text-rose-500">*</span>
                                    </label>
                                    <input
                                        required
                                        type="number"
                                        min="2000"
                                        max="2100"
                                        value={formData.startYear}
                                        onChange={(e) => setFormData({ ...formData, startYear: Number(e.target.value) })}
                                        className="ig-input w-full"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-semibold text-[var(--ig-text-secondary)] uppercase ml-1">
                                        Año Fin <span className="text-rose-500">*</span>
                                    </label>
                                    <input
                                        required
                                        type="number"
                                        min="2000"
                                        max="2100"
                                        value={formData.endYear}
                                        onChange={(e) => setFormData({ ...formData, endYear: Number(e.target.value) })}
                                        className="ig-input w-full"
                                    />
                                </div>
                            </div>

                            {/* Advertencia de vigencia mínima y configuración de horizontes */}
                            {formData.endYear >= formData.startYear && (() => {
                                const dur = formData.endYear - formData.startYear + 1;
                                const isValid = dur >= 1;
                                return (
                                    <div className="space-y-4">
                                        <div className={`rounded-xl p-3 flex items-start gap-3 text-xs border ${
                                            isValid
                                                ? 'bg-[var(--ig-hover)] border-[var(--ig-border)]'
                                                : 'bg-rose-50 border-rose-200'
                                        }`}>
                                            <Calendar size={14} className={`flex-shrink-0 mt-0.5 ${
                                                isValid ? 'text-[var(--ig-accent)]' : 'text-rose-500'
                                            }`} />
                                            <div className="space-y-1">
                                                <p className={isValid ? 'text-[var(--ig-text-secondary)]' : 'text-rose-600 font-semibold'}>
                                                    {isValid
                                                        ? <>
                                                            Vigencia de <strong className="text-[var(--ig-text-main)]">{dur} años</strong>
                                                            {' '}— Metas anualizadas:{' '}
                                                            <strong className="text-[var(--ig-accent)]">
                                                                {Array.from({ length: dur }, (_, i) => formData.startYear + i).join(', ')}
                                                            </strong>
                                                          </>
                                                        : `Vigencia insuficiente: ${dur} año(s). El mínimo institucional es de 1 año.`
                                                    }
                                                </p>
                                            </div>
                                        </div>

                                        {isValid && formData.horizons?.shortTerm && formData.horizons?.midTerm && formData.horizons?.longTerm && (
                                            <div className="bg-[var(--ig-hover)]/30 border border-[var(--ig-border)] rounded-xl p-4 space-y-3">
                                                <h4 className="text-[11px] font-bold text-[var(--ig-text-main)] uppercase tracking-wider">
                                                    Configuración de Horizontes (Plazos)
                                                </h4>
                                                
                                                <div className="grid grid-cols-3 gap-3 text-xs">
                                                    {/* Corto Plazo */}
                                                    <div className="space-y-2 bg-[var(--ig-bg)] p-3 rounded-lg border border-[var(--ig-border)] flex flex-col justify-between">
                                                        <div>
                                                            <span className="font-bold text-[var(--ig-text-main)] block mb-1 text-[11px]">Corto Plazo</span>
                                                            <div className="mb-2">
                                                                <label className="text-[9px] text-[var(--ig-text-secondary)] uppercase font-semibold block">Inicio (Bloqueado)</label>
                                                                <span className="font-bold text-sm text-[var(--ig-text-secondary)]">{formData.horizons.shortTerm.start}</span>
                                                            </div>
                                                        </div>
                                                        <div className="space-y-1">
                                                            <label className="text-[9px] text-[var(--ig-text-secondary)] uppercase font-semibold block">Año Fin</label>
                                                            <div className="relative">
                                                                <select
                                                                    value={formData.horizons.shortTerm.end}
                                                                    onChange={(e) => handleShortTermEndChange(e.target.value)}
                                                                    className="ig-input py-1 text-xs w-full pr-6 cursor-pointer"
                                                                >
                                                                    {Array.from({ length: formData.endYear - formData.startYear - 1 }, (_, i) => formData.startYear + i).map(y => (
                                                                        <option key={y} value={y}>{y}</option>
                                                                    ))}
                                                                </select>
                                                                <ChevronDown size={10} className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--ig-text-secondary)] pointer-events-none" />
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Mediano Plazo */}
                                                    <div className="space-y-2 bg-[var(--ig-bg)] p-3 rounded-lg border border-[var(--ig-border)] flex flex-col justify-between">
                                                        <div>
                                                            <span className="font-bold text-[var(--ig-text-main)] block mb-1 text-[11px]">Mediano Plazo</span>
                                                            <div className="mb-2">
                                                                <label className="text-[9px] text-[var(--ig-text-secondary)] uppercase font-semibold block">Inicio (Auto)</label>
                                                                <span className="font-bold text-sm text-[var(--ig-text-secondary)]">{formData.horizons.midTerm.start}</span>
                                                            </div>
                                                        </div>
                                                        <div className="space-y-1">
                                                            <label className="text-[9px] text-[var(--ig-text-secondary)] uppercase font-semibold block">Año Fin</label>
                                                            <div className="relative">
                                                                <select
                                                                    value={formData.horizons.midTerm.end}
                                                                    onChange={(e) => handleMidTermEndChange(e.target.value)}
                                                                    className="ig-input py-1 text-xs w-full pr-6 cursor-pointer"
                                                                >
                                                                    {Array.from({ length: formData.endYear - formData.horizons.midTerm.start }, (_, i) => formData.horizons.midTerm.start + i).map(y => (
                                                                        <option key={y} value={y}>{y}</option>
                                                                    ))}
                                                                </select>
                                                                <ChevronDown size={10} className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--ig-text-secondary)] pointer-events-none" />
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Largo Plazo */}
                                                    <div className="space-y-2 bg-[var(--ig-bg)] p-3 rounded-lg border border-[var(--ig-border)] flex flex-col justify-between">
                                                        <div>
                                                            <span className="font-bold text-[var(--ig-text-main)] block mb-1 text-[11px]">Largo Plazo</span>
                                                            <div className="mb-2">
                                                                <label className="text-[9px] text-[var(--ig-text-secondary)] uppercase font-semibold block">Inicio (Auto)</label>
                                                                <span className="font-bold text-sm text-[var(--ig-text-secondary)]">{formData.horizons.longTerm.start}</span>
                                                            </div>
                                                        </div>
                                                        <div>
                                                            <label className="text-[9px] text-[var(--ig-text-secondary)] uppercase font-semibold block">Fin (Bloqueado)</label>
                                                            <span className="font-bold text-sm text-[var(--ig-text-secondary)]">{formData.horizons.longTerm.end}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })()}

                            {/* Descripción opcional */}
                            <div className="space-y-2">
                                <label className="text-xs font-semibold text-[var(--ig-text-secondary)] uppercase ml-1">
                                    Descripción <span className="text-[var(--ig-text-secondary)] font-normal normal-case">(opcional)</span>
                                </label>
                                <textarea
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    className="ig-input w-full h-20 resize-none"
                                    placeholder="Contexto o alcance del plan..."
                                />
                            </div>

                            {/* Activar inmediatamente (solo en creación) */}
                            {!editingPlan && (
                                <div className="flex items-center gap-3 p-4 rounded-xl border border-[var(--ig-border)] bg-[var(--ig-hover)]/40">
                                    <button
                                        type="button"
                                        onClick={() => setFormData({ ...formData, isActive: !formData.isActive })}
                                        className="flex-shrink-0"
                                    >
                                        {formData.isActive
                                            ? <ToggleRight size={28} className="text-[var(--ig-accent)]" />
                                            : <ToggleLeft size={28} className="text-[var(--ig-text-secondary)]" />}
                                    </button>
                                    <div>
                                        <p className="text-sm font-semibold">Activar inmediatamente</p>
                                        <p className="text-[11px] text-[var(--ig-text-secondary)]">
                                            {formData.isActive
                                                ? 'El plan se activará y el plan actual quedará como cerrado.'
                                                : 'El plan se guardará como borrador. Podrá activarlo después.'}
                                        </p>
                                    </div>
                                </div>
                            )}

                            {/* Footer del modal */}
                            <div className="flex gap-3 pt-2 border-t border-[var(--ig-border)]">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="flex-1 font-semibold text-sm py-2.5 hover:bg-[var(--ig-hover)] rounded-lg transition-colors border border-[var(--ig-border)]"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSaving}
                                    className="ig-button-primary flex-1 py-2.5 flex items-center justify-center gap-2 disabled:opacity-50"
                                >
                                    {isSaving ? <Loader2 className="animate-spin" size={16} /> : <CheckCircle2 size={16} />}
                                    {isSaving ? 'Guardando...' : editingPlan ? 'Guardar Cambios' : copySource ? 'Copiar Plan' : 'Crear Plan'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ImprovementPlansPage;
