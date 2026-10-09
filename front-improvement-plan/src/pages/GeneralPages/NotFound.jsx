import { useNavigate } from 'react-router-dom';
import { ClipboardCheck, ArrowLeft } from 'lucide-react';

/**
 * Componente que renderiza la página de error 404 (No encontrado).
 * 
 * Renderiza una vista minimalista con icono, mensaje y acciones para volver al inicio
 * o regresar a la página anterior mediante useNavigate.
 * 
 * @returns {JSX.Element} Elemento JSX que representa la página 404.
 */
const NotFound = () => {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen bg-ig-bg flex flex-col items-center justify-center p-6 text-ig-text-main font-sans">
            <div className="text-center space-y-10 animate-in fade-in zoom-in duration-700 max-w-sm">
                <div className="flex justify-center">
                    <div className="w-20 h-20 bg-ig-hover rounded-2xl flex items-center justify-center relative border border-ig-border shadow-sm">
                        <ClipboardCheck className="text-ig-text-secondary" size={32} />
                        <div className="absolute -top-2 -right-2 bg-ig-accent text-white text-[10px] font-black px-2 py-0.5 rounded-full border-2 border-ig-bg">404</div>
                    </div>
                </div>

                <div className="space-y-3">
                    <h1 className="text-2xl font-bold tracking-tight">Página no encontrada</h1>
                    <p className="text-sm text-ig-text-secondary leading-relaxed px-4">
                        Lo sentimos, la sección que intentas buscar no existe o ha sido movida.
                    </p>
                </div>

                <div className="pt-4 flex flex-col gap-3">
                    <button
                        onClick={() => navigate('/')}
                        className="ig-button-primary w-full py-3 text-sm font-bold tracking-tight"
                    >
                        Volver al inicio
                    </button>
                    <button
                        onClick={() => navigate(-1)}
                        className="w-full py-3 text-sm font-bold hover:bg-ig-hover rounded-xl transition-all text-ig-text-secondary flex items-center justify-center gap-2"
                    >
                        <ArrowLeft size={16} />
                        Regresar
                    </button>
                </div>
            </div>

            <div className="fixed bottom-12 text-[10px] font-bold uppercase tracking-[0.3em] text-ig-text-secondary opacity-30">
                CIIDES BIC &bull; SISTEMA PM
            </div>
        </div>
    );
};

export default NotFound;
