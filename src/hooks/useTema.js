import { useState, useEffect } from "react";

export function useTema() {
  const sistemaEscuro = window.matchMedia(
    "(prefers-color-scheme: dark)",
  ).matches;

  const [escuro, setEscuro] = useState(() => {
    const salvo = localStorage.getItem("tema");
    if (salvo === "escuro") return true;
    if (salvo === "claro") return false;
    return sistemaEscuro;
  });

  useEffect(() => {
    const root = document.documentElement;
    if (escuro) {
      root.style.setProperty("--bg", "#1A1B1E");
      root.style.setProperty("--card", "#25262B");
      root.style.setProperty("--text", "#F8F9FA");
      root.style.setProperty("--text-soft", "#868E96");
      root.style.setProperty("--shadow", "0 2px 12px rgba(0,0,0,0.3)");
      root.style.setProperty("--amarelo-validacao", "#fec601"); // amarelo vivo — contraste ok no escuro
    } else {
      root.style.setProperty("--bg", "#F8F9FA");
      root.style.setProperty("--card", "#FFFFFF");
      root.style.setProperty("--text", "#212529");
      root.style.setProperty("--text-soft", "#868E96");
      root.style.setProperty("--shadow", "0 2px 12px rgba(0,0,0,0.08)");
      root.style.setProperty("--amarelo-validacao", "#b07d00"); // mostarda escura — contraste ok no claro
    }
  }, [escuro]);

  const toggleTema = () => {
    setEscuro((e) => {
      localStorage.setItem("tema", !e ? "escuro" : "claro");
      return !e;
    });
  };

  const seguirSistema = () => {
    localStorage.removeItem("tema");
    setEscuro(sistemaEscuro);
  };

  return { escuro, toggleTema, seguirSistema };
}
