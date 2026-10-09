import React, { useState } from 'react';
import api from '../../api/axios';
import { Database, AlertTriangle, CheckCircle2, Loader2, FileJson, RefreshCcw, Upload } from 'lucide-react';

/**
 * Componente que renderiza la página de configuración del sistema (System Setup).
 * 
 * Renderiza la vista de configuración del sistema (no enrutada actualmente).
 * Gestiona estado local para configuración y acciones administrativas.
 * 
 * Estado que maneja (@state):
 * - config {Object|null} - Configuración del sistema.
 * - loading {boolean} - Estado de carga.
 * 
 * Efectos secundarios (@effects):
 * - useEffect (mount): carga configuración inicial. Dependencias: [].
 * 
 * Endpoints que consume: según implementación interna.
 * 
 * @returns {JSX.Element} Elemento JSX que representa la página de configuración.
 */
const SystemSetup = () => {
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState(null);
    const [message, setMessage] = useState('');
    const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
    const [selectedFile, setSelectedFile] = useState(null);
    const [jsonData, setJsonData] = useState(null);

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                try {
                    const json = JSON.parse(event.target.result);
                    setJsonData(json);
                    setSelectedFile(file);
                    setStatus(null);
                } catch (err) {
                    alert('El archivo no es un JSON válido');
                }
            };
            reader.readAsText(file);
        }
    };

    const handleSetup = async () => {
        if (!jsonData) return;
        try {
            setLoading(true);
            setIsConfirmModalOpen(false);
            const response = await api.post('/admin/setup-system', jsonData);
            setStatus('success');
            setMessage(response.data.message);
            setSelectedFile(null);
            setJsonData(null);
        } catch (error) {
            setStatus('error');
            setMessage(error.response?.data?.message || 'Error al procesar la carga masiva');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-3xl mx-auto space-y-8 animate-in fade-in duration-500">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-semibold tracking-tight">Carga Masiva</h1>
                <p className="text-sm text-[var(--ig-text-secondary)]">Restablecer parámetros maestros del sistema</p>
            </div>

            <div className="ig-card p-6 md:p-10 rounded-xl space-y-8">
                <div className="space-y-4">
                    <p className="text-[13px] text-[var(--ig-text-secondary)] leading-relaxed">
                        Selecciona un archivo JSON estructurado para inicializar los catálogos. 
                        <span className="text-red-500 font-semibold block mt-1">
                            Advertencia: Esta acción reemplazará permanentemente todos los datos actuales.
                        </span>
                    </p>

                    {/* File Upload */}
                    <label className="flex flex-col items-center justify-center w-full h-40 border border-dashed border-[var(--ig-border)] rounded-lg bg-[var(--ig-hover)]/30 hover:bg-[var(--ig-hover)] transition-all cursor-pointer group">
                        <div className="flex flex-col items-center justify-center p-6 text-center">
                            <div className={`p-3 rounded-full mb-3 ${selectedFile ? 'bg-[var(--ig-accent)]/10 text-[var(--ig-accent)]' : 'bg-gray-100 text-gray-400'}`}>
                                <Upload size={20} />
                            </div>
                            <p className="text-xs font-semibold text-[var(--ig-text-main)] mb-1">
                                {selectedFile ? selectedFile.name : 'Seleccionar archivo JSON'}
                            </p>
                            <p className="text-[10px] text-[var(--ig-text-secondary)] uppercase font-bold tracking-widest">Máximo 5MB</p>
                        </div>
                        <input type="file" className="hidden" accept=".json" onChange={handleFileChange} />
                    </label>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="p-4 bg-[var(--ig-hover)]/50 rounded-lg border border-[var(--ig-border)]">
                        <h3 className="text-[11px] font-bold text-[var(--ig-text-main)] uppercase tracking-wider mb-1 flex items-center gap-2">
                            <FileJson size={14} className="text-[var(--ig-accent)]" /> Jerarquía PDI
                        </h3>
                        <p className="text-[11px] text-[var(--ig-text-secondary)]">Líneas, Programas y Objetivos vinculados.</p>
                    </div>
                    <div className="p-4 bg-[var(--ig-hover)]/50 rounded-lg border border-[var(--ig-border)]">
                        <h3 className="text-[11px] font-bold text-[var(--ig-text-main)] uppercase tracking-wider mb-1 flex items-center gap-2">
                            <Database size={14} className="text-[var(--ig-accent)]" /> Catálogos
                        </h3>
                        <p className="text-[11px] text-[var(--ig-text-secondary)]">Sedes, Factores e Indicadores base.</p>
                    </div>
                </div>

                {!status ? (
                    <button 
                        onClick={() => setIsConfirmModalOpen(true)}
                        disabled={loading || !jsonData}
                        className="ig-button-primary w-full py-3 flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                        {loading ? <Loader2 className="animate-spin" size={18} /> : <RefreshCcw size={18} />}
                        {loading ? 'Procesando...' : 'Iniciar Restauración'}
                    </button>
                ) : (
                    <div className={`p-6 rounded-lg text-center animate-in zoom-in duration-300 border ${
                        status === 'success' ? 'bg-emerald-50 border-emerald-100 text-emerald-800' : 'bg-rose-50 border-rose-100 text-rose-800'
                    }`}>
                        <div className="flex justify-center mb-3">
                            {status === 'success' ? <CheckCircle2 size={32} /> : <AlertTriangle size={32} />}
                        </div>
                        <h2 className="text-sm font-bold mb-1">{status === 'success' ? 'Carga completada' : 'Error en la carga'}</h2>
                        <p className="text-xs opacity-80 mb-4">{message}</p>
                        <button 
                            onClick={() => setStatus(null)}
                            className="text-xs font-bold underline"
                        >
                            Intentar de nuevo
                        </button>
                    </div>
                )}
            </div>

            {/* Modal de Confirmación */}
            {isConfirmModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-[var(--ig-bg)] border border-[var(--ig-border)] rounded-2xl p-8 max-w-sm w-full shadow-2xl text-center">
                        <div className="w-12 h-12 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center mx-auto mb-4">
                            <AlertTriangle size={24} />
                        </div>
                        <h2 className="text-lg font-semibold mb-2">¿Confirmar restauración?</h2>
                        <p className="text-sm text-[var(--ig-text-secondary)] mb-6">
                            Esta acción borrará todos los datos actuales y no se puede revertir.
                        </p>
                        <div className="flex flex-col gap-2">
                            <button 
                                onClick={handleSetup}
                                className="w-full bg-rose-600 text-white font-semibold py-2 rounded-lg hover:bg-rose-700 transition-colors"
                            >
                                Sí, restablecer todo
                            </button>
                            <button 
                                onClick={() => setIsConfirmModalOpen(false)}
                                className="w-full font-semibold py-2 text-[var(--ig-text-secondary)] hover:bg-[var(--ig-hover)] rounded-lg transition-colors"
                            >
                                Cancelar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SystemSetup;
