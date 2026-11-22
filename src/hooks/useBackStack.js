import { useEffect, useRef } from "react";

const MAX = 10;

/**
 * Pilha imperativa de "voltar". Quem abre uma tela/modal chama
 * pushBack(fn, chave) com a função que desfaz a abertura; o voltar do
 * Android/navegador (popstate) executa o topo da pilha.
 *
 * Toda a pilha ocupa uma única entrada no histórico do navegador, enquanto
 * houver algo nela.
 *
 * - voltar(seVazia?): o mesmo que o voltar do aparelho. É o que os botões
 *   "← Voltar" das telas usam, para os dois caminhos darem no mesmo lugar.
 * - descartar(chave): tira da pilha, sem executar, as entradas com essa
 *   chave. Use quando a tela foi fechada de outro jeito (X, fundo, salvar,
 *   trocar de aba); sem isso, a entrada ficava na pilha e o próximo voltar
 *   do aparelho "não fazia nada" (ou reabria uma tela já fechada).
 * - trocar(chave, fn): descarta as entradas da chave e empilha fn no lugar.
 */
export function useBackStack() {
  const pilha = useRef([]); // [{ fn, chave }]
  const empurradoRef = useRef(false);
  // history.back() feito por nós para consumir a entrada quando a pilha
  // esvazia: o popstate que ele gera não deve desempilhar nada.
  const ignorarPopRef = useRef(false);

  useEffect(() => {
    const onPopState = () => {
      if (ignorarPopRef.current) {
        ignorarPopRef.current = false;
        return;
      }
      const entrada = pilha.current.pop();
      if (entrada) {
        entrada.fn();
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

  // Pilha vazia: devolve a entrada que empurramos no histórico, para o voltar
  // seguinte do aparelho sair do app em vez de ser um toque morto.
  const sincronizarHistorico = () => {
    if (pilha.current.length === 0 && empurradoRef.current) {
      empurradoRef.current = false;
      ignorarPopRef.current = true;
      window.history.back();
    }
  };

  const pushBack = (fn, chave = null) => {
    if (pilha.current.length >= MAX) pilha.current.shift();
    pilha.current.push({ fn, chave });
    if (!empurradoRef.current) {
      window.history.pushState({ backStack: true }, "");
      empurradoRef.current = true;
    }
  };

  // seVazia: o que fazer se a pilha estiver vazia (ex.: a entrada saiu pelo
  // limite MAX), para um botão "← Voltar" nunca ficar sem efeito.
  const voltar = (seVazia) => {
    const entrada = pilha.current.pop();
    if (entrada) entrada.fn();
    else seVazia?.();
    sincronizarHistorico();
  };

  const descartar = (chave) => {
    const antes = pilha.current.length;
    pilha.current = pilha.current.filter((e) => e.chave !== chave);
    if (pilha.current.length !== antes) sincronizarHistorico();
  };

  // Troca as entradas da chave por uma só (ex.: receita enviada — o voltar
  // passa a encerrar o fluxo em vez de reabrir o formulário/texto).
  const trocar = (chave, fn) => {
    pilha.current = pilha.current.filter((e) => e.chave !== chave);
    pushBack(fn, chave);
  };

  return { pushBack, voltar, descartar, trocar };
}
