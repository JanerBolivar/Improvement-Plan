import CatalogPage from './CatalogPage';
import SystemSetup from './SystemSetup';
import api from '../../api/axios';
import { Building2, LayoutGrid, Flag, ShieldCheck, Target, ListTree, RefreshCcw } from 'lucide-react';
import { useState, useEffect } from 'react';

/**
 * Componente que renderiza la página de administración (Admin).
 * 
 * Renderiza la vista administrativa con pestañas (campuses, líneas, programas, catálogos, sistema).
 * Gestiona estado local para tab activa, líneas, programas y carga inicial desde API (/pdi/lines, /programs).
 * 
 * Estado que maneja (@state):
 * - activeTab {string} - Pestaña activa (valor por defecto 'campuses').
 * - lines {Array} - Lista de líneas PDI.
 * - programs {Array} - Lista de programas académicos.
 * 
 * Efectos secundarios (@effects):
 * - useEffect (mount): carga líneas PDI y programas vía API (peticiones paralelas). Dependencias: [].
 * 
 * Endpoints que consume:
 * - GET `/pdi/lines`
 * - GET `/programs`
 * 
 * @returns {JSX.Element} Elemento JSX que representa la página de administración.
 */
const AdminPage = () => {
    const [activeTab, setActiveTab] = useState('campuses');
    const [lines, setLines] = useState([]);
    const [programs, setPrograms] = useState([]);

    const tabs = [
        {
            id: 'campuses', name: 'Sedes', icon: Building2, endpoint: '/catalogs/campuses', label: 'sede', fields: [
                { name: 'name', label: 'Nombre', required: true },
                { name: 'description', label: 'Descripción' }
            ]
        },
        {
            id: 'id-sources', name: 'Fuentes ID', icon: LayoutGrid, endpoint: '/catalogs/id-sources', label: 'fuente', fields: [
                { name: 'name', label: 'Nombre', required: true },
                { name: 'description', label: 'Descripción' }
            ]
        },
        {
            id: 'factors-inst', name: 'Factores Inst.', icon: ShieldCheck, endpoint: '/catalogs/factors-inst', label: 'factor', fields: [
                { name: 'code', label: 'Código', required: true },
                { name: 'name', label: 'Nombre', required: true }
            ]
        },
        {
            id: 'factors-prog', name: 'Factores Prog.', icon: ShieldCheck, endpoint: '/catalogs/factors-prog', label: 'factor', fields: [
                { name: 'code', label: 'Código', required: true },
                { name: 'name', label: 'Nombre', required: true }
            ]
        },
        {
            id: 'pdi-lines', name: 'Líneas PDI', icon: Flag, endpoint: '/catalogs/pdi-lines', label: 'línea', fields: [
                { name: 'code', label: 'Código', required: true },
                { name: 'name', label: 'Nombre', required: true }
            ]
        },
        {
            id: 'pdi-programs', name: 'Progs. PDI', icon: ListTree, endpoint: '/catalogs/pdi-programs', label: 'programa', fields: [
                { name: 'line', label: 'Línea PDI', type: 'select', required: true, options: lines },
                { name: 'code', label: 'Código', required: true },
                { name: 'name', label: 'Nombre', required: true }
            ]
        },
        {
            id: 'pdi-objectives', name: 'Objs. PDI', icon: Target, endpoint: '/catalogs/pdi-objectives', label: 'objetivo', fields: [
                { name: 'program', label: 'Programa PDI', type: 'select', required: true, options: programs },
                { name: 'code', label: 'Código', required: true },
                { name: 'name', label: 'Nombre', required: true }
            ]
        },
        {
            id: 'quality-inst', name: 'Calidad Inst.', icon: ShieldCheck, endpoint: '/catalogs/quality-inst', label: 'condición', fields: [
                { name: 'code', label: 'Código', required: true },
                { name: 'name', label: 'Nombre', required: true }
            ]
        },
        {
            id: 'quality-prog', name: 'Calidad Prog.', icon: ShieldCheck, endpoint: '/catalogs/quality-prog', label: 'condición', fields: [
                { name: 'code', label: 'Código', required: true },
                { name: 'name', label: 'Nombre', required: true }
            ]
        },
        { id: 'setup', name: 'Carga Masiva', icon: RefreshCcw, isSetup: true },
    ];

    const activeInfo = tabs.find(t => t.id === activeTab);

    useEffect(() => {
        if (activeInfo?.isSetup) return;
        const fetchRefs = async () => {
            try {
                const [linesRes, progsRes] = await Promise.all([
                    api.get('/catalogs/pdi-lines'),
                    api.get('/catalogs/pdi-programs')
                ]);
                setLines(linesRes.data.data);
                setPrograms(progsRes.data.data);
            } catch (e) { console.error(e); }
        };
        fetchRefs();
    }, [activeTab]);

    return (
        <div className="flex flex-col lg:flex-row h-full">
            {/* Sub-Sidebar Minimalista */}
            <div className="w-full lg:w-64 bg-[var(--ig-bg)] border-b lg:border-b-0 lg:border-r border-[var(--ig-border)] overflow-y-auto lg:h-[calc(100vh-64px)] scrollbar-hide">
                <div className="p-6 space-y-6">
                    <div>
                        <h2 className="text-[11px] font-bold text-[var(--ig-text-secondary)] uppercase tracking-[0.1em] mb-4">Parametrización</h2>
                        <div className="space-y-1">
                            {tabs.map((tab) => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all ${activeTab === tab.id
                                        ? 'bg-[var(--ig-hover)] text-[var(--ig-text-main)] font-bold'
                                        : 'text-[var(--ig-text-secondary)] hover:bg-[var(--ig-hover)]/50 hover:text-[var(--ig-text-main)]'
                                        }`}
                                >
                                    <tab.icon size={18} strokeWidth={activeTab === tab.id ? 2.5 : 1.5} />
                                    <span>{tab.name}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Contenido Dinámico */}
            <div className="flex-1 overflow-y-auto bg-[var(--ig-bg)]">
                <div className="max-w-5xl mx-auto p-4 lg:p-8 animate-in fade-in duration-300">
                    {activeInfo.isSetup ? (
                        <SystemSetup />
                    ) : (
                        <CatalogPage
                            key={activeInfo.id}
                            title={activeInfo.name}
                            endpoint={activeInfo.endpoint}
                            label={activeInfo.label}
                            fields={activeInfo.fields}
                        />
                    )}
                </div>
            </div>
        </div>
    );
};

export default AdminPage;
