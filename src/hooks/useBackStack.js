import { useEffect, useRef } from "react";

const MAX = 10;

/**
 * Pilha imperativa de "voltar". Quem abre uma tela/modal/aba chama pushBack()
 * com a função que desfaz a abertura. O popstate executa o topo da pilha.
 */
export function useBackStack() {
  const pilha = useRef([]);
  const empurradoRef = useRef(false);

  useEffect(() => {
    const onPopState = () => {
      const fn = pilha.current.pop();
      if (fn) {
        fn();
        if (pilha.current.length > 0) {
          window.history.pushState({ backStack: true }, "");
        } else {
          empurradoRef.current = false;
        }
      }
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  const pushBack = (fn) => {
    if (pilha.current.length >= MAX) pilha.current.shift();
    pilha.current.push(fn);
    if (!empurradoRef.current) {
      window.history.pushState({ backStack: true }, "");
      empurradoRef.current = true;
    }
  };

  return { pushBack };
}
