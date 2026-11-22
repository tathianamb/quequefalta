import { useEffect, useRef } from "react";

// Folhas e diálogos podem estar empilhados (ex.: a confirmação sobre o menu):
// o Esc vale só para o que foi montado por último.
const pilha = [];

/**
 * Chama `aoPressionar` quando a tecla Esc é apertada enquanto o componente
 * está montado e é o mais recente da pilha. O callback pode mudar a cada
 * render sem reinscrever o listener.
 */
export function useTeclaEsc(aoPressionar) {
  const callbackRef = useRef(aoPressionar);
  useEffect(() => {
    callbackRef.current = aoPressionar;
  });

  useEffect(() => {
    const entrada = {};
    pilha.push(entrada);
    const aoTeclar = (e) => {
      if (e.key !== "Escape" || pilha[pilha.length - 1] !== entrada) return;
      e.preventDefault();
      callbackRef.current?.();
    };
    document.addEventListener("keydown", aoTeclar);
    return () => {
      document.removeEventListener("keydown", aoTeclar);
      pilha.splice(pilha.indexOf(entrada), 1);
    };
  }, []);
}
