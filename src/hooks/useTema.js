import { useState, useEffect } from "react";

// As paletas ficam em index.css (:root, :root[data-tema="escuro"] e o @media
// prefers-color-scheme para o modo Auto). Aqui só se escolhe o atributo.
// A preferência guardada no aparelho é "claro" | "escuro"; sem valor = "auto".
const CHAVE = "tema";
const COR_BARRA = { claro: "#FFFFFF", escuro: "#1A1B1E" };
const CONSULTA_ESCURO = "(prefers-color-scheme: dark)";

export function lerPreferenciaTema() {
  try {
    const salvo = localStorage.getItem(CHAVE);
    return salvo === "escuro" || salvo === "claro" ? salvo : "auto";
  } catch {
    return "auto";
  }
}

function sistemaEstaEscuro() {
  return !!window.matchMedia && window.matchMedia(CONSULTA_ESCURO).matches;
}

// Aplica a preferência no <html> (e na cor da barra do navegador). Em "auto"
// o atributo sai e quem decide é o @media do CSS. Usada também em main.jsx,
// antes do primeiro quadro, para não piscar claro.
export function aplicarTema(preferencia) {
  const root = document.documentElement;
  if (preferencia === "claro" || preferencia === "escuro") {
    root.dataset.tema = preferencia;
  } else {
    delete root.dataset.tema;
  }
  const escuro =
    preferencia === "escuro" || (preferencia === "auto" && sistemaEstaEscuro());
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute("content", escuro ? COR_BARRA.escuro : COR_BARRA.claro);
}

export function useTema() {
  const [preferencia, setPreferencia] = useState(lerPreferenciaTema);
  const [sistemaEscuro, setSistemaEscuro] = useState(sistemaEstaEscuro);

  // Acompanha a troca de tema do sistema (relevante no modo Auto).
  useEffect(() => {
    if (!window.matchMedia) return undefined;
    const consulta = window.matchMedia(CONSULTA_ESCURO);
    const aoMudar = (e) => setSistemaEscuro(e.matches);
    consulta.addEventListener("change", aoMudar);
    return () => consulta.removeEventListener("change", aoMudar);
  }, []);

  useEffect(() => {
    aplicarTema(preferencia);
  }, [preferencia, sistemaEscuro]);

  const escuro =
    preferencia === "escuro" || (preferencia === "auto" && sistemaEscuro);

  const definirTema = (nova) => {
    try {
      if (nova === "auto") localStorage.removeItem(CHAVE);
      else localStorage.setItem(CHAVE, nova);
    } catch {
      /* sem storage: vale só nesta sessão */
    }
    setPreferencia(nova);
  };

  const toggleTema = () => definirTema(escuro ? "claro" : "escuro");
  const seguirSistema = () => definirTema("auto");

  return { escuro, preferencia, definirTema, toggleTema, seguirSistema };
}
