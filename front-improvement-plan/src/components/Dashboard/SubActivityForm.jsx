import { useMemo } from 'react';
import { Calendar, Trash2 } from 'lucide-react';
import SearchSelect from './SearchSelect';

/**
 * Componente que renderiza el formulario de una subactividad dentro del modal de actividad.
 * 
 * Renderiza un bloque editable (o solo lectura según disabled) con secciones: Datos maestros
 * (Sede, Fuente de identificación, Línea Estratégica PDI, Programa Estratégico PDI, Factor/Condición de Calidad),
 * Actividad y Detalles Técnicos (actividad concreta, unidad responsable, indicador con sugerencias,
 * línea base, evidencia/producto), Recursos y Cronograma (recursos requeridos, fechas inicio/límite,
 * y distribución dinámica de metas anuales por horizontes cortomediano-largo plazo).
 * 
 * Estado que maneja: ninguno (controlado por props).
 * 
 * Efectos secundarios: ninguno documentado (usa useMemo para filtrado jerárquico).
 * 
 * @param {Object} props - Propiedades del componente.
 * @param {Object} props.sub - Objeto que representa la subactividad.
 * @param {number} props.idx - Índice de la subactividad.
 * @param {Object} props.catalogs - Catálogos disponibles.
 * @param {Function} props.onUpdateField - Callback para actualizar campo.
 * @param {Function} props.onUpdateGoal - Callback para actualizar meta anual.
 * @param {Function} props.onToggleResource - Callback para togglear recurso.
 * @param {Function} props.onRemove - Callback para eliminar subactividad.
 * @param {Object|null} props.suggestions - Sugerencias para indicador.
 * @param {Function} props.getSuggestions - Callback para obtener sugerencias.
 * @param {boolean} [props.disabled=false] - Modo solo lectura.
 * @param {Object|null} [props.plan=null] - Plan asociado para distribución de horizontes.
 * @param {Function} props.onCreateSource - Callback para crear fuente.
 * @param {Function} props.onCreatePDILine - Callback para crear línea PDI.
 * @param {Function} props.onCreatePDIProgram - Callback para crear programa PDI.
 * @param {Function} props.onCreateFactorQuality - Callback para crear factor/calidad.
 * @param {Function} props.onSelectIndicatorTemplate - Callback al seleccionar plantilla de indicador.
 * @returns {JSX.Element} Elemento JSX del formulario de subactividad.
 */
const SubActivityForm = ({ 
    sub, 
    idx, 
    catalogs, 
    onUpdateField, 
    onUpdateGoal, 
    onToggleResource, 
    onRemove,
    suggestions,
    getSuggestions,
    disabled = false,
    plan = null,
    onCreateSource,
    onCreatePDILine,
    onCreatePDIProgram,
    onCreateFactorQuality,
    onSelectIndicatorTemplate
}) => {
    
    // Filtrado jerárquico de catálogos PDI
    const filteredPrograms = useMemo(() => {
        if (!sub.pdiLine) return [];
        const selectedLine = catalogs.pdiLines.find(l => 
            sub.pdiLine === `${l.code}. ${l.name}` || sub.pdiLine === l.name
        );
        if (!selectedLine) return [];
        return catalogs.pdiPrograms.filter(p => 
            (p.line?._id || p.line) === selectedLine._id
        );
    }, [sub.pdiLine, catalogs.pdiLines, catalogs.pdiPrograms]);

    return (
        <div className={`relative p-5 md:p-8 ig-card !overflow-visible rounded-xl animate-in slide-in-from-bottom-4 ${disabled ? 'bg-ig-hover/30' : ''}`}>
            <div className="absolute -top-3 -left-3 w-8 h-8 bg-ig-text-main text-ig-bg rounded-full flex items-center justify-center font-bold shadow-md border-2 border-ig-bg text-sm">
                {idx + 1}
            </div>
            
            {!disabled && (
                <button 
                    type="button" 
                    onClick={() => onRemove(idx)} 
                    className="absolute -top-3 -right-3 w-8 h-8 bg-ig-bg text-red-500 rounded-full flex items-center justify-center hover:bg-red-500 hover:text-white transition-all shadow-md border border-ig-border z-10"
                >
                    <Trash2 size={16}/>
                </button>
            )}

            <div className="space-y-8">
                {/* Datos Maestros */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    <SearchSelect 
                        label="Sede" 
                        disabled={disabled}
                        options={catalogs.campuses} 
                        value={sub.campus} 
                        onChange={(val) => onUpdateField(idx, 'campus', val)} 
                    />
                    <SearchSelect 
                        label="Fuente de Identificación" 
                        disabled={disabled}
                        options={catalogs.sources} 
                        value={sub.identificationSource} 
                        onChange={(val) => onUpdateField(idx, 'identificationSource', val)} 
                        onCreateOption={onCreateSource}
                    />
                    <SearchSelect 
                        label="Línea Estratégica PDI" 
                        disabled={disabled}
                        options={catalogs.pdiLines} 
                        value={sub.pdiLine} 
                        onChange={(val) => {
                            onUpdateField(idx, 'pdiLine', val);
                            onUpdateField(idx, 'pdiProgram', ''); 
                        }} 
                        onCreateOption={onCreatePDILine}
                    />
                    <SearchSelect 
                        label="Programa Estratégico PDI" 
                        disabled={disabled}
                        options={filteredPrograms} 
                        value={sub.pdiProgram} 
                        placeholder={sub.pdiLine ? "Seleccionar..." : "Seleccione línea"}
                        onChange={(val) => onUpdateField(idx, 'pdiProgram', val)} 
                        onCreateOption={(term) => onCreatePDIProgram(term, sub.pdiLine)}
                    />
                    <div className="sm:col-span-2">
                        <SearchSelect 
                            label="Factor / Condición de Calidad" 
                            disabled={disabled}
                            options={[...catalogs.factorsInst, ...catalogs.factorsProg, ...catalogs.qualityInst, ...catalogs.qualityProg]} 
                            value={sub.qualityFactor} 
                            onChange={(val) => onUpdateField(idx, 'qualityFactor', val)} 
                            onCreateOption={onCreateFactorQuality}
                        />
                    </div>
                </div>

                {/* Actividad y Detalles Técnicos */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-6 border-t border-[var(--ig-border)]">
                    <div className="space-y-4">
                        <div className="space-y-1">
                            <label className="text-[11px] font-semibold text-[var(--ig-text-secondary)] uppercase tracking-wider ml-1">Actividad concreta</label>
                            <textarea 
                                required 
                                disabled={disabled}
                                value={sub.description} 
                                onChange={e => onUpdateField(idx, 'description', e.target.value)} 
                                className="ig-input w-full h-24 resize-none"
                                placeholder="Describa la actividad..."
                            ></textarea>
                        </div>
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-[11px] font-semibold text-[var(--ig-text-secondary)] uppercase tracking-wider ml-1">Unidad Resp.</label>
                            <input 
                                required 
                                disabled={disabled}
                                value={sub.responsibleUnit} 
                                onChange={e => onUpdateField(idx, 'responsibleUnit', e.target.value)} 
                                className="ig-input w-full" 
                            />
                        </div>
                        <div className="space-y-1 relative">
                            <label className="text-[11px] font-semibold text-[var(--ig-text-secondary)] uppercase tracking-wider ml-1">Indicador</label>
                            <input 
                                required 
                                disabled={disabled}
                                value={sub.indicatorName} 
                                onChange={e => {
                                    onUpdateField(idx, 'indicatorName', e.target.value);
                                    getSuggestions('indicatorName', e.target.value, idx);
                                }} 
                                onBlur={() => setTimeout(() => getSuggestions('', '', null), 200)}
                                className="ig-input w-full" 
                            />
                            {suggestions && suggestions.field === 'indicatorName' && suggestions.index === idx && suggestions.data.length > 0 && (
                                <div className="absolute z-[120] w-full mt-1 bg-[var(--ig-bg)] border border-[var(--ig-border)] rounded-lg shadow-xl max-h-52 overflow-y-auto">
                                    {suggestions.data.map((item, i) => (
                                        <div 
                                            key={i}
                                            onClick={() => onSelectIndicatorTemplate(idx, item.template)}
                                            className="px-4 py-2.5 hover:bg-[var(--ig-hover)] text-[12px] font-medium text-[var(--ig-text-main)] cursor-pointer transition-colors border-b border-[var(--ig-border)] last:border-0"
                                        >
                                            {item.indicatorName}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                        {/* Línea Base: valor de referencia previo al inicio del plan */}
                        <div className="space-y-1">
                            <label className="text-[11px] font-semibold text-[var(--ig-text-secondary)] uppercase tracking-wider ml-1">
                                Línea Base
                                <span className="ml-1 text-[9px] font-normal normal-case text-[var(--ig-text-secondary)]">(valor inicial)</span>
                            </label>
                            <input 
                                type="number"
                                step="any"
                                min="0"
                                disabled={disabled}
                                value={sub.baseline ?? ''} 
                                onChange={e => onUpdateField(idx, 'baseline', e.target.value === '' ? null : Number(e.target.value))} 
                                className="ig-input w-full" 
                                placeholder="0"
                            />
                        </div>
                        <div className="sm:col-span-2 space-y-1">
                            <label className="text-[11px] font-semibold text-[var(--ig-text-secondary)] uppercase tracking-wider ml-1">Evidencia / Producto</label>
                            <input 
                                required 
                                disabled={disabled}
                                value={sub.productEvidence} 
                                onChange={e => onUpdateField(idx, 'productEvidence', e.target.value)} 
                                className="ig-input w-full" 
                            />
                        </div>
                    </div>
                </div>

                {/* Recursos y Cronograma */}
                <div className="space-y-6 pt-6 border-t border-[var(--ig-border)]">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        <div className="space-y-3">
                            <label className="text-[11px] font-semibold text-[var(--ig-text-secondary)] uppercase tracking-wider ml-1">Recursos Requeridos</label>
                            <div className="flex flex-wrap gap-1.5">
                                {["Humano", "Financiero", "Físico", "Tecnológico"].map(r => (
                                    <button 
                                        key={r} 
                                        type="button" 
                                        onClick={() => !disabled && onToggleResource(idx, r)} 
                                        className={`px-3 py-1 rounded-md text-[10px] font-bold uppercase transition-all border ${sub.resources.includes(r) ? 'bg-[var(--ig-text-main)] text-[var(--ig-bg)] border-[var(--ig-text-main)]' : 'bg-transparent text-[var(--ig-text-secondary)] border-[var(--ig-border)] hover:border-gray-400'}`}
                                    >
                                        {r}
                                    </button>
                                ))}
                            </div>
                            <input 
                                required 
                                disabled={disabled}
                                value={sub.resourceDescription} 
                                onChange={e => onUpdateField(idx, 'resourceDescription', e.target.value)} 
                                className="ig-input w-full text-xs" 
                                placeholder="Detalles de recursos..."
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <label className="text-[11px] font-semibold text-[var(--ig-text-secondary)] uppercase tracking-wider ml-1">Fecha Inicio</label>
                                <input type="date" disabled={disabled} required value={sub.startDate} onChange={e => onUpdateField(idx, 'startDate', e.target.value)} className="ig-input w-full" />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[11px] font-semibold text-[var(--ig-text-secondary)] uppercase tracking-wider ml-1">Fecha Límite</label>
                                <input type="date" disabled={disabled} required value={sub.endDate} onChange={e => onUpdateField(idx, 'endDate', e.target.value)} className="ig-input w-full" />
                            </div>
                        </div>
                    </div>

                    {/*
                      * Distribución dinámica de horizontes basada en horizons de plan
                      */}
                    {(() => {
                        const n = sub.annualGoals.length;
                        let cortoGoals = [];
                        let medioGoals = [];
                        let largoGoals = [];

                        if (plan && plan.horizons && plan.horizons.shortTerm && plan.horizons.midTerm && plan.horizons.longTerm) {
                            const { shortTerm, midTerm, longTerm } = plan.horizons;
                            
                            sub.annualGoals.forEach((g, i) => {
                                const year = Number(g.label) || (plan.startYear + i);
                                const goalWithIdx = { ...g, globalIdx: i };

                                if (year >= shortTerm.start && year <= shortTerm.end) {
                                    cortoGoals.push(goalWithIdx);
                                } else if (year >= midTerm.start && year <= midTerm.end) {
                                    medioGoals.push(goalWithIdx);
                                } else if (year >= longTerm.start && year <= longTerm.end) {
                                    largoGoals.push(goalWithIdx);
                                }
                            });
                        } else {
                            // Fallback clásico
                            cortoGoals = sub.annualGoals.slice(0, 2).map((g, i) => ({ ...g, globalIdx: i }));
                            medioGoals = sub.annualGoals.slice(2, n - 2).map((g, i) => ({ ...g, globalIdx: 2 + i }));
                            largoGoals = sub.annualGoals.slice(n - 2, n).map((g, i) => ({ ...g, globalIdx: n - 2 + i }));
                        }

                        return (
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4">
                                <HorizonCard 
                                    title="Corto Plazo" 
                                    disabled={disabled}
                                    goals={cortoGoals} 
                                    subIdx={idx} 
                                    onUpdateGoal={onUpdateGoal} 
                                />
                                <HorizonCard 
                                    title="Mediano Plazo" 
                                    disabled={disabled}
                                    goals={medioGoals} 
                                    subIdx={idx} 
                                    onUpdateGoal={onUpdateGoal} 
                                />
                                <HorizonCard 
                                    title="Largo Plazo" 
                                    disabled={disabled}
                                    goals={largoGoals} 
                                    subIdx={idx} 
                                    onUpdateGoal={onUpdateGoal} 
                                />
                            </div>
                        );
                    })()}
                </div>
            </div>
        </div>
    );
};

const HorizonCard = ({ title, goals, subIdx, onUpdateGoal, disabled }) => {
    // Grid adaptativo: <= 2 columnas para corto/largo plazo, 3+ para mediano plazo
    const gridCols = goals.length <= 2
        ? 'grid-cols-2'
        : goals.length === 3
            ? 'grid-cols-3'
            : 'grid-cols-2 md:grid-cols-3 xl:grid-cols-4';

    return (
        <div className="p-4 rounded-xl border border-[var(--ig-border)] bg-[var(--ig-hover)]/30 space-y-3">
            <span className="text-[10px] font-bold uppercase tracking-wider flex items-center gap-2 text-[var(--ig-text-secondary)]">
                <Calendar size={12}/> {title}
                <span className="ml-auto text-[9px] font-normal">{goals.length} año{goals.length !== 1 ? 's' : ''}</span>
            </span>
            <div className={`grid ${gridCols} gap-2`}>
                {goals.map((g, i) => (
                    <div key={i} className="space-y-1">
                        <label className="text-[9px] font-semibold text-[var(--ig-text-secondary)] ml-1">{g.label}</label>
                        <input 
                            type="number" 
                            min="0"
                            disabled={disabled}
                            value={g.value ?? ''} 
                            onChange={e => onUpdateGoal(subIdx, g.globalIdx, e.target.value)} 
                            className="w-full px-2 py-1.5 bg-[var(--ig-bg)] border border-[var(--ig-border)] rounded-md text-xs font-bold outline-none focus:border-gray-400 disabled:opacity-50"
                        />
                    </div>
                ))}
            </div>
        </div>
    );
};

export default SubActivityForm;
