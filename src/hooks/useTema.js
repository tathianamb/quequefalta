import { useState, useEffect } from 'react'

export function useTema() {
  const [escuro, setEscuro] = useState(() => {
    return localStorage.getItem('tema') === 'escuro'
  })

  useEffect(() => {
    const root = document.documentElement
    if (escuro) {
      root.style.setProperty('--bg', '#1A1B1E')
      root.style.setProperty('--card', '#25262B')
      root.style.setProperty('--text', '#F8F9FA')
      root.style.setProperty('--text-soft', '#868E96')
      root.style.setProperty('--shadow', '0 2px 12px rgba(0,0,0,0.3)')
      localStorage.setItem('tema', 'escuro')
    } else {
      root.style.setProperty('--bg', '#F8F9FA')
      root.style.setProperty('--card', '#FFFFFF')
      root.style.setProperty('--text', '#212529')
      root.style.setProperty('--text-soft', '#868E96')
      root.style.setProperty('--shadow', '0 2px 12px rgba(0,0,0,0.08)')
      localStorage.setItem('tema', 'claro')
    }
  }, [escuro])

  return { escuro, toggleTema: () => setEscuro(e => !e) }
}