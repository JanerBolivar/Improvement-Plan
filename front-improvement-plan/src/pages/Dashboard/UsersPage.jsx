import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import { Shield, UserPlus, Search, Edit, X } from 'lucide-react';
import { useState, useEffect } from 'react';

/**
 * Componente que renderiza la página de gestión de usuarios (Users).
 * 
 * Renderiza la vista para administrar usuarios (roles, asignaciones, etc.).
 * Gestiona estado local para lista de usuarios, filtros y carga.
 * 
 * Estado que maneja (@state):
 * - users {Array} - Lista de usuarios.
 * - loading {boolean} - Estado de carga.
 * - filters {Object} - Filtros aplicados.
 * 
 * Efectos secundarios (@effects):
 * - useEffect (mount): carga inicial de usuarios. Dependencias: [].
 * 
 * Endpoints que consume:
 * - GET `/users`
 * 
 * @returns {JSX.Element} Elemento JSX que representa la página de usuarios.
 */
const UsersPage = () => {
    const { user: currentUser } = useAuth();
    const [users, setUsers] = useState([]);
    const [programs, setPrograms] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [editingUser, setEditingUser] = useState(null);

    const fetchData = async () => {
        try {
            setLoading(true);
            const [usersRes, programsRes] = await Promise.all([
                api.get('/users'),
                api.get('/programs')
            ]);
            setUsers(usersRes.data.data);
            setPrograms(programsRes.data.data);
        } catch (error) {
            console.error('Error fetching data:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleUpdateUser = async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const data = Object.fromEntries(formData);

        try {
            await api.put(`/users/${editingUser._id}`, data);
            setEditingUser(null);
            fetchData();
        } catch (error) {
            alert('Error al actualizar usuario');
        }
    };

    const filteredUsers = users.filter(u =>
        u.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.email.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const canManage = (userToEdit) => {
        if (currentUser?.role === 'admin') return true;
        if (currentUser?.role === 'coordinator' && userToEdit.program?._id === currentUser.program?._id) return true;
        return false;
    };

    return (
        <div className="p-4 lg:p-8 max-w-6xl mx-auto">
            <div className="mb-8">
                <h1 className="text-2xl font-semibold tracking-tight">Gestión de Usuarios</h1>
                <p className="text-sm text-[var(--ig-text-secondary)]">Administración de accesos y programas</p>
            </div>

            {/* Buscador Minimalista */}
            <div className="relative mb-8">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--ig-text-secondary)]" size={16} />
                <input
                    type="text"
                    placeholder="Buscar usuarios..."
                    className="ig-input w-full pl-10 h-10 rounded-lg bg-[var(--ig-hover)]"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>

            {/* Grid de Usuarios Estilo Instagram */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {loading ? (
                    <div className="col-span-full text-center py-12 text-[var(--ig-text-secondary)]">Cargando usuarios...</div>
                ) : filteredUsers.length === 0 ? (
                    <div className="col-span-full text-center py-12 text-[var(--ig-text-secondary)]">No se encontraron usuarios</div>
                ) : filteredUsers.map(u => (
                    <div key={u._id} className="ig-card p-5 rounded-lg flex flex-col items-center text-center">
                        <div className="w-16 h-16 bg-[var(--ig-hover)] border border-[var(--ig-border)] rounded-full flex items-center justify-center text-[var(--ig-text-main)] font-semibold text-2xl mb-4">
                            {u.fullName[0]}
                        </div>
                        
                        <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--ig-text-secondary)] mb-1">
                            {u.role}
                        </span>
                        
                        <h3 className="font-semibold text-sm mb-1 truncate w-full">{u.fullName}</h3>
                        <p className="text-[var(--ig-text-secondary)] text-[12px] mb-4 truncate w-full">{u.email}</p>

                        <div className="mt-auto w-full">
                            <div className="text-[11px] text-[var(--ig-text-secondary)] mb-4 h-8 flex items-center justify-center italic">
                                {u.program?.name || 'Sin programa'}
                            </div>

                            {canManage(u) && (
                                <button
                                    onClick={() => setEditingUser(u)}
                                    className="ig-button-secondary w-full py-1.5 text-xs"
                                >
                                    Editar Perfil
                                </button>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {/* Modal Minimalista */}
            {editingUser && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-[var(--ig-bg)] border border-[var(--ig-border)] rounded-xl w-full max-w-md shadow-2xl overflow-hidden relative">
                        <div className="flex justify-between items-center p-4 border-b border-[var(--ig-border)]">
                            <h2 className="font-semibold mx-auto">Editar Perfil</h2>
                            <button onClick={() => setEditingUser(null)} className="absolute right-4 text-[var(--ig-text-main)]">
                                <X size={20} />
                            </button>
                        </div>
                        <form onSubmit={handleUpdateUser} className="p-6 space-y-4">
                            <div className="flex flex-col items-center mb-4">
                                <div className="w-16 h-16 bg-[var(--ig-hover)] border border-[var(--ig-border)] rounded-full flex items-center justify-center text-xl font-bold mb-2">
                                    {editingUser.fullName[0]}
                                </div>
                                <p className="font-semibold text-sm">{editingUser.fullName}</p>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-[var(--ig-text-secondary)] mb-1 uppercase">Rol del Sistema</label>
                                <select name="role" defaultValue={editingUser.role} className="ig-input w-full appearance-none">
                                    <option value="admin">Administrador</option>
                                    <option value="coordinator">Coordinador</option>
                                    <option value="teacher">Docente</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-[var(--ig-text-secondary)] mb-1 uppercase">Programa Asignado</label>
                                <select name="program" defaultValue={editingUser.program?._id || ''} className="ig-input w-full appearance-none">
                                    <option value="">Ninguno</option>
                                    {programs.map(p => (
                                        <option key={p._id} value={p._id}>{p.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-[var(--ig-text-secondary)] mb-1 uppercase">Estado de la cuenta</label>
                                <select name="status" defaultValue={editingUser.status} className="ig-input w-full appearance-none">
                                    <option value="active">Activa</option>
                                    <option value="inactive">Inactiva</option>
                                </select>
                            </div>
                            <div className="flex flex-col gap-2 pt-4">
                                <button type="submit" className="ig-button-primary w-full">Guardar Cambios</button>
                                <button type="button" onClick={() => setEditingUser(null)} className="text-sm font-semibold py-2">Cancelar</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default UsersPage;
