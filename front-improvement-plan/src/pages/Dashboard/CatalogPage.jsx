import React, { useState, useEffect } from 'react';
import api from '../../api/axios';
import { Plus, Edit2, Trash2, Search, X, Loader2 } from 'lucide-react';

  /**
   * Componente que renderiza el gestor genérico de catálogos y tablas maestras.
   * 
   * Renderiza una tabla con búsqueda, modal de creación/edición y acciones CRUD
   * contra el endpoint proporcionado. Gestiona estado local para datos, carga,
   * modal, ítem actual y búsqueda.
   * 
   * Estado que maneja (@state):
   * - data {Array} - Lista de elementos del catálogo.
   * - loading {boolean} - Estado de carga.
   * - isModalOpen {boolean} - Visibilidad del modal.
   * - currentItem {Object|null} - Ítem en edición/creación.
   * - searchTerm {string} - Término de búsqueda.
   * 
   * Efectos secundarios (@effects):
   * - useEffect (mount): carga datos iniciales. Dependencias: [] (fetchData interno).
   * 
   * Endpoints que consume:
   * - GET/POST/PUT/DELETE según endpoint base proporcionado.
   * 
   * @param {Object} props - Propiedades del componente.
   * @param {string} props.title - Título de la vista.
   * @param {string} props.endpoint - Endpoint base para operaciones CRUD.
   * @param {string} props.label - Etiqueta descriptiva.
   * @param {Array} [props.fields=[]] - Definición de campos del formulario.
   * @returns {JSX.Element} Elemento JSX que representa el gestor de catálogos.
   */
  const CatalogPage = ({ title, endpoint, label, fields = [] }) => {
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentItem, setCurrentItem] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');

    const fetchData = async () => {
        try {
            setLoading(true);
            const response = await api.get(endpoint);
            setData(response.data.data);
        } catch (error) {
            console.error(`Error fetching ${label}:`, error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [endpoint]);

    const handleSave = async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const payload = Object.fromEntries(formData);

        try {
            if (currentItem) {
                await api.put(`${endpoint}/${currentItem._id}`, payload);
            } else {
                await api.post(endpoint, payload);
            }
            setIsModalOpen(false);
            fetchData();
        } catch (error) {
            alert(error.response?.data?.message || 'Error al guardar');
        }
    };

    const handleDelete = async (id) => {
        if (window.confirm(`¿Estás seguro de eliminar este ${label}?`)) {
            try {
                await api.delete(`${endpoint}/${id}`);
                fetchData();
            } catch (error) {
                alert('Error al eliminar');
            }
        }
    };

    const filteredData = data.filter(item => 
        (item.name?.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (item.code?.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-semibold tracking-tight text-[var(--ig-text-main)]">{title}</h1>
                    <p className="text-sm text-[var(--ig-text-secondary)]">Gestión de parámetros globales</p>
                </div>
                <button 
                    onClick={() => { setCurrentItem(null); setIsModalOpen(true); }}
                    className="ig-button-primary flex items-center gap-2"
                >
                    <Plus size={18} />
                    Añadir {label}
                </button>
            </div>

            {/* Buscador */}
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--ig-text-secondary)]" size={16} />
                <input 
                    type="text" 
                    placeholder={`Buscar ${label}...`} 
                    className="ig-input w-full pl-10 h-10 rounded-lg bg-[var(--ig-hover)]"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>

            {/* Listado Estilo Instagram */}
            <div className="ig-card rounded-lg overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-[var(--ig-hover)]">
                                {fields.map(f => (
                                    <th key={f.name} className="ig-table-header">{f.label}</th>
                                ))}
                                <th className="ig-table-header text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[var(--ig-border)]">
                            {loading ? (
                                <tr>
                                    <td colSpan={fields.length + 1} className="py-20">
                                        <div className="flex justify-center"><Loader2 className="animate-spin text-[var(--ig-accent)]" size={32} /></div>
                                    </td>
                                </tr>
                            ) : filteredData.length === 0 ? (
                                <tr>
                                    <td colSpan={fields.length + 1} className="py-20 text-center text-[var(--ig-text-secondary)]">No hay registros.</td>
                                </tr>
                            ) : filteredData.map(item => (
                                <tr key={item._id} className="hover:bg-[var(--ig-hover)] transition-colors">
                                    {fields.map(f => (
                                        <td key={f.name} className="ig-table-cell">
                                            {f.name === 'line' || f.name === 'program' ? item[f.name]?.name : item[f.name]}
                                        </td>
                                    ))}
                                    <td className="ig-table-cell text-right">
                                        <div className="flex justify-end gap-1">
                                            <button 
                                                onClick={() => { setCurrentItem(item); setIsModalOpen(true); }}
                                                className="p-1.5 hover:bg-gray-100 rounded-full transition-colors"
                                            >
                                                <Edit2 size={16} className="text-[var(--ig-text-main)]" />
                                            </button>
                                            <button 
                                                onClick={() => handleDelete(item._id)}
                                                className="p-1.5 hover:bg-red-50 rounded-full transition-colors"
                                            >
                                                <Trash2 size={16} className="text-red-500" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal Minimalista */}
            {isModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="bg-[var(--ig-bg)] border border-[var(--ig-border)] rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col">
                        <div className="flex justify-between items-center p-6 border-b border-[var(--ig-border)]">
                            <h2 className="text-lg font-semibold tracking-tight">
                                {currentItem ? `Editar ${label}` : `Nuevo ${label}`}
                            </h2>
                            <button onClick={() => setIsModalOpen(false)} className="p-1 hover:opacity-50 transition-opacity">
                                <X size={24} />
                            </button>
                        </div>

                        <form onSubmit={handleSave} className="p-6 space-y-5">
                            {fields.map(f => (
                                <div key={f.name} className="space-y-1.5">
                                    <label className="text-[11px] font-semibold text-[var(--ig-text-secondary)] uppercase tracking-wider ml-1">{f.label}</label>
                                    {f.type === 'select' ? (
                                        <select 
                                            name={f.name} 
                                            defaultValue={currentItem?.[f.name]?._id || currentItem?.[f.name]} 
                                            required={f.required}
                                            className="ig-input w-full appearance-none"
                                        >
                                            <option value="">Seleccione...</option>
                                            {f.options?.map(opt => (
                                                <option key={opt._id} value={opt._id}>{opt.name}</option>
                                            ))}
                                        </select>
                                    ) : (
                                        <input 
                                            name={f.name} 
                                            type={f.type || 'text'}
                                            defaultValue={currentItem?.[f.name]} 
                                            required={f.required} 
                                            className="ig-input w-full" 
                                            placeholder={`Ingrese ${f.label.toLowerCase()}...`}
                                        />
                                    )}
                                </div>
                            ))}
                            <div className="flex flex-col sm:flex-row gap-3 pt-4">
                                <button 
                                    type="button" 
                                    onClick={() => setIsModalOpen(false)} 
                                    className="flex-1 font-semibold text-sm py-2 hover:bg-[var(--ig-hover)] rounded-lg transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button 
                                    type="submit" 
                                    className="ig-button-primary flex-1 py-2"
                                >
                                    Guardar
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CatalogPage;
