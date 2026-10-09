/**
 * Logger simple para la consola con etiquetas.
 * Emite el mensaje con marca de tiempo ISO, etiqueta de categoría y color
 * según el tipo (`info` cian, `error` rojo, `warn` amarillo).
 *
 * @param {string} tag - Etiqueta de la categoría (SERVER, DATABASE, HTTP, etc.).
 * @param {string} message - Mensaje a mostrar.
 * @param {'info'|'error'|'warn'} [type='info'] - Tipo de mensaje; cualquier otro valor usa el color de `info`.
 * @returns {void}
 */
const log = (tag, message, type = 'info') => {
    const timestamp = new Date().toISOString();
    const colors = {
        info: '\x1b[36m', // Cyan
        error: '\x1b[31m', // Red
        warn: '\x1b[33m', // Yellow
        reset: '\x1b[0m'
    };

    const color = colors[type] || colors.info;
    console.log(`[${timestamp}] ${color}[${tag}]${colors.reset} ${message}`);
};

/**
 * Función logger exportada por defecto.
 * @type {(tag: string, message: string, type?: 'info'|'error'|'warn') => void}
 */
export default log;
