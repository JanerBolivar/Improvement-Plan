/**
 * Punto de entrada principal de la aplicación frontend.
 * 
 * Renderiza la aplicación React 19 montando el componente raíz <App /> 
 * en el elemento con id 'root' utilizando createRoot, con StrictMode habilitado.
 * 
 * Efectos secundarios:
 * - Configura axios.defaults.baseURL con la URL base del backend obtenida de variables de entorno.
 * 
 * @returns {void}
 */
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

import axios from 'axios';

import { urlBackend } from './config/envs.js';

axios.defaults.baseURL = urlBackend;

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
