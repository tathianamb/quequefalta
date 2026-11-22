import { useCallback, useLayoutEffect, useRef } from "react";

/**
 * Devolve uma função de identidade fixa que sempre chama a última versão de
 * `fn`. Serve para callbacks que dependem do estado do render (ou vêm do
 * useBackStack, que muda a cada render) e são passados a componentes em
 * React.memo, como o ProdutoItem.
 */
export function useCallbackEstavel(fn) {
  const ref = useRef(fn);
  useLayoutEffect(() => {
    ref.current = fn;
  });
  return useCallback((...args) => ref.current(...args), []);
}
