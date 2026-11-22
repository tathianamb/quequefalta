import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { aplicarTema, lerPreferenciaTema } from './hooks/useTema.js'

// Antes do primeiro quadro: evita o clarão no tema escuro.
try {
  aplicarTema(lerPreferenciaTema())
} catch {
  /* sem tema salvo: vale o CSS padrão */
}

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
