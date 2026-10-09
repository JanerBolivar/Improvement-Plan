import { useNavigate } from 'react-router-dom';
import { urlApiLogin } from '../../config/envs.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { ClipboardCheck, Target, ArrowRight } from 'lucide-react';

/**
 * Componente que renderiza la página de inicio pública (landing).
 * 
 * Renderiza la vista de bienvenida con cabecera, hero, características y pie de página.
 * Gestiona el acceso: si el usuario ya está autenticado, redirige al dashboard desde
 * el botón de acción; si no, redirige al endpoint de login SSO (urlApiLogin) con parámetro sessionType.
 * 
 * Estado consumido (@context):
 * - useAuth(): { isAuthenticated }
 * 
 * @returns {JSX.Element} Elemento JSX que representa la página de inicio.
 */
const HomePage = () => {
    const { isAuthenticated } = useAuth();
    const navigate = useNavigate();

    const handleLogin = (type = 'microsoft') => {
        if (isAuthenticated) {
            navigate('/dashboard');
        } else {
            window.location.href = `${urlApiLogin}&sessionType=${type}`;
        }
    };

    return (
        <div className="min-h-screen bg-ig-bg text-ig-text-main font-sans">
            {/* Header Minimalista */}
            <nav className="h-16 border-b border-ig-border px-6 flex justify-between items-center sticky top-0 z-50 bg-ig-bg/80 backdrop-blur-md">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-ig-text-main rounded-lg flex items-center justify-center">
                        <ClipboardCheck className="text-ig-bg" size={18} />
                    </div>
                    <span className="text-lg font-bold tracking-tight">CIIDES <span className="font-normal opacity-50">PM</span></span>
                </div>
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => handleLogin('microsoft')}
                        className="text-sm font-semibold text-ig-accent hover:opacity-70 transition-opacity"
                    >
                        Acceder
                    </button>
                </div>
            </nav>

            <main className="max-w-screen-xl mx-auto px-6 py-12 lg:py-20">
                <div className="grid grid-cols-1 lg:grid-cols-5 gap-12 items-center">
                    {/* Hero Text */}
                    <div className="lg:col-span-3 space-y-6 text-center lg:text-left">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-ig-hover border border-ig-border text-[11px] font-bold uppercase tracking-[0.15em] text-ig-text-secondary">
                            <Target size={12} /> Excelencia Académica
                        </div>
                        <h1 className="text-5xl md:text-7xl font-bold tracking-tight leading-[1.05] text-ig-text-main">
                            Gestión de <br />
                            <span className="text-ig-accent">Calidad.</span>
                        </h1>
                        <p className="text-lg text-ig-text-secondary leading-relaxed max-w-lg mx-auto lg:mx-0">
                            Plataforma integral para el seguimiento y ejecución de planes de mejoramiento institucional. Centraliza la gestión académica con precisión.
                        </p>
                        <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start pt-4">
                            {isAuthenticated ? (
                                <button
                                    onClick={() => navigate('/dashboard')}
                                    className="ig-button-primary px-10 py-3 flex items-center justify-center gap-2 group"
                                >
                                    Ir al Dashboard
                                    <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                                </button>
                            ) : (
                                <>
                                    <button
                                        onClick={() => handleLogin('microsoft')}
                                        className="ig-button-primary px-10 py-3 flex items-center justify-center gap-3"
                                    >
                                        <svg width="18" height="18" viewBox="0 0 21 21" xmlns="http://www.w3.org/2000/svg">
                                            <path d="M1 1h9v9H1z" fill="currentColor" />
                                            <path d="M11 1h9v9h-9z" fill="currentColor" />
                                            <path d="M1 11h9v9H1z" fill="currentColor" />
                                            <path d="M11 11h9v9h-9z" fill="currentColor" />
                                        </svg>
                                        Ingreso Institucional
                                    </button>
                                    <button
                                        onClick={() => handleLogin('email')}
                                        className="px-10 py-3 text-sm font-semibold hover:bg-ig-hover rounded-lg transition-all text-ig-text-secondary hover:text-ig-text-main"
                                    >
                                        Credenciales CIIDES
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                </div>

                {/* Features Section */}
                <div className="mt-20 grid grid-cols-1 md:grid-cols-3 gap-8 border-t border-ig-border pt-12">
                    <div className="space-y-4">
                        <h3 className="text-sm font-bold uppercase tracking-widest text-ig-text-secondary">Seguimiento</h3>
                        <p className="text-lg font-semibold leading-tight">Monitoreo en tiempo real de compromisos y metas.</p>
                        <p className="text-sm text-ig-text-secondary">Visualiza el avance de cada programa académico de forma granular y precisa.</p>
                    </div>
                    <div className="space-y-4">
                        <h3 className="text-sm font-bold uppercase tracking-widest text-ig-text-secondary">Evaluación</h3>
                        <p className="text-lg font-semibold leading-tight">Análisis detallado por facultad y programa.</p>
                        <p className="text-sm text-ig-text-secondary">Genera reportes comparativos y detecta áreas de oportunidad instantáneamente.</p>
                    </div>
                    <div className="space-y-4">
                        <h3 className="text-sm font-bold uppercase tracking-widest text-ig-text-secondary">Calidad</h3>
                        <p className="text-lg font-semibold leading-tight">Aseguramiento de estándares institucionales.</p>
                        <p className="text-sm text-ig-text-secondary">Alineación perfecta con los requisitos de acreditación y calidad nacional.</p>
                    </div>
                </div>
            </main>

            {/* Footer Minimalista */}
            <footer className="border-t border-ig-border py-12 px-6 bg-ig-hover/30">
                <div className="max-w-screen-xl mx-auto space-y-12">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
                        {/* Oscar Fabian */}
                        <div className="space-y-4">
                            <h4 className="text-sm font-bold text-ig-text-main">Oscar Fabian Patiño Perdomo</h4>
                            <p className="text-[11px] text-ig-text-secondary leading-relaxed">
                                Doctor en Educación, Magister en Gerencia de Sistemas de Información y Proyectos Tecnológicos y Especialista en Gestión de Sistemas y Tecnologías de la Información en la Empresa; Docente de la Universidad de la Amazonia, Facultad de ingeniería, Centro de investigación Innovación y desarrollo para la sustentabilidad S.A.S BIC, Florencia, Colombia.
                            </p>
                            <a href="mailto:o.patino@udla.edu.co" className="text-[11px] font-bold text-ig-accent hover:underline">o.patino@udla.edu.co</a>
                        </div>

                        {/* Wilmer Arley */}
                        <div className="space-y-4">
                            <h4 className="text-sm font-bold text-ig-text-main">Wilmer Arley Patiño Perdomo</h4>
                            <p className="text-[11px] text-ig-text-secondary leading-relaxed">
                                Doctor en Gerencia y Política Educativa, Especialista en Ingeniería de Software, Docente de la Universidad de la Amazonia, Facultad de ingeniería, Centro de investigación Innovación y desarrollo para la sustentabilidad S.A.S BIC, Florencia, Colombia.
                            </p>
                            <a href="mailto:w.patino@udla.edu.co" className="text-[11px] font-bold text-ig-accent hover:underline">w.patino@udla.edu.co</a>
                        </div>

                        {/* Victor Julio */}
                        <div className="space-y-4">
                            <h4 className="text-sm font-bold text-ig-text-main">Victor Julio Balanta Martinez</h4>
                            <p className="text-[11px] text-ig-text-secondary leading-relaxed">
                                Doctor en Desarrollo Sostenible, Magister en Desarrollo Sostenible y Educación Ambiental, Docente de la Universidad de la Amazonía, Facultad de Ciencias Contables, Económicas y Administractivas, Centro de investigación Innovación y desarrollo para la sustentabilidad S.A.S BIC, Florencia-Caquetá, Colombia.
                            </p>
                            <a href="mailto:v.balanta@udla.edu.co" className="text-[11px] font-bold text-ig-accent hover:underline">v.balanta@udla.edu.co</a>
                        </div>
                    </div>

                    <div className="pt-8 border-t border-ig-border flex flex-col md:flex-row justify-between items-center gap-8">
                        <div className="flex items-center gap-4">
                            <img src="/LogoU.png" alt="U" className="h-10 grayscale opacity-50" />
                            <img src="/Logo_CiidesBic.png" alt="C" className="h-10 grayscale opacity-50" />
                        </div>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-ig-text-secondary">
                            &copy; {new Date().getFullYear()} CIIDES BIC & Universidad de la Amazonia
                        </p>
                    </div>
                </div>
            </footer>
        </div>
    );
};

export default HomePage;
