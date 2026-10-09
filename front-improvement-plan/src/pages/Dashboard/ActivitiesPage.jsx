import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import {
    Plus, Search, ClipboardList,
    CheckCircle2, X, Loader2, Trash2, Edit,
    Eye, FileDown, MoreHorizontal,
    ChevronLeft, ChevronRight, AlertCircle, CalendarDays, ChevronDown, BookOpen
} from 'lucide-react';


// Componentes Modularizados
import SearchSelect from '../../components/Dashboard/SearchSelect';
import SubActivityForm from '../../components/Dashboard/SubActivityForm';

/**
 * Extrae un mensaje de error legible desde una respuesta de Axios.
 *
 * Cuando la petición se realiza con `responseType: 'blob'`, el cuerpo del error
 * también llega como `Blob`; en ese caso se lee como texto y se intenta parsear
 * como JSON para recuperar el `message` enviado por el backend.
 *
 * @param {import('axios').AxiosError} error - Error capturado en el bloque catch.
 * @returns {Promise<string>} Mensaje a mostrar al usuario.
 */
const getErrorMessage = async (error) => {
    const fallback = 'No se pudo generar el reporte de seguimiento. Inténtelo más tarde.';
    if (!error.response) {
        return error.message || fallback;
    }
    const { data } = error.response;
    if (data instanceof Blob) {
        try {
            const parsed = JSON.parse(await data.text());
            return parsed.message || fallback;
        } catch {
            return fallback;
        }
    }
    return data?.message || fallback;
};

/**
 * Función auxiliar para conciliar metas anuales con la vigencia del plan de mejoramiento.
 * 
 * Ajusta o genera la estructura de metas anuales ({ yearIndex, label, value }) acorde
 * a los años comprendidos entre startYear y endYear del plan resuelto.
 * 
 * @param {Array} annualGoals - Array de metas anuales existentes.
 * @param {Object|string|null} plan - Plan o ID de plan.
 * @param {Object|null} activePlan - Plan activo.
 * @param {Array} [plans=[]] - Lista de planes disponibles.
 * @returns {Array} Array reconciliado de metas anuales.
 */
const reconcileAnnualGoals = (annualGoals, plan, activePlan, plans = []) => {
    const resolvedPlan = plan && typeof plan === 'object' ? plan : (plans.find(p => p._id === plan) || activePlan);
    if (!resolvedPlan) return annualGoals || [];
    const start = resolvedPlan.startYear;
    const end = resolvedPlan.endYear;
    const count = end - start + 1;
    const reconciled = [];
    
    for (let i = 0; i < count; i++) {
        const yearStr = String(start + i);
        const existing = (annualGoals || []).find(g => String(g.label) === yearStr || g.yearIndex === i + 1);
        reconciled.push({
            yearIndex: i + 1,
            label: yearStr,
            value: existing ? existing.value : null
        });
    }
    return reconciled;
};


/**
 * Componente que renderiza la página de gestión de actividades (Activities).
 * 
 * Renderiza la vista para listar, crear, editar y exportar actividades y sus subactividades.
 * Gestiona catálogos, filtros por plan/programa, paginación, modal de formulario,
 * exportación y operaciones relacionadas. Consume múltiples endpoints según rol (admin/coordinator/teacher).
 * 
 * Estado que maneja (@state):
 * - activities {Array} - Lista de actividades.
 * - loading {boolean} - Estado de carga.
 * - isModalOpen {boolean} - Modal de actividad abierto/cerrado.
 * - isSaving {boolean} - Guardado en curso.
 * - isViewOnly {boolean} - Modo solo lectura.
 * - searchTerm {string} - Búsqueda.
 * - currentPage {number} - Página actual.
 * - isExportModalOpen {boolean} - Modal de exportación.
 * - selectedExportYears {Array} - Años seleccionados para exportar.
 * - plans {Array} - Planes de mejoramiento.
 * - activePlan {Object|null} - Plan activo.
 * - selectedPlanFilter {string} - Filtro por plan.
 * - programs {Array} - Programas (admin).
 * - selectedProgramId {string} - Programa seleccionado (admin).
 * - catalogs {Object} - Catálogos (campuses, sources, pdiLines, etc.).
 * 
 * Contexto consumido (@context): useAuth() → { user }.
 * 
 * Efectos secundarios (@effects):
 * - Múltiples useEffect para carga inicial, sincronización de filtros, carga de catálogos y estados derivados.
 * 
 * Endpoints que consume (representativos): GET `/activities`, GET `/plans`, GET `/programs`, GET `/catalogs/*`, POST/PUT/DELETE según acciones.
 * 
 * @returns {JSX.Element} Elemento JSX que representa la página de actividades.
 */
const ActivitiesPage = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    // --- State: datos principales ---
    const [activities, setActivities] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [isViewOnly, setIsViewOnly] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    // --- State: export tracking modal ---
    const [isExportModalOpen, setIsExportModalOpen] = useState(false);
    const [selectedExportYears, setSelectedExportYears] = useState([]);

    // --- State: planes de mejoramiento ---
    const [plans, setPlans] = useState([]);          // Todos los planes del programa
    const [activePlan, setActivePlan] = useState(null); // Plan activo resuelto
    const [selectedPlanFilter, setSelectedPlanFilter] = useState(''); // Filtro en la tabla

    const isAdmin = user?.role === 'admin';
    const isTeacher = user?.role === 'teacher';

    // --- State: programas (solo admin) ---
    const [programs, setPrograms] = useState([]);
    const [selectedProgramId, setSelectedProgramId] = useState('');

    // Años del plan para cabeceras y renderizado dinámico de celdas
    const planYears = useMemo(() => {
        const currentPlan = plans.find(p => p._id === selectedPlanFilter) || activePlan;
        if (!currentPlan) return [2024, 2025, 2026, 2027, 2028, 2029, 2030]; // default fallback de 7 años
        return Array.from({ length: currentPlan.endYear - currentPlan.startYear + 1 }, (_, i) => currentPlan.startYear + i);
    }, [plans, selectedPlanFilter, activePlan]);


    // --- State: catálogos ---
    const [catalogs, setCatalogs] = useState({
        campuses: [], sources: [], pdiLines: [], pdiPrograms: [], pdiObjectives: [],
        factorsInst: [], factorsProg: [],
        qualityInst: [], qualityProg: []
    });

    const [suggestions, setSuggestions] = useState({ field: '', index: null, data: [] });
    const [userSearch, setUserSearch] = useState({ query: '', results: [], loading: false });

    /**
     * Construye el array de annualGoals dinámico basado en la vigencia del plan.
     * Reemplaza la generación estática de 7 posiciones hardcodeadas.
     */
    const buildAnnualGoals = useCallback((plan) => {
        if (!plan) return Array.from({ length: 7 }, (_, i) => ({
            yearIndex: i + 1, label: String(new Date().getFullYear() + i), value: null
        }));
        return Array.from({ length: plan.endYear - plan.startYear + 1 }, (_, i) => ({
            yearIndex: i + 1, label: String(plan.startYear + i), value: null
        }));
    }, []);

    const initialSubActivity = useCallback((plan) => ({
        description: '', responsibleUnit: '', indicatorName: '',
        productEvidence: '', resourceDescription: '',
        campus: '', identificationSource: '', pdiLine: '', pdiProgram: '',
        qualityFactor: '', resources: [],
        baseline: null,              // Línea base: valor de referencia del indicador previo al plan
        annualGoals: buildAnnualGoals(plan),
        startDate: '', endDate: ''
    }), [buildAnnualGoals]);

    const [formData, setFormData] = useState({
        findingDescription: '', status: 'No ejecutado',
        responsibleUsers: [], subActivities: [],
        improvementPlan: ''
    });


    useEffect(() => {
        if (isAdmin) {
            api.get('/programs')
                .then(res => {
                    const data = res.data.data || [];
                    setPrograms(data);
                    if (data.length > 0) {
                        setSelectedProgramId(data[0]._id);
                        fetchPlans(data[0]._id);
                    }
                })
                .catch(console.error);
        } else {
            fetchPlans();
        }
        fetchCatalogs();
    }, [isAdmin]);

    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, selectedPlanFilter]);

    const fetchActivities = async (planId = '', programId = '') => {
        try {
            setLoading(true);
            const targetProgram = programId || (isAdmin ? selectedProgramId : (user?.program?._id || user?.program));
            const queryParams = [];
            if (planId) queryParams.push(`planId=${planId}`);
            if (targetProgram) queryParams.push(`programId=${targetProgram}`);
            
            const queryString = queryParams.length > 0 ? `?${queryParams.join('&')}` : '';
            const res = await api.get(`/activities${queryString}`);
            setActivities(res.data.data);
        } catch (error) { 
            console.error('Error fetching activities:', error); 
        } finally { 
            setLoading(false); 
        }
    };

    /**
     * Carga los planes del programa de manera dinámica.
     */
    const fetchPlans = async (programId = '') => {
        const targetProgram = programId || user?.program?._id || user?.program;
        if (!targetProgram) return;
        try {
            const res = await api.get(`/plans/by-program/${targetProgram}`);
            const data = res.data.data || [];
            setPlans(data);
            const active = data.find(p => p.isActive) || null;
            setActivePlan(active);
            
            if (active) {
                setSelectedPlanFilter(active._id);
                fetchActivities(active._id, targetProgram);
            } else {
                setSelectedPlanFilter('');
                fetchActivities('', targetProgram);
            }
        } catch (err) {
            console.error('Error fetching plans:', err);
        }
    };

    const fetchCatalogs = async () => {
        try {
            const [campRes, sourceRes, lineRes, progRes, objRes, fInstRes, fProgRes, qInstRes, qProgRes] = await Promise.all([
                api.get('/catalogs/campuses'), api.get('/catalogs/id-sources'),
                api.get('/catalogs/pdi-lines'), api.get('/catalogs/pdi-programs'),
                api.get('/catalogs/pdi-objectives'),
                api.get('/catalogs/factors-inst'), api.get('/catalogs/factors-prog'),
                api.get('/catalogs/quality-inst'), api.get('/catalogs/quality-prog')
            ]);
            setCatalogs({
                campuses: campRes.data.data, sources: sourceRes.data.data,
                pdiLines: lineRes.data.data, pdiPrograms: progRes.data.data,
                pdiObjectives: objRes.data.data,
                factorsInst: fInstRes.data.data, factorsProg: fProgRes.data.data,
                qualityInst: qInstRes.data.data, qualityProg: qProgRes.data.data
            });
        } catch (error) { console.error('Error fetching catalogs:', error); }
    };

    // --- Manejadores de Estado ---
    const addSubActivity = () => {
        const resolvedPlan = plans.find(p => p._id === formData.improvementPlan) || activePlan;
        setFormData(prev => ({ ...prev, subActivities: [...prev.subActivities, initialSubActivity(resolvedPlan)] }));
    };

    const removeSubActivity = (index) => {
        if (formData.subActivities.length > 1) {
            setFormData(prev => ({ ...prev, subActivities: prev.subActivities.filter((_, i) => i !== index) }));
        }
    };

    const updateSubField = (idx, field, value) => {
        if (field === 'baseline' && value !== null && value < 0) return;
        setFormData(prev => {
            const updated = prev.subActivities.map((sub, sIdx) => {
                if (sIdx !== idx) return sub;
                return { ...sub, [field]: value };
            });
            return { ...prev, subActivities: updated };
        });
    };

    const updateSubGoal = (subIdx, goalIdx, value) => {
        const valNum = value === '' ? null : Number(value);
        if (valNum !== null && valNum < 0) return;
        setFormData(prev => {
            const updatedSubActivities = prev.subActivities.map((sub, sIdx) => {
                if (sIdx !== subIdx) return sub;
                const updatedGoals = sub.annualGoals.map((g, gIdx) => {
                    if (gIdx !== goalIdx) return g;
                    return {
                        ...g,
                        value: valNum
                    };
                });
                return {
                    ...sub,
                    annualGoals: updatedGoals
                };
            });
            return {
                ...prev,
                subActivities: updatedSubActivities
            };
        });
    };

    const toggleSubResource = (idx, res) => {
        setFormData(prev => {
            const updated = prev.subActivities.map((sub, sIdx) => {
                if (sIdx !== idx) return sub;
                const current = sub.resources || [];
                const updatedResources = current.includes(res) 
                    ? current.filter(r => r !== res) 
                    : [...current, res];
                return { ...sub, resources: updatedResources };
            });
            return { ...prev, subActivities: updated };
        });
    };

    const getSuggestions = useCallback(async (field, query, index) => {
        if (!query || query.length < 2) return setSuggestions({ field: '', index: null, data: [] });
        try {
            const res = await api.get(`/activities/suggestions?field=${field}&query=${query}`);
            setSuggestions({ field, index, data: res.data.data });
        } catch (error) { console.error(error); }
    }, []);

    const selectIndicatorTemplate = (subIdx, template) => {
        const updated = [...formData.subActivities];
        const currentSub = updated[subIdx];
        const resolvedPlan = plans.find(p => p._id === formData.improvementPlan) || activePlan;

        currentSub.indicatorName = template.indicatorName || '';
        if (template.description) currentSub.description = template.description;
        if (template.responsibleUnit) currentSub.responsibleUnit = template.responsibleUnit;
        if (template.baseline !== undefined) currentSub.baseline = template.baseline;
        if (template.productEvidence) currentSub.productEvidence = template.productEvidence;
        if (template.resourceDescription) currentSub.resourceDescription = template.resourceDescription;
        if (template.campus) currentSub.campus = template.campus;
        if (template.identificationSource) currentSub.identificationSource = template.identificationSource;
        if (template.pdiLine) currentSub.pdiLine = template.pdiLine;
        if (template.pdiProgram) currentSub.pdiProgram = template.pdiProgram;
        if (template.pdiObjective) currentSub.pdiObjective = template.pdiObjective;
        if (template.qualityFactor) currentSub.qualityFactor = template.qualityFactor;
        if (template.resources) currentSub.resources = [...template.resources];
        if (template.startDate) {
            currentSub.startDate = new Date(template.startDate).toISOString().split('T')[0];
        }
        if (template.endDate) {
            currentSub.endDate = new Date(template.endDate).toISOString().split('T')[0];
        }

        // Reconciliar metas
        currentSub.annualGoals = reconcileAnnualGoals(template.annualGoals, resolvedPlan, activePlan, plans);

        setFormData({ ...formData, subActivities: updated });
        setSuggestions({ field: '', index: null, data: [] });
    };

    const handleCreateSource = async (name) => {
        try {
            const res = await api.post('/catalogs/id-sources', { name });
            if (res.data.success) {
                setCatalogs(prev => ({
                    ...prev,
                    sources: [res.data.data, ...prev.sources]
                }));
                showToast('Fuente de identificación creada exitosamente', 'success');
                return res.data.data;
            }
        } catch (error) {
            console.error(error);
            showToast(error.response?.data?.message || 'Error al crear la fuente de identificación');
        }
    };

    const handleCreatePDILine = async (name) => {
        const code = prompt(`Ingrese el código para la línea estratégica "${name}" (ej: L5):`);
        if (!code) return;
        try {
            const res = await api.post('/catalogs/pdi-lines', { code, name });
            if (res.data.success) {
                setCatalogs(prev => ({
                    ...prev,
                    pdiLines: [res.data.data, ...prev.pdiLines]
                }));
                showToast('Línea estratégica creada exitosamente', 'success');
                return res.data.data;
            }
        } catch (error) {
            console.error(error);
            showToast(error.response?.data?.message || 'Error al crear la línea estratégica');
        }
    };

    const handleCreatePDIProgram = async (name, parentLineText) => {
        if (!parentLineText) {
            alert("Debe seleccionar primero una Línea Estratégica PDI.");
            return;
        }
        const matchedLine = catalogs.pdiLines.find(l => 
            parentLineText === `${l.code}. ${l.name}` || parentLineText === l.name
        );
        if (!matchedLine) {
            alert("No se encontró la Línea Estratégica PDI seleccionada.");
            return;
        }
        const code = prompt(`Ingrese el código para el programa estratégico "${name}" (ej: L5.P1):`);
        if (!code) return;
        try {
            const res = await api.post('/catalogs/pdi-programs', { line: matchedLine._id, code, name });
            if (res.data.success) {
                const newProg = { ...res.data.data, line: matchedLine };
                setCatalogs(prev => ({
                    ...prev,
                    pdiPrograms: [newProg, ...prev.pdiPrograms]
                }));
                showToast('Programa estratégico creado exitosamente', 'success');
                return newProg;
            }
        } catch (error) {
            console.error(error);
            showToast(error.response?.data?.message || 'Error al crear el programa estratégico');
        }
    };

    const handleCreateFactorQuality = async (name) => {
        const typeChoice = prompt(
            `Seleccione el tipo para "${name}" escribiendo el número:\n` +
            `1. Factor de Programa\n` +
            `2. Factor Institucional\n` +
            `3. Condición de Calidad de Programa\n` +
            `4. Condición de Calidad Institucional`
        );
        if (!typeChoice) return;
        const choice = typeChoice.trim();
        
        let endpoint = '';
        let catalogKey = '';
        let typeLabel = '';
        
        if (choice === '1') {
            endpoint = '/catalogs/factors-prog';
            catalogKey = 'factorsProg';
            typeLabel = 'Factor de Programa';
        } else if (choice === '2') {
            endpoint = '/catalogs/factors-inst';
            catalogKey = 'factorsInst';
            typeLabel = 'Factor Institucional';
        } else if (choice === '3') {
            endpoint = '/catalogs/quality-prog';
            catalogKey = 'qualityProg';
            typeLabel = 'Condición de Calidad de Programa';
        } else if (choice === '4') {
            endpoint = '/catalogs/quality-inst';
            catalogKey = 'qualityInst';
            typeLabel = 'Condición de Calidad Institucional';
        } else {
            alert("Opción no válida.");
            return;
        }

        const code = prompt(`Ingrese el código para el/la ${typeLabel} "${name}":`);
        if (!code) return;

        try {
            const res = await api.post(endpoint, { code, name });
            if (res.data.success) {
                setCatalogs(prev => ({
                    ...prev,
                    [catalogKey]: [res.data.data, ...prev[catalogKey]]
                }));
                showToast(`${typeLabel} creado/a exitosamente`, 'success');
                return res.data.data;
            }
        } catch (error) {
            console.error(error);
            showToast(error.response?.data?.message || `Error al crear ${typeLabel}`);
        }
    };

    const searchUsers = async (query) => {
        if (!query || query.length < 2) return setUserSearch(prev => ({ ...prev, results: [] }));
        try {
            setUserSearch(prev => ({ ...prev, loading: true }));
            const res = await api.get(`/users/search?query=${query}`);
            setUserSearch(prev => ({ ...prev, results: res.data.data }));
        } catch (error) { console.error(error); } finally { setUserSearch(prev => ({ ...prev, loading: false })); }
    };

    const handleSave = async (e) => {
        e.preventDefault();
        try {
            setIsSaving(true);
            
            // Validar que cada subactividad tenga al menos una meta positiva
            for (let sIdx = 0; sIdx < formData.subActivities.length; sIdx++) {
                const sub = formData.subActivities[sIdx];
                const hasPositiveGoal = sub.annualGoals.some(g => g.value !== null && g.value > 0);
                if (!hasPositiveGoal) {
                    showToast(`La sub-actividad ${sIdx + 1} debe tener al menos una meta anual con valor positivo.`, 'error');
                    setIsSaving(false);
                    return;
                }
            }

            const planToUse = plans.find(p => p._id === formData.improvementPlan) || activePlan;
            const payload = { 
                ...formData,
                subActivities: formData.subActivities.map(s => ({
                    ...s,
                    annualGoals: reconcileAnnualGoals(s.annualGoals, planToUse, activePlan, plans)
                }))
            };
            if (!payload.improvementPlan) delete payload.improvementPlan;

            if (formData._id) {
                await api.patch(`/activities/${formData._id}`, payload);
            } else {
                await api.post('/activities', payload);
            }
            setIsModalOpen(false);
            fetchActivities(selectedPlanFilter, isAdmin ? selectedProgramId : '');
            showToast(formData._id ? 'Hallazgo actualizado' : 'Hallazgo registrado exitosamente', 'success');
            setFormData({
                findingDescription: '',
                status: 'No ejecutado',
                responsibleUsers: [],
                subActivities: [initialSubActivity(activePlan)],
                improvementPlan: activePlan?._id || ''
            });
        } catch (error) {
            showToast(error.response?.data?.message || 'Error al guardar');
        } finally { setIsSaving(false); }
    };

    const [toast, setToast] = useState({ show: false, message: '', type: 'error' });

    const showToast = (message, type = 'error') => {
        setToast({ show: true, message, type });
        setTimeout(() => setToast({ show: false, message: '', type: 'error' }), 4000);
    };

    const handleExport = async () => {
        try {
            const queryParams = [];
            if (selectedPlanFilter) queryParams.push(`planId=${selectedPlanFilter}`);
            const targetProgram = isAdmin ? selectedProgramId : (user?.program?._id || user?.program);
            if (targetProgram) queryParams.push(`programId=${targetProgram}`);
            const params = queryParams.length > 0 ? `?${queryParams.join('&')}` : '';
            const res = await api.get(`/activities/export${params}`, { responseType: 'blob' });

            const url = window.URL.createObjectURL(new Blob([res.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `Plan_Mejoramiento_${new Date().getFullYear()}.xlsx`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            showToast('Reporte generado exitosamente.', 'success');
        } catch (error) {
            console.error('Error exporting to Excel:', error);
            showToast('No se pudo generar el reporte. Inténtelo más tarde.');
        }
    };

    const handleOpenExportModal = () => {
        const resolvedPlan = selectedPlanFilter ? plans.find(p => p._id === selectedPlanFilter) : activePlan;
        if (!resolvedPlan) {
            showToast('No hay un plan activo o seleccionado para exportar el seguimiento.', 'error');
            return;
        }
        const years = Array.from({ length: resolvedPlan.endYear - resolvedPlan.startYear + 1 }, (_, i) => resolvedPlan.startYear + i);
        setSelectedExportYears(years);
        setIsExportModalOpen(true);
    };

    const executeExportTracking = async () => {
        const resolvedPlan = selectedPlanFilter ? plans.find(p => p._id === selectedPlanFilter) : activePlan;
        if (!resolvedPlan) {
            showToast('No hay un plan activo o seleccionado para exportar el seguimiento.', 'error');
            return;
        }

        try {
            let url = `/tracking/export?planId=${resolvedPlan._id}`;
            if (selectedExportYears.length > 0) {
                url += `&years=${selectedExportYears.join(',')}`;
            }

            const res = await api.get(url, { responseType: 'blob' });

            const blobUrl = window.URL.createObjectURL(new Blob([res.data]));
            const link = document.createElement('a');
            link.href = blobUrl;
            link.setAttribute('download', `Matriz_Seguimiento_${resolvedPlan.name.replace(/\s+/g, '_')}.xlsx`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(blobUrl);
            showToast(`Matriz de seguimiento de ${resolvedPlan.name} generada exitosamente.`, 'success');
            setIsExportModalOpen(false);
        } catch (error) {
            showToast(await getErrorMessage(error));
        }
    };

    const getStatusStyle = (status) => {
        const styles = {
            'Ejecutado': 'bg-emerald-50 text-emerald-600 border-emerald-100',
            'Vencido': 'bg-rose-50 text-rose-600 border-rose-100',
            'En ejecución': 'bg-amber-50 text-amber-600 border-amber-100',
            'Por Vencer': 'bg-orange-50 text-orange-600 border-orange-100',
            'No ejecutado': 'bg-gray-50 text-gray-500 border-gray-100',
            'Con Tiempo': 'bg-sky-50 text-sky-600 border-sky-100'
        };
        return styles[status] || 'bg-gray-50 text-gray-500 border-gray-100';
    };

    const filteredFindings = activities.filter(f =>
        f.findingDescription.toLowerCase().includes(searchTerm.toLowerCase()) ||
        f.subActivities.some(s =>
            s.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
            s.responsibleUnit.toLowerCase().includes(searchTerm.toLowerCase())
        )
    );

    const totalPages = Math.ceil(filteredFindings.length / itemsPerPage);
    const paginatedFindings = filteredFindings.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    const flatActivities = activities.flatMap(finding =>
        finding.subActivities.map(sub => ({
            ...sub,
            findingId: finding._id,
            findingDescription: finding.findingDescription,
            globalStatus: finding.status,
            globalResponsibles: finding.responsibleUsers
        }))
    ).filter(sub =>
        sub.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        sub.responsibleUnit.toLowerCase().includes(searchTerm.toLowerCase()) ||
        sub.findingDescription.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="p-4 lg:p-8 max-w-[1600px] mx-auto space-y-8 animate-in fade-in duration-500 relative">
            {/* Toast Notification */}
            {toast.show && (
                <div className="fixed top-8 left-1/2 -translate-x-1/2 z-[200] animate-in slide-in-from-top-4 duration-300">
                    <div className={`px-6 py-3 rounded-full shadow-2xl backdrop-blur-md border flex items-center gap-3 ${toast.type === 'success'
                        ? 'bg-emerald-500/90 text-white border-emerald-400'
                        : 'bg-rose-500/90 text-white border-rose-400'
                        }`}>
                        {toast.type === 'success' ? <CheckCircle2 size={18} /> : <X size={18} />}
                        <span className="text-sm font-bold tracking-tight">{toast.message}</span>
                    </div>
                </div>
            )}

            {/* Header Minimalista */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div>
                    <h1 className="text-2xl font-semibold tracking-tight">Gestión de Actividades</h1>
                    <p className="text-sm text-[var(--ig-text-secondary)]">Seguimiento institucional del Plan de Mejoramiento</p>
                    {/* Badge del plan activo */}
                    {activePlan && (
                        <div className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-[var(--ig-accent)]/10 text-[var(--ig-accent)] border border-[var(--ig-accent)]/20">
                            <CalendarDays size={11} />
                            Plan activo: {activePlan.name} ({activePlan.startYear}–{activePlan.endYear})
                        </div>
                    )}
                </div>

                <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                    <button
                        onClick={handleExport}
                        disabled={!user?.program && user?.role !== 'admin'}
                        className="ig-button-secondary flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <FileDown size={18} /> <span className="hidden sm:inline">Exportar Excel</span>
                    </button>

                    <button
                        onClick={handleOpenExportModal}
                        disabled={!user?.program && user?.role !== 'admin'}
                        className="ig-button-secondary flex items-center gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white border-0 shadow-md shadow-emerald-950/10 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <FileDown size={18} /> <span className="hidden sm:inline">Exportar Seguimiento</span>
                    </button>

                    <button
                        onClick={() => {
                            setIsViewOnly(false);
                            setFormData({
                                findingDescription: '', status: 'No ejecutado', responsibleUsers: [],
                                subActivities: [initialSubActivity(activePlan)],
                                improvementPlan: activePlan?._id || ''
                            });
                            setIsModalOpen(true);
                        }}
                        disabled={!user?.program && user?.role !== 'admin'}
                        className="ig-button-primary flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <Plus size={18} /> Registrar Actividad
                    </button>
                </div>
            </div>

            {/* Filtro por programa (solo admin) */}
            {isAdmin && programs.length > 0 && (
                <div className="ig-card rounded-xl p-4 bg-ig-bg/50 backdrop-blur-sm border border-ig-border shadow-sm">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                        <div className="flex items-center gap-2 text-[var(--ig-text-secondary)]">
                            <BookOpen size={16} />
                            <span className="text-xs font-bold uppercase tracking-wider">Filtrar por Programa</span>
                        </div>
                        <div className="relative flex-1 max-w-sm">
                            <select
                                value={selectedProgramId}
                                onChange={(e) => {
                                    const val = e.target.value;
                                    setSelectedProgramId(val);
                                    fetchPlans(val);
                                }}
                                className="ig-input w-full appearance-none pr-10 cursor-pointer bg-[var(--ig-hover)] h-10"
                            >
                                <option value="">— Seleccionar programa —</option>
                                {programs.map(p => (
                                    <option key={p._id} value={p._id}>{p.name}</option>
                                ))}
                            </select>
                            <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--ig-text-secondary)] pointer-events-none" />
                        </div>
                    </div>
                </div>
            )}

            {/* Barra de búsqueda + filtro por plan */}
            <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--ig-text-secondary)]" size={16} />
                    <input
                        type="text"
                        placeholder="Buscar actividad, hallazgo o responsable..."
                        className="ig-input w-full pl-10 h-10 rounded-lg bg-[var(--ig-hover)]"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                {/* Selector de plan para filtrar la tabla (excepto para docentes) */}
                {!isTeacher && plans.length > 0 && (
                    <div className="relative min-w-[220px]">
                        <CalendarDays className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--ig-text-secondary)]" size={14} />
                        <select
                            value={selectedPlanFilter}
                            onChange={(e) => {
                                setSelectedPlanFilter(e.target.value);
                                fetchActivities(e.target.value, isAdmin ? selectedProgramId : '');
                            }}
                            className="ig-input w-full pl-9 h-10 appearance-none cursor-pointer"
                        >
                            <option value="">Todos los planes</option>
                            {plans.map(p => (
                                <option key={p._id} value={p._id}>
                                    {p.isActive ? '● ' : ''}{p.name} ({p.startYear}–{p.endYear})
                                </option>
                            ))}
                        </select>
                        <ChevronDown size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--ig-text-secondary)] pointer-events-none" />
                    </div>
                )}
            </div>

            {!user?.program && user?.role !== 'admin' && (
                <div className="bg-rose-50 border border-rose-100 p-4 rounded-xl flex items-center gap-3 text-rose-700 animate-pulse">
                    <AlertCircle size={20} />
                    <p className="text-sm font-bold uppercase tracking-tight">Debe tener un programa asignado para gestionar actividades.</p>
                </div>
            )}

            {/* Tabla Estilo Excel / Institucional */}
            <div className="ig-card rounded-xl overflow-hidden border border-ig-border shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-[11px] border-collapse min-w-[2400px]">
                        <thead>
                            <tr className="bg-ig-hover border-b border-ig-border">
                                <th rowSpan="2" className="ig-table-header w-12 text-center border-r border-ig-border">ID</th>
                                <th colSpan="2" className="ig-table-header text-center border-r border-ig-border">Hallazgo / Requisito</th>
                                <th rowSpan="2" className="ig-table-header w-32 border-r border-ig-border">Sede</th>
                                <th rowSpan="2" className="ig-table-header w-32 border-r border-ig-border">Fuente</th>
                                <th colSpan="2" className="ig-table-header text-center border-r border-ig-border">Articulación PDI</th>
                                <th rowSpan="2" className="ig-table-header w-80 border-r border-ig-border">Actividad a Realizar</th>
                                <th colSpan="2" className="ig-table-header text-center border-r border-ig-border">Cronograma</th>
                                <th rowSpan="2" className="ig-table-header w-40 border-r border-ig-border">Responsable(s)</th>
                                <th rowSpan="2" className="ig-table-header w-64 border-r border-ig-border">Indicador de Resultado</th>
                                <th rowSpan="2" className="ig-table-header w-20 text-center border-r border-ig-border">Línea Base</th>
                                <th rowSpan="2" className="ig-table-header w-16 text-center border-r border-ig-border">Meta Total</th>
                                <th colSpan={planYears.length} className="ig-table-header text-center border-r border-ig-border">Meta Anualizada</th>
                                <th rowSpan="2" className="ig-table-header w-64 border-r border-ig-border">Producto / Evidencia</th>
                                <th colSpan="2" className="ig-table-header text-center border-r border-ig-border">Recursos</th>
                                <th rowSpan="2" className="ig-table-header text-right sticky right-0 bg-ig-hover px-4">Acciones</th>
                            </tr>
                            <tr className="bg-ig-hover border-b border-ig-border">
                                <th className="ig-table-header border-r border-ig-border w-64">Descripción</th>
                                <th className="ig-table-header border-r border-ig-border w-48">Factor Calidad</th>
                                <th className="ig-table-header border-r border-ig-border w-48">Línea Estratégica</th>
                                <th className="ig-table-header border-r border-ig-border w-48">Programa Estratégico</th>
                                <th className="ig-table-header border-r border-ig-border w-24">Inicio</th>
                                <th className="ig-table-header border-r border-ig-border w-24">Fin</th>
                                {planYears.map(y => (
                                    <th key={y} className="ig-table-header border-r border-ig-border w-14 text-center">{y}</th>
                                ))}
                                <th className="ig-table-header border-r border-ig-border w-32">Tipo</th>
                                <th className="ig-table-header border-r border-ig-border w-64">Descripción</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-ig-border">
                            {loading ? (
                                <tr><td colSpan={19 + planYears.length} className="py-20 text-center"><Loader2 className="animate-spin text-ig-accent mx-auto" size={32} /></td></tr>
                            ) : filteredFindings.length === 0 ? (
                                <tr><td colSpan={19 + planYears.length} className="py-20 text-center text-ig-text-secondary">No se encontraron registros.</td></tr>

                            ) : paginatedFindings.map((finding, fIdx) => (
                                <React.Fragment key={finding._id}>
                                    {finding.subActivities.map((sub, sIdx) => (
                                        <tr key={`${finding._id}-${sIdx}`} className="hover:bg-ig-hover/50 transition-colors group">
                                            {/* Columnas del Hallazgo (Parent) - Agrupadas */}
                                            {sIdx === 0 && (
                                                <>
                                                    <td rowSpan={finding.subActivities.length} className="ig-table-cell text-center border-r border-ig-border font-bold align-middle pt-4">
                                                        {(currentPage - 1) * itemsPerPage + fIdx + 1}
                                                    </td>
                                                    <td rowSpan={finding.subActivities.length} className="ig-table-cell border-r border-ig-border align-top pt-4">
                                                        <div className="max-w-xs text-[10px] leading-relaxed">
                                                            {finding.findingDescription}
                                                        </div>
                                                    </td>
                                                    <td rowSpan={finding.subActivities.length} className="ig-table-cell border-r border-ig-border align-top pt-4 italic text-ig-text-secondary">
                                                        {sub.qualityFactor || 'N/A'}
                                                    </td>
                                                </>
                                            )}

                                            {/* Columnas que se repiten por Sub-actividad */}
                                            <td className="ig-table-cell border-r border-ig-border align-top pt-4">
                                                {sub.campus || 'Sede Principal'}
                                            </td>
                                            <td className="ig-table-cell border-r border-ig-border align-top pt-4">
                                                {sub.identificationSource || 'Autoevaluación'}
                                            </td>
                                            <td className="ig-table-cell border-r border-ig-border align-top pt-4 font-medium text-ig-accent">
                                                {sub.pdiLine || 'N/A'}
                                            </td>
                                            <td className="ig-table-cell border-r border-ig-border align-top pt-4">
                                                {sub.pdiProgram || 'N/A'}
                                            </td>
                                            <td className="ig-table-cell border-r border-ig-border align-top pt-4 font-semibold">
                                                <div className="space-y-2">
                                                    <div>{sub.description}</div>
                                                    <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                                                        <button
                                                            onClick={() => navigate(`/dashboard/activities/tracking/${finding._id}/${sub._id}`)}
                                                            className="px-2 py-0.5 rounded bg-ig-accent/10 hover:bg-ig-accent/20 text-ig-accent border border-ig-accent/20 font-bold transition-all text-[9px] flex items-center gap-1 shadow-sm"
                                                            title="Gestionar Seguimiento y Evidencias"
                                                        >
                                                            <ClipboardList size={10} />
                                                            Seguimiento
                                                        </button>
                                                        <span className={`px-2 py-0.5 rounded font-black text-[9px] border ${
                                                            (sub.progressPercent || 0) <= 40 ? 'bg-rose-50 border-rose-200 text-rose-700' :
                                                            (sub.progressPercent || 0) <= 60 ? 'bg-amber-50 border-amber-200 text-amber-700' :
                                                            'bg-emerald-50 border-emerald-200 text-emerald-700'
                                                        }`}>
                                                            Progreso: {sub.progressPercent || 0}%
                                                        </span>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="ig-table-cell border-r border-ig-border align-top pt-4 text-center">
                                                {sub.startDate ? new Date(sub.startDate).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '-'}
                                            </td>
                                            <td className="ig-table-cell border-r border-ig-border align-top pt-4 text-center">
                                                {sub.endDate ? new Date(sub.endDate).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '-'}
                                            </td>
                                            <td className="ig-table-cell border-r border-ig-border align-top pt-4">
                                                {sub.responsibleUnit}
                                            </td>
                                            <td className="ig-table-cell border-r border-ig-border align-top pt-4">
                                                {sub.indicatorName}
                                            </td>
                                            {/* Línea Base */}
                                            <td className="ig-table-cell border-r border-ig-border align-top pt-4 text-center font-bold text-[var(--ig-text-main)]">
                                                {sub.baseline ?? '-'}
                                            </td>
                                            <td className="ig-table-cell border-r border-ig-border align-top pt-4 text-center font-bold">
                                                {(sub.annualGoals || []).reduce((acc, g) => acc + (g.value || 0), 0)}
                                            </td>
                                            {planYears.map((y, index) => {
                                                const goal = (sub.annualGoals || []).find(g => g.yearIndex === index + 1);
                                                return (
                                                    <td key={index} className="ig-table-cell border-r border-ig-border align-top pt-4 text-center">
                                                        <div className={goal?.value ? "bg-ig-accent text-white rounded px-1 font-bold" : "text-ig-text-secondary opacity-30"}>
                                                            {goal?.value ?? '-'}
                                                        </div>
                                                    </td>
                                                );
                                            })}

                                            <td className="ig-table-cell border-r border-ig-border align-top pt-4">
                                                {sub.productEvidence}
                                            </td>
                                            <td className="ig-table-cell border-r border-ig-border align-top pt-4">
                                                <div className="flex flex-wrap gap-1">
                                                    {sub.resources?.map(r => (
                                                        <span key={r} className="bg-ig-hover px-1.5 py-0.5 rounded text-[9px] font-bold border border-ig-border uppercase">{r}</span>
                                                    ))}
                                                </div>
                                            </td>
                                            <td className="ig-table-cell border-r border-ig-border align-top pt-4 italic text-ig-text-secondary">
                                                {sub.resourceDescription}
                                            </td>

                                            {/* Acciones */}
                                            {sIdx === 0 ? (
                                                <td rowSpan={finding.subActivities.length} className="ig-table-cell text-right sticky right-0 bg-ig-bg/95 backdrop-blur-sm group-hover:bg-ig-hover/90 transition-colors align-top pt-4 px-4 shadow-[-8px_0_12px_-4px_rgba(0,0,0,0.05)]">
                                                    <div className="flex justify-end gap-1">
                                                        <button
                                                            onClick={() => {
                                                                setFormData({
                                                                    ...finding,
                                                                    improvementPlan: finding.improvementPlan?._id || finding.improvementPlan || '',
                                                                    subActivities: finding.subActivities.map(s => ({
                                                                        ...s,
                                                                        startDate: s.startDate ? new Date(s.startDate).toISOString().split('T')[0] : '',
                                                                        endDate: s.endDate ? new Date(s.endDate).toISOString().split('T')[0] : '',
                                                                        annualGoals: reconcileAnnualGoals(s.annualGoals, finding.improvementPlan?._id || finding.improvementPlan, activePlan, plans)
                                                                    }))
                                                                });
                                                                setIsViewOnly(true);
                                                                setIsModalOpen(true);
                                                            }}
                                                            className="p-1.5 hover:bg-ig-hover rounded-full transition-colors"
                                                        >
                                                            <Eye size={16} className="text-ig-text-secondary" />
                                                        </button>
                                                        <button
                                                            onClick={() => {
                                                                setFormData({
                                                                    ...finding,
                                                                    improvementPlan: finding.improvementPlan?._id || finding.improvementPlan || '',
                                                                    subActivities: finding.subActivities.map(s => ({
                                                                        ...s,
                                                                        startDate: s.startDate ? new Date(s.startDate).toISOString().split('T')[0] : '',
                                                                        endDate: s.endDate ? new Date(s.endDate).toISOString().split('T')[0] : '',
                                                                        annualGoals: reconcileAnnualGoals(s.annualGoals, finding.improvementPlan?._id || finding.improvementPlan, activePlan, plans)
                                                                    }))
                                                                });
                                                                setIsViewOnly(false);
                                                                setIsModalOpen(true);
                                                            }}
                                                            className="p-1.5 hover:bg-ig-hover rounded-full transition-colors"
                                                        >
                                                            <Edit size={16} className="text-ig-text-main" />
                                                        </button>
                                                        <button
                                                            onClick={async () => {
                                                                if (window.confirm('¿Estás seguro de eliminar todo este hallazgo y sus actividades?')) {
                                                                    try {
                                                                        await api.delete(`/activities/${finding._id}`);
                                                                        fetchActivities(selectedPlanFilter, isAdmin ? selectedProgramId : '');
                                                                        showToast('Hallazgo eliminado exitosamente', 'success');
                                                                    } catch (error) {
                                                                        showToast('Error al eliminar');
                                                                    }
                                                                }
                                                            }}
                                                            className="p-1.5 hover:bg-red-50 rounded-full transition-colors"
                                                        >
                                                            <Trash2 size={16} className="text-red-500" />
                                                        </button>
                                                    </div>
                                                </td>
                                            ) : null}
                                        </tr>
                                    ))}
                                </React.Fragment>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Paginación Estilo Instagram */}
                {!loading && filteredFindings.length > 0 && (
                    <div className="px-6 py-4 border-t border-ig-border flex flex-col sm:flex-row items-center justify-between gap-4 bg-ig-bg/50">
                        <p className="text-[11px] text-ig-text-secondary">
                            Mostrando <span className="font-bold text-ig-text-main">{(currentPage - 1) * itemsPerPage + 1}</span> a <span className="font-bold text-ig-text-main">{Math.min(currentPage * itemsPerPage, filteredFindings.length)}</span> de <span className="font-bold text-ig-text-main">{filteredFindings.length}</span> hallazgos
                        </p>

                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                                disabled={currentPage === 1}
                                className="p-2 rounded-lg border border-ig-border hover:bg-ig-hover disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                            >
                                <ChevronLeft size={16} />
                            </button>

                            <div className="flex items-center gap-1 px-2">
                                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                    let pageNum;
                                    if (totalPages <= 5) pageNum = i + 1;
                                    else if (currentPage <= 3) pageNum = i + 1;
                                    else if (currentPage >= totalPages - 2) pageNum = totalPages - 4 + i;
                                    else pageNum = currentPage - 2 + i;

                                    return (
                                        <button
                                            key={pageNum}
                                            onClick={() => setCurrentPage(pageNum)}
                                            className={`w-8 h-8 rounded-lg text-[11px] font-bold transition-all ${currentPage === pageNum
                                                ? 'bg-ig-accent text-white shadow-sm'
                                                : 'hover:bg-ig-hover text-ig-text-secondary'
                                                }`}
                                        >
                                            {pageNum}
                                        </button>
                                    );
                                })}
                            </div>

                            <button
                                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                                disabled={currentPage === totalPages}
                                className="p-2 rounded-lg border border-ig-border hover:bg-ig-hover disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                            >
                                <ChevronRight size={16} />
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Modal de Registro Estilo Instagram */}
            {isModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-2 md:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="bg-[var(--ig-bg)] border border-[var(--ig-border)] rounded-2xl w-full max-w-6xl max-h-[95vh] overflow-hidden shadow-2xl flex flex-col">
                        <div className="p-4 md:p-6 border-b border-[var(--ig-border)] flex justify-between items-center bg-[var(--ig-bg)] z-20">
                            <div>
                                <h2 className="text-lg font-semibold tracking-tight">
                                    {isViewOnly ? 'Detalles del Hallazgo' : formData._id ? 'Editar Hallazgo' : 'Registro Institucional'}
                                </h2>
                            </div>
                            <button onClick={() => setIsModalOpen(false)} className="p-2 text-[var(--ig-text-main)] hover:opacity-70 transition-opacity"><X size={24} /></button>
                        </div>

                        <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-4 md:p-8 space-y-10 bg-ig-bg">
                            {/* Bloque 1: El Hallazgo (Raíz) */}
                            <div className="bg-ig-hover/40 p-6 md:p-8 rounded-2xl border border-ig-border space-y-6">
                                <h3 className="text-xs font-bold text-ig-text-secondary uppercase tracking-wider flex items-center gap-2">
                                    <ClipboardList size={16} /> 1. Información del Hallazgo
                                </h3>
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-xs font-semibold text-ig-text-secondary uppercase ml-1">Descripción del Hallazgo</label>
                                        <textarea
                                            required
                                            disabled={isViewOnly}
                                            value={formData.findingDescription}
                                            onChange={e => setFormData({ ...formData, findingDescription: e.target.value })}
                                            className="ig-input w-full h-24 resize-none transition-all"
                                            placeholder="Describa la debilidad o hallazgo detectado..."
                                        />
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <SearchSelect
                                            label="Estado Global"
                                            disabled={isViewOnly}
                                            options={["No ejecutado", "En ejecución", "Ejecutado", "Vencido", "Por Vencer", "Con Tiempo"]}
                                            value={formData.status}
                                            onChange={(val) => setFormData({ ...formData, status: val })}
                                        />

                                        {/* Selector de Plan de Mejoramiento */}
                                        {!isViewOnly && plans.length > 0 && (
                                            <div className="space-y-2">
                                                <label className="text-xs font-semibold text-ig-text-secondary uppercase ml-1">Plan de Mejoramiento</label>
                                                <div className="relative">
                                                    <CalendarDays className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--ig-text-secondary)]" size={13} />
                                                    <select
                                                        value={formData.improvementPlan || ''}
                                                        onChange={(e) => {
                                                            // Al cambiar el plan se regeneran los annualGoals de cada sub-actividad
                                                            const selected = plans.find(p => p._id === e.target.value);
                                                            setFormData(prev => ({
                                                                ...prev,
                                                                improvementPlan: e.target.value,
                                                                subActivities: prev.subActivities.map(s => ({
                                                                    ...s,
                                                                    annualGoals: buildAnnualGoals(selected)
                                                                }))
                                                            }));
                                                        }}
                                                        className="ig-input w-full pl-9 appearance-none cursor-pointer"
                                                    >
                                                        <option value="">Plan activo por defecto</option>
                                                        {plans.map(p => (
                                                            <option key={p._id} value={p._id}>
                                                                {p.isActive ? '● ' : ''}{p.name} ({p.startYear}–{p.endYear})
                                                            </option>
                                                        ))}
                                                    </select>
                                                    <ChevronDown size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--ig-text-secondary)] pointer-events-none" />
                                                </div>
                                            </div>
                                        )}
                                        {isViewOnly && formData.improvementPlan && (
                                            <div className="space-y-2">
                                                <label className="text-xs font-semibold text-ig-text-secondary uppercase ml-1">Plan de Mejoramiento</label>
                                                <div className="ig-input bg-[var(--ig-hover)] flex items-center gap-2 text-xs">
                                                    <CalendarDays size={13} className="text-[var(--ig-accent)]" />
                                                    {plans.find(p => p._id === formData.improvementPlan || p._id === formData.improvementPlan?._id)?.name || 'Plan asignado'}
                                                </div>
                                            </div>
                                        )}

                                        <div className="space-y-2 relative">
                                            <label className="text-xs font-semibold text-ig-text-secondary uppercase ml-1">Responsables</label>
                                            {!isViewOnly && (
                                                <div className="relative">
                                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-ig-text-secondary" size={14} />
                                                    <input type="text" onChange={e => searchUsers(e.target.value)} className="ig-input w-full pl-9 h-9" placeholder="Buscar..." />
                                                </div>
                                            )}
                                            {userSearch.results.length > 0 && (
                                                <div className="absolute z-50 w-full mt-1 bg-ig-bg border border-ig-border rounded-lg shadow-xl p-1 animate-in fade-in">
                                                    {userSearch.results.map(u => (
                                                        <button
                                                            key={u._id}
                                                            type="button"
                                                            onClick={() => {
                                                                if (!formData.responsibleUsers.find(r => r._id === u._id)) setFormData({ ...formData, responsibleUsers: [...formData.responsibleUsers, u] });
                                                                setUserSearch({ query: '', results: [], loading: false });
                                                            }}
                                                            className="w-full text-left px-3 py-2 hover:bg-ig-hover rounded-md text-xs font-medium transition-colors"
                                                        >
                                                            {u.firstName} {u.lastName}
                                                        </button>
                                                    ))}
                                                </div>
                                            )}
                                            <div className="flex flex-wrap gap-1 mt-2">
                                                {formData.responsibleUsers.map(u => (
                                                    <span key={u._id} className="bg-ig-accent/10 text-ig-accent px-2 py-1 rounded-md text-[10px] font-bold flex items-center gap-1.5 border border-ig-accent/20">
                                                        {u.firstName}
                                                        {!isViewOnly && <button type="button" onClick={() => setFormData({ ...formData, responsibleUsers: formData.responsibleUsers.filter(r => r._id !== u._id) })} className="hover:text-red-500"><X size={10} /></button>}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Bloque 2: Actividades Dinámicas */}
                            <div className="space-y-6">
                                <div className="flex justify-between items-center px-1">
                                    <h3 className="text-xs font-bold text-ig-text-secondary uppercase tracking-wider flex items-center gap-2">
                                        <Plus size={16} /> 2. Actividades de Mejora ({formData.subActivities.length})
                                    </h3>
                                    {!isViewOnly && (
                                        <button
                                            type="button"
                                            onClick={() => setFormData(prev => ({
                                                ...prev,
                                                subActivities: [...prev.subActivities, initialSubActivity(
                                                    plans.find(p => p._id === prev.improvementPlan) || activePlan
                                                )]
                                            }))}
                                            className="ig-button-secondary py-1.5 text-xs flex items-center gap-2 bg-ig-bg"
                                        >
                                            <Plus size={14} /> Nueva Actividad
                                        </button>
                                    )}
                                </div>

                                <div className="space-y-8">
                                    {formData.subActivities.map((sub, idx) => (
                                        <SubActivityForm
                                            key={idx}
                                            sub={sub}
                                            idx={idx}
                                            disabled={isViewOnly}
                                            catalogs={catalogs}
                                            onUpdateField={updateSubField}
                                            onUpdateGoal={updateSubGoal}
                                            onToggleResource={toggleSubResource}
                                            onRemove={removeSubActivity}
                                            suggestions={suggestions}
                                            getSuggestions={getSuggestions}
                                            plan={plans.find(p => p._id === formData.improvementPlan) || activePlan}
                                            onCreateSource={handleCreateSource}
                                            onCreatePDILine={handleCreatePDILine}
                                            onCreatePDIProgram={handleCreatePDIProgram}
                                            onCreateFactorQuality={handleCreateFactorQuality}
                                            onSelectIndicatorTemplate={selectIndicatorTemplate}
                                        />
                                    ))}
                                </div>
                            </div>

                            {/* Footer Modal */}
                            <div className="flex flex-col sm:flex-row gap-3 pt-6 border-t border-ig-border sticky bottom-0 bg-ig-bg md:-mx-8 md:-mb-8 p-4 md:p-6 z-20">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="flex-1 font-semibold text-sm py-2.5 hover:bg-ig-hover rounded-lg transition-colors border border-ig-border"
                                >
                                    {isViewOnly ? 'Cerrar' : 'Cancelar'}
                                </button>
                                {!isViewOnly && (
                                    <button
                                        type="submit"
                                        disabled={isSaving}
                                        className="ig-button-primary flex-1 py-2.5 flex items-center justify-center gap-2 disabled:opacity-50"
                                    >
                                        {isSaving ? <Loader2 className="animate-spin" size={18} /> : <CheckCircle2 size={18} />}
                                        {isSaving ? 'Guardando...' : 'Guardar Hallazgo'}
                                    </button>
                                )}
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal de Exportación de Seguimiento */}
            {isExportModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="bg-[var(--ig-bg)] border border-[var(--ig-border)] rounded-2xl w-full max-w-sm max-h-full shadow-2xl flex flex-col overflow-hidden">
                        <div className="p-6 border-b border-[var(--ig-border)] flex justify-between items-center shrink-0">
                            <div>
                                <h2 className="text-lg font-semibold tracking-tight">Exportar Seguimiento</h2>
                                <p className="text-xs text-[var(--ig-text-secondary)] mt-0.5">Seleccione los años a incluir.</p>
                            </div>
                            <button onClick={() => setIsExportModalOpen(false)} className="p-2 hover:opacity-70 transition-opacity">
                                <X size={22} />
                            </button>
                        </div>
                        <div className="p-6 space-y-4 overflow-y-auto flex-1 min-h-0">
                            <p className="text-sm text-[var(--ig-text-secondary)]">
                                Solo se exportarán los seguimientos a las actividades que tengan alguna meta por cumplir en los años seleccionados.
                            </p>
                            <div className="space-y-2">
                                {planYears.map(year => (
                                    <label key={year} className="flex items-center gap-2 cursor-pointer hover:bg-[var(--ig-hover)] p-2 rounded-lg transition-colors border border-transparent hover:border-[var(--ig-border)]">
                                        <input
                                            type="checkbox"
                                            checked={selectedExportYears.includes(year)}
                                            onChange={(e) => {
                                                if (e.target.checked) {
                                                    setSelectedExportYears(prev => [...prev, year].sort());
                                                } else {
                                                    setSelectedExportYears(prev => prev.filter(y => y !== year));
                                                }
                                            }}
                                            className="w-4 h-4 text-[var(--ig-accent)] rounded border-[var(--ig-border)] focus:ring-[var(--ig-accent)]"
                                        />
                                        <span className="text-sm font-medium text-[var(--ig-text-main)]">{year}</span>
                                    </label>
                                ))}
                            </div>
                        </div>
                        <div className="flex gap-3 p-4 border-t border-[var(--ig-border)] shrink-0">
                            <button
                                onClick={() => setIsExportModalOpen(false)}
                                className="flex-1 font-semibold text-sm py-2.5 hover:bg-[var(--ig-hover)] rounded-lg transition-colors border border-[var(--ig-border)]"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={executeExportTracking}
                                disabled={selectedExportYears.length === 0}
                                className="ig-button-primary flex-1 py-2.5 flex items-center justify-center gap-2 disabled:opacity-50"
                            >
                                <FileDown size={16} /> Exportar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ActivitiesPage;
