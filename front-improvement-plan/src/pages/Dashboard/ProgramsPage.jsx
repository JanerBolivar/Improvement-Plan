import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import { Plus, Edit2, Trash2, Search, X, MoreHorizontal } from 'lucide-react';
import { useState, useEffect } from 'react';

/**
 * Componente que renderiza la página de gestión de programas académicos (Programs).
 * 
 * Renderiza la vista para listar/gestionar programas académicos. Gestiona estado local
 * para carga, lista de programas y operaciones relacionadas.
 * 
 * Estado que maneja (@state):
 * - programs {Array} - Lista de programas académicos.
 * - loading {boolean} - Estado de carga.
 * 
 * Efectos secundarios (@effects):
 * - useEffect (mount): carga inicial de programas. Dependencias: [].
 * 
 * Endpoints que consume:
 * - GET `/programs` (según uso interno)
 * 
 * @returns {JSX.Element} Elemento JSX que representa la página de programas.
 */
const ProgramsPage = () => {
    const { user } = useAuth();
    const [programs, setPrograms] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentProgram, setCurrentProgram] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [coordinators, setCoordinators] = useState([]);

    const fetchPrograms = async () => {
        try {
            setLoading(true);
            const [progRes, coordRes] = await Promise.all([
                api.get('/programs'),
                api.get('/users/coordinators')
            ]);
            setPrograms(progRes.data.data);
            setCoordinators(coordRes.data.data);
        } catch (error) {
            console.error('Error fetching data:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPrograms();
    }, []);

    const handleSave = async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const data = Object.fromEntries(formData);

        try {
            if (currentProgram) {
                await api.put(`/programs/${currentProgram._id}`, data);
            } else {
                await api.post('/programs', data);
            }
            setIsModalOpen(false);
            fetchPrograms();
        } catch (error) {
            alert('Error al guardar el programa');
        }
    };

    const handleDelete = async (id) => {
        if (window.confirm('¿Estás seguro de eliminar este programa?')) {
            try {
                await api.delete(`/programs/${id}`);
                fetchPrograms();
            } catch (error) {
                alert('Error al eliminar');
            }
        }
    };

    const filteredPrograms = programs.filter(p =>
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.code.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const isAdmin = user?.role === 'admin';

    return (
        <div className="p-4 lg:p-8 max-w-5xl mx-auto">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                <div>
                    <h1 className="text-2xl font-semibold tracking-tight">Programas Académicos</h1>
                    <p className="text-sm text-[var(--ig-text-secondary)]">Gestión de oferta institucional</p>
                </div>
                {isAdmin && (
                    <button
                        onClick={() => { setCurrentProgram(null); setIsModalOpen(true); }}
                        className="ig-button-primary flex items-center gap-2"
                    >
                        <Plus size={18} />
                        Nuevo Programa
                    </button>
                )}
            </div>

            {/* Buscador Minimalista */}
            <div className="relative mb-8">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--ig-text-secondary)]" size={16} />
                <input
                    type="text"
                    placeholder="Buscar programas..."
                    className="ig-input w-full pl-10 h-10 rounded-lg bg-[var(--ig-hover)]"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>

            {/* Tabla Estilo Instagram */}
            <div className="ig-card rounded-lg">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-[var(--ig-hover)]">
                                <th className="ig-table-header">Código</th>
                                <th className="ig-table-header">Nombre</th>
                                <th className="ig-table-header hidden md:table-cell">Facultad</th>
                                <th className="ig-table-header">Nivel</th>
                                <th className="ig-table-header">Coordinador</th>
                                <th className="ig-table-header text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[var(--ig-border)]">
                            {loading ? (
                                <tr><td colSpan="5" className="ig-table-cell text-center py-10 text-[var(--ig-text-secondary)]">Cargando...</td></tr>
                            ) : filteredPrograms.length === 0 ? (
                                <tr><td colSpan="5" className="ig-table-cell text-center py-10 text-[var(--ig-text-secondary)]">No hay programas</td></tr>
                            ) : filteredPrograms.map(p => (
                                <tr key={p._id} className="hover:bg-[var(--ig-hover)] transition-colors">
                                    <td className="ig-table-cell font-medium">{p.code}</td>
                                    <td className="ig-table-cell font-semibold">{p.name}</td>
                                    <td className="ig-table-cell text-[var(--ig-text-secondary)] hidden md:table-cell">{p.faculty}</td>
                                    <td className="ig-table-cell">
                                        <span className="text-[11px] font-bold uppercase tracking-tighter text-[var(--ig-text-secondary)] border border-[var(--ig-border)] px-2 py-0.5 rounded">
                                            {p.level}
                                        </span>
                                    </td>
                                    <td className="ig-table-cell">
                                        <div className="flex items-center gap-2">
                                            <div className="w-6 h-6 rounded-full bg-ig-hover flex items-center justify-center text-[10px] font-bold">
                                                {p.coordinator?.firstName?.substring(0,1) || '?'}
                                            </div>
                                            <span className="text-xs">{p.coordinator?.fullName || 'No asignado'}</span>
                                        </div>
                                    </td>
                                    <td className="ig-table-cell text-right">
                                        {isAdmin && (
                                            <div className="flex justify-end gap-1">
                                                <button
                                                    onClick={() => { setCurrentProgram(p); setIsModalOpen(true); }}
                                                    className="p-1.5 hover:bg-gray-100 rounded-full transition-colors"
                                                >
                                                    <Edit2 size={16} className="text-[var(--ig-text-main)]" />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(p._id)}
                                                    className="p-1.5 hover:bg-red-50 rounded-full transition-colors"
                                                >
                                                    <Trash2 size={16} className="text-red-500" />
                                                </button>
                                            </div>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal Minimalista */}
            {isModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-[var(--ig-bg)] border border-[var(--ig-border)] rounded-xl w-full max-w-md shadow-2xl overflow-hidden">
                        <div className="flex justify-between items-center p-4 border-b border-[var(--ig-border)]">
                            <h2 className="font-semibold mx-auto">
                                {currentProgram ? 'Editar Programa' : 'Nuevo Programa'}
                            </h2>
                            <button onClick={() => setIsModalOpen(false)} className="absolute right-6 text-[var(--ig-text-main)]">
                                <X size={20} />
                            </button>
                        </div>
                        <form onSubmit={handleSave} className="p-6 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-semibold text-[var(--ig-text-secondary)] mb-1 uppercase">Código</label>
                                    <input name="code" defaultValue={currentProgram?.code} required className="ig-input w-full" />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-[var(--ig-text-secondary)] mb-1 uppercase">Nivel</label>
                                    <select name="level" defaultValue={currentProgram?.level || 'Pregrado'} className="ig-input w-full appearance-none">
                                        <option>Pregrado</option>
                                        <option>Posgrado</option>
                                        <option>Maestría</option>
                                        <option>Doctorado</option>
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-[var(--ig-text-secondary)] mb-1 uppercase">Nombre del Programa</label>
                                <input name="name" defaultValue={currentProgram?.name} required className="ig-input w-full" />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-[var(--ig-text-secondary)] mb-1 uppercase">Facultad</label>
                                <input name="faculty" defaultValue={currentProgram?.faculty} required className="ig-input w-full" />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-[var(--ig-text-secondary)] mb-1 uppercase">Modalidad</label>
                                <select name="modality" defaultValue={currentProgram?.modality || 'Presencial'} className="ig-input w-full appearance-none">
                                    <option>Presencial</option>
                                    <option>Distancia</option>
                                    <option>Virtual</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-[var(--ig-text-secondary)] mb-1 uppercase">Coordinador Responsable</label>
                                <select name="coordinator" defaultValue={currentProgram?.coordinator?._id || ''} className="ig-input w-full appearance-none">
                                    <option value="">Seleccione un coordinador...</option>
                                    {coordinators.map(c => (
                                        <option key={c._id} value={c._id}>{c.fullName || `${c.firstName} ${c.lastName}`}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="flex flex-col gap-2 pt-4">
                                <button type="submit" className="ig-button-primary w-full">Guardar</button>
                                <button type="button" onClick={() => setIsModalOpen(false)} className="text-sm font-semibold py-2">Cancelar</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ProgramsPage;
