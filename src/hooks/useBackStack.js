import { useEffect, useRef } from "react";

/**
 * Gerencia o histórico do browser para que o gesto "voltar" no mobile
 * feche a camada mais interna em vez de sair do PWA.
 *
 * Recebe uma lista ordenada de camadas (da mais interna para a mais externa).
 * Cada camada tem: { aberta: boolean, fechar: () => void }
 *
 * Invariante: enquanto pelo menos uma camada estiver aberta, há sempre uma
 * entrada extra no histórico para o popstate interceptar.
 */
export function useBackStack(camadas) {
  const empurradoRef = useRef(false);

  const algumaAberta = camadas.some((c) => c.aberta);

  useEffect(() => {
    if (algumaAberta && !empurradoRef.current) {
      window.history.pushState({ backStack: true }, "");
      empurradoRef.current = true;
    } else if (!algumaAberta && empurradoRef.current) {
      // Volta uma entrada para manter a sincronia (a entrada que pushamos
      // ficou "pendurada" depois que tudo foi fechado pelo próprio UI).
      window.history.go(-1);
      empurradoRef.current = false;
    }
  }, [algumaAberta]);

  useEffect(() => {
    const onPopState = () => {
      // Só age se o evento veio da nossa entrada (ou de outra navegação
      // enquanto tínhamos camadas abertas).
      if (!empurradoRef.current) return;

      // Encontra a camada mais interna aberta e a fecha.
      const maisInterna = camadas.find((c) => c.aberta);
      if (maisInterna) {
        // Reempurra imediatamente para que a próxima pressão de "voltar"
        // ainda seja interceptada caso haja mais camadas abertas.
        window.history.pushState({ backStack: true }, "");
        maisInterna.fechar();
      } else {
        empurradoRef.current = false;
      }
    };

    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [camadas]);
}