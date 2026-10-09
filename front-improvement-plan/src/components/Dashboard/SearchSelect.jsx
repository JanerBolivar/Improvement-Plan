import { useState, useEffect, useRef } from 'react';
import { Search, ChevronDown, Loader2 } from 'lucide-react';

/**
 * Componente que renderiza un selector desplegable con búsqueda integrada (SearchSelect).
 * 
 * Renderiza un dropdown premium con campo de búsqueda, soporte para búsqueda servidor-side,
 * creación dinámica de opciones y control de estado abierto/cerrado. Se cierra al hacer
 * clic fuera del contenedor.
 * 
 * Estado que maneja (@state):
 * - isOpen {boolean} - Indica si el dropdown está abierto.
 * - searchTerm {string} - Término de búsqueda introducido.
 * 
 * Efectos secundarios (@effects):
 * - useEffect: añade listener 'mousedown' para cerrar al hacer clic fuera; retorna cleanup.
 * 
 * @param {Object} props - Propiedades del componente.
 * @param {Array} [props.options=[]] - Lista de opciones a mostrar.
 * @param {string|Object} [props.options[].name] - Nombre de la opción.
 * @param {string} [props.options[].code] - Código opcional (se muestra como "code. name").
 * @param {string} [props.value=''] - Valor seleccionado actualmente (texto mostrado).
 * @param {Function} props.onChange - Callback al seleccionar una opción (recibe valor string).
 * @param {string} [props.placeholder='Seleccionar...'] - Placeholder del campo.
 * @param {string} [props.label] - Etiqueta del campo (opcional).
 * @param {boolean} [props.required=false] - Indica si es requerido (no modifica UI lógica).
 * @param {boolean} [props.loading=false] - Muestra estado de carga en lista.
 * @param {boolean} [props.disabled=false] - Desactiva el componente.
 * @param {Function} [props.onSearch] - Callback para búsqueda en servidor (recibe término).
 * @param {Function} [props.onCreateOption] - Callback para crear nueva opción (recibe término).
 * @returns {JSX.Element} Elemento JSX que representa el selector.
 * @example
 * <SearchSelect
 *   label="Sede"
 *   options={catalogs.campuses}
 *   value={sub.campus}
 *   onChange={(val) => onUpdateField(idx, 'campus', val)}
 * />
 */
const SearchSelect = ({ 
    options = [], 
    value = '', 
    onChange, 
    placeholder = 'Seleccionar...', 
    label, 
    loading = false,
    disabled = false,
    onSearch, // Opcional: para búsqueda en servidor
    onCreateOption // Opcional: para creación dinámica
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const containerRef = useRef(null);

    // Cerrar al hacer click fuera
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (containerRef.current && !containerRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const filteredOptions = options.filter(opt => {
        const text = opt.code ? `${opt.code}. ${opt.name}` : (opt.name || opt);
        return text.toLowerCase().includes(searchTerm.toLowerCase());
    });

    const handleSelect = (option) => {
        const val = option.code ? `${option.code}. ${option.name}` : (option.name || option);
        onChange(val);
        setIsOpen(false);
        setSearchTerm('');
    };

    return (
        <div className={`space-y-1 relative ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`} ref={containerRef}>
            {label && <label className="text-[11px] font-semibold text-[var(--ig-text-secondary)] uppercase tracking-wider ml-1">{label}</label>}
            
            <div 
                onClick={() => !disabled && setIsOpen(!isOpen)}
                onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        if (!disabled) setIsOpen(!isOpen);
                    }
                }}
                role="button"
                tabIndex={disabled ? -1 : 0}
                className={`ig-input w-full flex justify-between items-center transition-all cursor-pointer ${
                    isOpen ? 'border-ig-text-secondary' : ''
                }`}
            >
                <span className={`text-[13px] font-medium truncate ${value ? 'text-ig-text-main' : 'text-ig-text-secondary'}`}>
                    {value || placeholder}
                </span>
                <ChevronDown size={14} className={`text-ig-text-secondary transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </div>

            {isOpen && (
                <div className="absolute z-[110] w-full mt-1 bg-ig-bg border border-ig-border rounded-lg shadow-xl overflow-hidden animate-in fade-in slide-in-from-top-1 duration-200">
                    <div className="p-2 border-b border-ig-border">
                        <div className="relative">
                            <Search className="absolute left-2 top-1/2 -translate-y-1/2 text-ig-text-secondary" size={14} />
                            <input 
                                autoFocus
                                type="text"
                                value={searchTerm}
                                onChange={(e) => {
                                    setSearchTerm(e.target.value);
                                    if(onSearch) onSearch(e.target.value);
                                }}
                                className="w-full pl-8 pr-3 py-1.5 bg-ig-hover border border-ig-border rounded-md text-xs font-medium outline-none focus:border-ig-text-secondary"
                                placeholder="Filtrar..."
                                onClick={(e) => e.stopPropagation()}
                            />
                        </div>
                    </div>
                    
                    <div className="max-h-52 overflow-y-auto">
                        {loading ? (
                            <div className="p-4 flex justify-center"><Loader2 className="animate-spin text-[var(--ig-accent)]" size={18} /></div>
                        ) : (
                            <>
                                {searchTerm.trim() && onCreateOption && !filteredOptions.some(opt => (opt.name || opt).toLowerCase() === searchTerm.trim().toLowerCase()) && (
                                     <div 
                                         onClick={async (e) => {
                                             e.stopPropagation();
                                             const created = await onCreateOption(searchTerm.trim());
                                             if (created) {
                                                 handleSelect(created);
                                             }
                                         }}
                                         onKeyDown={async (e) => {
                                             if (e.key === 'Enter' || e.key === ' ') {
                                                 e.preventDefault();
                                                 e.stopPropagation();
                                                 const created = await onCreateOption(searchTerm.trim());
                                                 if (created) {
                                                     handleSelect(created);
                                                 }
                                             }
                                         }}
                                         role="button"
                                         tabIndex={0}
                                         className="px-4 py-2.5 bg-[var(--ig-accent)]/10 hover:bg-[var(--ig-accent)]/20 text-[13px] font-bold text-[var(--ig-accent)] cursor-pointer transition-colors border-b border-[var(--ig-border)]"
                                     >
                                        + Crear "{searchTerm.trim()}"
                                    </div>
                                )}
                                {filteredOptions.length > 0 ? (
                                    filteredOptions.map((opt, i) => (
                                         <div 
                                             key={i}
                                             onClick={() => handleSelect(opt)}
                                             onKeyDown={(e) => {
                                                 if (e.key === 'Enter' || e.key === ' ') {
                                                     e.preventDefault();
                                                     handleSelect(opt);
                                                 }
                                             }}
                                             role="button"
                                             tabIndex={0}
                                             className="px-4 py-2.5 hover:bg-[var(--ig-hover)] text-[13px] font-medium text-[var(--ig-text-main)] cursor-pointer transition-colors border-b border-[var(--ig-border)] last:border-0"
                                         >
                                            {opt.code ? `${opt.code}. ${opt.name}` : (opt.name || opt)}
                                        </div>
                                    ))
                                ) : (
                                    <div className="p-4 text-center text-[var(--ig-text-secondary)] text-xs">No hay resultados</div>
                                )}
                            </>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default SearchSelect;
