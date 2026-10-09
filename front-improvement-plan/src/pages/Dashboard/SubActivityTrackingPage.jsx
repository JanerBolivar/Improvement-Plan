import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../api/axios';
import {
    ArrowLeft,
    Calendar,
    FileText,
    Upload,
    ExternalLink,
    Save,
    Loader2,
    CheckCircle2,
    AlertCircle,
    Info,
    Trash2,
    ClipboardCheck
} from 'lucide-react';

/**
 * Componente que renderiza la página de seguimiento de subactividad (Tracking).
 * 
 * Renderiza la vista de seguimiento detallado de una subactividad específica,
 * obtenida mediante parámetros de ruta (activityId, subActivityId). Gestiona
 * estado local para datos, carga y formularios de seguimiento.
 * 
 * Estado que maneja (@state):
 * - activity {Object|null} - Actividad padre.
 * - subActivity {Object|null} - Subactividad en seguimiento.
 * - loading {boolean} - Estado de carga.
 * - trackingData {Object} - Datos de seguimiento.
 * 
 * Efectos secundarios (@effects):
 * - useEffect: carga datos de actividad/subactividad al cambiar parámetros. Dependencias: [activityId, subActivityId] (según uso interno con useParams).
 * 
 * Endpoints que consume:
 * - GET `/activities/:activityId` (o equivalente)
 * 
 * @returns {JSX.Element} Elemento JSX que representa la página de seguimiento.
 */
const SubActivityTrackingPage = () => {
    const { activityId, subActivityId } = useParams();
    const navigate = useNavigate();

    // Definición de variables de estado locales destinadas a la gestión de entidades y flujos asíncronos
    const [activity, setActivity] = useState(null);
    const [subActivity, setSubActivity] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const [availableYears, setAvailableYears] = useState([]);
    const [selectedYear, setSelectedYear] = useState(null);

    // Estructura de estado reactiva del formulario de recolección de evidencias y avances
    const [formData, setFormData] = useState({
        firstSemesterDate: '',
        secondSemesterDate: '',
        evidenceDescription: '',
        evidencePdfUrl: '',
        firstSemesterAdvance: '',
        secondSemesterAdvance: '',
        firstSemesterObservations: '',
        secondSemesterObservations: ''
    });

    const [uploadingPdf, setUploadingPdf] = useState(false);
    const [saveSuccess, setSaveSuccess] = useState(false);
    const [saving, setSaving] = useState(false);

    // Operación asíncrona: Carga recursiva de la actividad y filtrado de la subactividad objetivo
    const fetchActivityData = useCallback(async () => {
        try {
            setLoading(true);
            const res = await api.get(`/activities/${activityId}`);
            if (res.data.success) {
                const act = res.data.data;
                setActivity(act);

                const sub = act.subActivities.find(s => String(s._id) === String(subActivityId));
                if (sub) {
                    setSubActivity(sub);

                    // Identificación y segmentación de los periodos anuales con metas configuradas con valor positivo
                    const startYear = act.improvementPlan?.startYear || 2024;
                    const yearsWithGoals = (sub.annualGoals || [])
                        .filter(g => g.value !== null && g.value > 0)
                        .map(g => startYear + g.yearIndex - 1);

                    setAvailableYears(yearsWithGoals);
                    if (yearsWithGoals.length > 0) {
                        setSelectedYear(yearsWithGoals[0]);
                    } else {
                        setError('Esta subactividad no tiene metas anuales configuradas para ningún año.');
                    }
                } else {
                    setError('Subactividad no encontrada.');
                }
            }
        } catch (err) {
            console.error('Error fetching activity:', err);
            setError('Error al cargar la información de la actividad.');
        } finally {
            setLoading(false);
        }
    }, [activityId, subActivityId]);

    useEffect(() => {
        fetchActivityData();
    }, [fetchActivityData]);

    // Operación asíncrona: Consulta del registro de seguimiento persistido para el periodo anual activo
    const fetchTrackingData = useCallback(async () => {
        if (!selectedYear) return;
        try {
            const res = await api.get(`/tracking/sub-activity/${subActivityId}/year/${selectedYear}`);
            if (res.data.success && res.data.data) {
                const track = res.data.data;
                setFormData({
                    firstSemesterDate: track.firstSemesterDate ? track.firstSemesterDate.split('T')[0] : '',
                    secondSemesterDate: track.secondSemesterDate ? track.secondSemesterDate.split('T')[0] : '',
                    evidenceDescription: track.evidenceDescription || '',
                    evidencePdfUrl: track.evidencePdfUrl || '',
                    firstSemesterAdvance: track.firstSemesterAdvance !== null ? track.firstSemesterAdvance : '',
                    secondSemesterAdvance: track.secondSemesterAdvance !== null ? track.secondSemesterAdvance : '',
                    firstSemesterObservations: track.firstSemesterObservations || '',
                    secondSemesterObservations: track.secondSemesterObservations || ''
                });
            }
        } catch (err) {
            console.error('Error fetching tracking:', err);
        }
    }, [selectedYear, subActivityId]);

    useEffect(() => {
        fetchTrackingData();
    }, [fetchTrackingData]);

    // Consulta de metadatos: Resolución del valor numérico de la meta anual planificada
    const getGoalForSelectedYear = () => {
        if (!activity || !subActivity || !selectedYear) return 0;
        const yearIndex = selectedYear - activity.improvementPlan.startYear + 1;
        const goal = subActivity.annualGoals.find(g => g.yearIndex === yearIndex);
        return goal ? goal.value : 0;
    };

    const currentGoal = getGoalForSelectedYear();

    // Procedimientos aritméticos para el cálculo dinámico de porcentajes de avance semestrales y acumulados
    const firstSemPct = currentGoal > 0 && formData.firstSemesterAdvance !== ''
        ? Math.min(100, Math.round((Number(formData.firstSemesterAdvance) / currentGoal) * 100))
        : 0;

    const secondSemPct = currentGoal > 0 && formData.secondSemesterAdvance !== ''
        ? Math.min(100, Math.round((Number(formData.secondSemesterAdvance) / currentGoal) * 100))
        : 0;

    const totalAdvanceVal = (formData.firstSemesterAdvance !== '' ? Number(formData.firstSemesterAdvance) : 0) +
        (formData.secondSemesterAdvance !== '' ? Number(formData.secondSemesterAdvance) : 0);

    const totalPct = currentGoal > 0 ? Math.min(100, Math.round((totalAdvanceVal / currentGoal) * 100)) : 0;

    // Mapeo semiótico visual: Definición de paletas de estado condicionales (alto, medio, bajo)
    const getStatusStyle = (pct) => {
        if (pct <= 40) return { bg: 'bg-rose-50 border-rose-200 text-rose-700', fill: 'bg-rose-500', text: 'Bajo (B)' };
        if (pct <= 60) return { bg: 'bg-amber-50 border-amber-200 text-amber-700', fill: 'bg-amber-500', text: 'Medio (M)' };
        return { bg: 'bg-emerald-50 border-emerald-200 text-emerald-700', fill: 'bg-emerald-500', text: 'Alto (A)' };
    };

    const statusStyle = getStatusStyle(totalPct);

    // Controlador de eventos (Event Handler): Sincronización bidireccional y validación de campos numéricos
    const handleInputChange = (e) => {
        const { name, value } = e.target;
        // Evitar números menores a 0
        if ((name === 'firstSemesterAdvance' || name === 'secondSemesterAdvance') && value !== '') {
            if (Number(value) < 0) return;
        }
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    // Operación asíncrona: Carga binaria del documento PDF de soporte a través de la API
    const handlePdfUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        if (file.type !== 'application/pdf') {
            alert('Por favor selecciona un archivo PDF válido.');
            return;
        }

        const data = new FormData();
        data.append('pdf', file);

        try {
            setUploadingPdf(true);
            const res = await api.post('/tracking/upload-pdf', data, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            if (res.data.success) {
                setFormData(prev => ({ ...prev, evidencePdfUrl: res.data.data.url }));
            }
        } catch (err) {
            console.error('Error uploading pdf:', err);
            alert('Error al cargar el archivo PDF.');
        } finally {
            setUploadingPdf(false);
        }
    };

    // Operación de persistencia: Envío de payload JSON al endpoint de actualización/creación de seguimiento
    const handleDeletePdf = async () => {
        const url = formData.evidencePdfUrl;
        if (!url) return;
        try {
            await api.delete('/tracking/evidence', { data: { url } });
            setFormData(prev => ({ ...prev, evidencePdfUrl: '' }));
        } catch (err) {
            console.error('Error deleting pdf:', err);
            alert('Error al eliminar el documento.');
        }
    };

    const handleSave = async (e) => {
        e.preventDefault();
        try {
            setSaving(true);
            setSaveSuccess(false);

            const payload = {
                activityId,
                subActivityId,
                year: selectedYear,
                firstSemesterDate: formData.firstSemesterDate || null,
                secondSemesterDate: formData.secondSemesterDate || null,
                evidenceDescription: formData.evidenceDescription,
                evidencePdfUrl: formData.evidencePdfUrl,
                firstSemesterAdvance: formData.firstSemesterAdvance !== '' ? Number(formData.firstSemesterAdvance) : null,
                secondSemesterAdvance: formData.secondSemesterAdvance !== '' ? Number(formData.secondSemesterAdvance) : null,
                firstSemesterObservations: formData.firstSemesterObservations,
                secondSemesterObservations: formData.secondSemesterObservations
            };

            const res = await api.post('/tracking', payload);
            if (res.data.success) {
                setSaveSuccess(true);
                setTimeout(() => setSaveSuccess(false), 3000);
            }
        } catch (err) {
            console.error('Error saving tracking:', err);
            alert('Error al guardar la información del seguimiento.');
        } finally {
            setSaving(false);
        }
    };

    // Utilidad de renderizado dinámico: Detección semántica de URIs e inyección interactiva de etiquetas de anclaje (Anchor tags)
    const renderTextWithLinks = (text) => {
        if (!text) return '';
        const urlRegex = /(https?:\/\/[^\s]+)/g;
        const parts = text.split(urlRegex);
        return parts.map((part, index) => {
            if (part.match(urlRegex)) {
                return (
                    <a
                        key={index}
                        href={part}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-ig-accent hover:underline font-bold inline-flex items-center gap-0.5"
                    >
                        {part} <ExternalLink size={10} />
                    </a>
                );
            }
            return part;
        });
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
                <Loader2 className="animate-spin text-ig-accent" size={48} />
                <p className="text-ig-text-secondary font-medium animate-pulse">Cargando datos de seguimiento...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-6 max-w-4xl mx-auto">
                <div className="bg-rose-50 border border-rose-200 text-rose-700 p-6 rounded-xl flex items-start gap-4 shadow-sm">
                    <AlertCircle className="shrink-0 mt-1" size={24} />
                    <div>
                        <h3 className="font-bold text-lg mb-1">No se puede gestionar el seguimiento</h3>
                        <p className="text-sm leading-relaxed mb-4">{error}</p>
                        <button
                            onClick={() => navigate('/dashboard/activities')}
                            className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-bold text-xs transition-colors flex items-center gap-2"
                        >
                            <ArrowLeft size={14} /> Volver a Actividades
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="p-6 max-w-5xl mx-auto space-y-6">
            {/* Barra de navegación secundaria y metadatos de vigencia del Plan */}
            <div className="flex items-center justify-between">
                <button
                    onClick={() => navigate('/dashboard/activities')}
                    className="px-3 py-1.5 hover:bg-ig-hover border border-ig-border text-ig-text rounded-xl font-bold text-xs transition-all duration-200 flex items-center gap-2"
                >
                    <ArrowLeft size={16} /> Volver a Actividades
                </button>
                <div className="text-right">
                    <span className="text-[10px] uppercase font-bold tracking-wider text-ig-text-secondary">Vigencia del Plan</span>
                    <h2 className="text-lg font-black text-ig-accent">
                        {activity?.improvementPlan?.name} ({activity?.improvementPlan?.startYear} - {activity?.improvementPlan?.endYear})
                    </h2>
                </div>
            </div>

            {/* Panel informativo consolidado de la Subactividad (Ficha Técnica) */}
            <div className="ig-card p-6 rounded-2xl border border-ig-border shadow-sm bg-ig-bg/50 backdrop-blur-md space-y-4">
                <div className="flex items-center gap-3 border-b border-ig-border pb-3">
                    <div className="p-2 bg-ig-accent/10 rounded-xl text-ig-accent">
                        <ClipboardCheck size={24} />
                    </div>
                    <div>
                        <span className="text-[10px] uppercase font-black tracking-tight text-ig-text-secondary">Subactividad Técnica</span>
                        <h1 className="text-xl font-black text-ig-text tracking-tight leading-tight">{subActivity?.description}</h1>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs">
                    <div className="space-y-1">
                        <span className="text-ig-text-secondary font-bold uppercase tracking-tight block text-[10px]">Sede / Ubicación</span>
                        <p className="font-semibold text-ig-text">{subActivity?.campus || 'Sede Principal'}</p>
                    </div>
                    <div className="space-y-1">
                        <span className="text-ig-text-secondary font-bold uppercase tracking-tight block text-[10px]">Actividad / Acción de Mejora</span>
                        <p className="font-semibold text-ig-text">{subActivity?.description}</p>
                    </div>
                    <div className="space-y-1">
                        <span className="text-ig-text-secondary font-bold uppercase tracking-tight block text-[10px]">Indicador de Logro</span>
                        <p className="font-semibold text-ig-text italic">{subActivity?.indicatorName}</p>
                    </div>
                    <div className="space-y-1">
                        <span className="text-ig-text-secondary font-bold uppercase tracking-tight block text-[10px]">Línea Base</span>
                        <span className="inline-block px-2.5 py-0.5 rounded-full bg-ig-hover border border-ig-border text-xs font-bold text-ig-text">
                            {subActivity?.baseline ?? 'Sin línea base'}
                        </span>
                    </div>
                    <div className="space-y-1">
                        <span className="text-ig-text-secondary font-bold uppercase tracking-tight block text-[10px]">Meta Total del Plan</span>
                        <span className="inline-block px-2.5 py-0.5 rounded-full bg-ig-accent/10 text-xs font-bold text-ig-accent">
                            {(subActivity?.annualGoals || []).reduce((acc, g) => acc + (g.value || 0), 0)}
                        </span>
                    </div>
                    <div className="space-y-1">
                        <span className="text-ig-text-secondary font-bold uppercase tracking-tight block text-[10px]">Unidad Responsable</span>
                        <p className="font-semibold text-ig-text">{subActivity?.responsibleUnit}</p>
                    </div>
                </div>
            </div>

            {/* Segmentador interactivo del periodo anual de evaluación */}
            <div className="flex flex-col gap-2">
                <label className="text-xs font-bold uppercase tracking-wider text-ig-text-secondary flex items-center gap-1.5">
                    <Calendar size={14} /> Seleccionar Año para Seguimiento
                </label>
                <div className="flex flex-wrap gap-2">
                    {availableYears.map(year => (
                        <button
                            key={year}
                            type="button"
                            onClick={() => setSelectedYear(year)}
                            className={`px-4 py-2 rounded-xl font-bold text-xs border transition-all duration-200 ${
                                selectedYear === year
                                    ? 'bg-ig-accent border-ig-accent text-white shadow-md shadow-ig-accent/10 scale-105'
                                    : 'bg-ig-card border-ig-border text-ig-text hover:bg-ig-hover'
                            }`}
                        >
                            Año {year} (Meta: {(subActivity?.annualGoals || []).find(g => activity.improvementPlan.startYear + g.yearIndex - 1 === year)?.value || 0})
                        </button>
                    ))}
                </div>
            </div>

            {/* Formulario transaccional de recopilación y persistencia de evidencias anuales */}
            {selectedYear && (
                <form onSubmit={handleSave} className="space-y-6">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Columna Izquierda & Central: Formulario */}
                        <div className="lg:col-span-2 space-y-6">
                            {/* Bloque de control de fechas de seguimiento semestral */}
                            <div className="ig-card p-6 rounded-2xl border border-ig-border space-y-4">
                                <h3 className="text-xs font-bold uppercase tracking-widest text-ig-text-secondary border-b border-ig-border pb-2 flex items-center gap-1.5">
                                    <Calendar size={14} /> Fechas de Seguimiento (dd-mm-aaaa)
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-ig-text-secondary uppercase">Primer Semestre</label>
                                        <input
                                            type="date"
                                            name="firstSemesterDate"
                                            value={formData.firstSemesterDate}
                                            onChange={handleInputChange}
                                            className="ig-input w-full"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-ig-text-secondary uppercase">Segundo Semestre</label>
                                        <input
                                            type="date"
                                            name="secondSemesterDate"
                                            value={formData.secondSemesterDate}
                                            onChange={handleInputChange}
                                            className="ig-input w-full"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Bloque de cuantificación y métricas de avance físico/numérico */}
                            <div className="ig-card p-6 rounded-2xl border border-ig-border space-y-4">
                                <h3 className="text-xs font-bold uppercase tracking-widest text-ig-text-secondary border-b border-ig-border pb-2 flex items-center gap-1.5">
                                    <Info size={14} /> Evaluación y Avances de Metas
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-ig-text-secondary uppercase">Meta de la Vigencia ({selectedYear})</label>
                                        <div className="ig-input bg-ig-hover/50 text-ig-text-secondary font-bold text-center flex items-center justify-center">
                                            {currentGoal}
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <div className="flex justify-between items-center">
                                            <label className="text-xs font-bold text-ig-text-secondary uppercase">Avance Primer Semestre</label>
                                            <span className="text-[10px] font-bold text-ig-accent bg-ig-accent/10 px-1.5 py-0.5 rounded">{firstSemPct}%</span>
                                        </div>
                                        <input
                                            type="number"
                                            name="firstSemesterAdvance"
                                            placeholder="Ej: 2"
                                            value={formData.firstSemesterAdvance}
                                            onChange={handleInputChange}
                                            className="ig-input w-full text-center font-bold"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <div className="flex justify-between items-center">
                                            <label className="text-xs font-bold text-ig-text-secondary uppercase">Avance Segundo Semestre</label>
                                            <span className="text-[10px] font-bold text-ig-accent bg-ig-accent/10 px-1.5 py-0.5 rounded">{secondSemPct}%</span>
                                        </div>
                                        <input
                                            type="number"
                                            name="secondSemesterAdvance"
                                            placeholder="Ej: 3"
                                            value={formData.secondSemesterAdvance}
                                            onChange={handleInputChange}
                                            className="ig-input w-full text-center font-bold"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Bloque de carga de evidencias documentales y recursos de verificación */}
                            <div className="ig-card p-6 rounded-2xl border border-ig-border space-y-4">
                                <h3 className="text-xs font-bold uppercase tracking-widest text-ig-text-secondary border-b border-ig-border pb-2 flex items-center gap-1.5">
                                    <FileText size={14} /> Producto o Medio de Verificación
                                </h3>
                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-ig-text-secondary uppercase block">Descripción del Soporte / Enlaces</label>
                                        <textarea
                                            name="evidenceDescription"
                                            rows="3"
                                            placeholder="Describe el producto. Puedes pegar enlaces web (http://...) y se reconocerán automáticamente como enlaces."
                                            value={formData.evidenceDescription}
                                            onChange={handleInputChange}
                                            className="ig-input w-full text-xs font-medium"
                                        />
                                        {formData.evidenceDescription && (
                                            <div className="bg-ig-hover/30 border border-ig-border p-3 rounded-xl space-y-1 text-xs">
                                                <span className="text-[10px] font-bold text-ig-text-secondary uppercase block">Vista Previa con Enlaces:</span>
                                                <div className="whitespace-pre-line text-ig-text">{renderTextWithLinks(formData.evidenceDescription)}</div>
                                            </div>
                                        )}
                                    </div>

                                    {/* Componente interactivo de carga y visualización de archivos PDF */}
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-ig-text-secondary uppercase block">Documento Soporte (PDF)</label>
                                        <div className="flex flex-wrap items-center gap-4">
                                            <label className="relative cursor-pointer px-4 py-2.5 rounded-xl border border-dashed border-ig-accent/50 hover:bg-ig-accent/5 hover:border-ig-accent text-ig-accent font-bold text-xs transition-all flex items-center gap-2">
                                                {uploadingPdf ? (
                                                    <>
                                                        <Loader2 className="animate-spin" size={16} />
                                                        Cargando PDF...
                                                    </>
                                                ) : (
                                                    <>
                                                        <Upload size={16} />
                                                        Cargar PDF de Soporte
                                                    </>
                                                )}
                                                <input
                                                    type="file"
                                                    accept=".pdf"
                                                    onChange={handlePdfUpload}
                                                    disabled={uploadingPdf}
                                                    className="hidden"
                                                />
                                            </label>

                                            {formData.evidencePdfUrl && (
                                                <div className="flex items-center gap-2">
                                                    <a
                                                        href={formData.evidencePdfUrl}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="px-3 py-2 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 font-bold text-xs transition-all flex items-center gap-1.5 hover:bg-emerald-100"
                                                    >
                                                        <ExternalLink size={14} /> Ver PDF Cargado
                                                    </a>
                                                    <button
                                                        type="button"
                                                        onClick={handleDeletePdf}
                                                        className="p-2 text-rose-500 hover:bg-rose-50 rounded-xl transition-colors"
                                                        title="Eliminar archivo"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Panel lateral: Semáforo dinámico e ingresos descriptivos adicionales */}
                        <div className="space-y-6">
                            {/* Widget dinámico indicador del porcentaje de cumplimiento acumulado */}
                            <div className={`ig-card p-6 rounded-2xl border ${statusStyle.bg} space-y-4 shadow-sm`}>
                                <div className="text-center space-y-1">
                                    <span className="text-[10px] uppercase font-black tracking-widest block opacity-70">Estado Oportunidad de Mejora</span>
                                    <h4 className="text-3xl font-black tracking-tight">{totalPct}%</h4>
                                    <span className="inline-block px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-white/60 border border-current">
                                        {statusStyle.text}
                                    </span>
                                </div>

                                {/* Barra indicadora visual del progreso relativo */}
                                <div className="w-full bg-black/10 rounded-full h-3 overflow-hidden">
                                    <div
                                        className={`h-full rounded-full transition-all duration-500 ${statusStyle.fill}`}
                                        style={{ width: `${totalPct}%` }}
                                    ></div>
                                </div>

                                <div className="text-[10px] text-justify leading-relaxed opacity-80 border-t border-black/10 pt-3">
                                    <strong>Nota de Cálculo:</strong> El porcentaje representa el avance acumulado (1er + 2do semestre) sobre la meta de la vigencia ({currentGoal}).
                                </div>
                            </div>

                            {/* Bloque de ingreso de anotaciones cualitativas por periodo semestral */}
                            <div className="ig-card p-6 rounded-2xl border border-ig-border space-y-4">
                                <h3 className="text-xs font-bold uppercase tracking-widest text-ig-text-secondary border-b border-ig-border pb-2 flex items-center gap-1.5">
                                    <FileText size={14} /> Observaciones al Seguimiento
                                </h3>
                                <div className="space-y-4 text-xs">
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-ig-text-secondary uppercase">Primer Semestre</label>
                                        <textarea
                                            name="firstSemesterObservations"
                                            rows="3"
                                            placeholder="Logros, dificultades, planes de acción..."
                                            value={formData.firstSemesterObservations}
                                            onChange={handleInputChange}
                                            className="ig-input w-full text-xs font-medium"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-ig-text-secondary uppercase">Segundo Semestre</label>
                                        <textarea
                                            name="secondSemesterObservations"
                                            rows="3"
                                            placeholder="Resultados finales, lecciones aprendidas..."
                                            value={formData.secondSemesterObservations}
                                            onChange={handleInputChange}
                                            className="ig-input w-full text-xs font-medium"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Controles de finalización y envío de la transacción */}
                    <div className="flex items-center justify-between border-t border-ig-border pt-6">
                        <div className="flex items-center gap-2">
                            {saveSuccess && (
                                <div className="flex items-center gap-1.5 text-emerald-600 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-xl text-xs font-bold animate-bounce">
                                    <CheckCircle2 size={16} /> ¡Seguimiento guardado correctamente!
                                </div>
                            )}
                        </div>
                        <div className="flex gap-3">
                            <button
                                type="button"
                                onClick={() => navigate('/dashboard/activities')}
                                className="px-5 py-2.5 hover:bg-ig-hover border border-ig-border text-ig-text rounded-xl font-bold text-xs transition-all duration-200"
                            >
                                Cancelar
                            </button>
                            <button
                                type="submit"
                                disabled={saving}
                                className="px-6 py-2.5 bg-ig-accent hover:bg-ig-accent-hover text-white rounded-xl font-black text-xs transition-all duration-200 flex items-center gap-2 shadow-md shadow-ig-accent/15"
                            >
                                {saving ? (
                                    <>
                                        <Loader2 className="animate-spin" size={16} /> Guardando...
                                    </>
                                ) : (
                                    <>
                                        <Save size={16} /> Guardar Seguimiento
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </form>
            )}
        </div>
    );
};

export default SubActivityTrackingPage;
