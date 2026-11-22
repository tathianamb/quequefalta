import { useState } from "react";

// Preferência de agrupamento da lista ("categoria" | "mercado"), só deste aparelho.
function lerAgrupamentoSalvo() {
  try {
    return localStorage.getItem("agrupamentoLista") === "mercado" ? "mercado" : "categoria";
  } catch {
    return "categoria";
  }
}

export function useAgrupamentoLista() {
  const [agrupamentoLista, setAgrupamentoLista] = useState(lerAgrupamentoSalvo);
  const mudarAgrupamento = (valor) => {
    setAgrupamentoLista(valor);
    try { localStorage.setItem("agrupamentoLista", valor); } catch { /* sem storage: só não lembra */ }
  };
  return [agrupamentoLista, mudarAgrupamento];
}
