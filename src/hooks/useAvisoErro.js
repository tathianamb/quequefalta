import { useEffect, useRef, useState } from "react";

/**
 * Aviso de gravação que falhou. As gravações não esperam o servidor (com
 * sinal fraco a promise demora); o erro, quando vem, aparece por 5 s.
 *
 * Também controla as ações dos botões de aprovar/rejeitar: uma por item por
 * vez. O ref barra o toque duplo no mesmo instante; `emAndamento` (ids)
 * desabilita os botões do item.
 */
export function useAvisoErro() {
  const [avisoErro, setAvisoErro] = useState(null);
  const timerAvisoRef = useRef(null);
  useEffect(() => () => clearTimeout(timerAvisoRef.current), []);
  const avisarErro = (mensagem, e) => {
    console.error(mensagem, e);
    setAvisoErro(mensagem);
    clearTimeout(timerAvisoRef.current);
    timerAvisoRef.current = setTimeout(() => setAvisoErro(null), 5000);
  };

  const emAndamentoRef = useRef(new Set());
  const [emAndamento, setEmAndamento] = useState([]);
  const rodarUmaVez = (id, acao, mensagemErro) => {
    if (emAndamentoRef.current.has(id)) return;
    emAndamentoRef.current.add(id);
    setEmAndamento([...emAndamentoRef.current]);
    Promise.resolve()
      .then(acao)
      .catch((e) => avisarErro(mensagemErro, e))
      .finally(() => {
        emAndamentoRef.current.delete(id);
        setEmAndamento([...emAndamentoRef.current]);
      });
  };

  return { avisoErro, avisarErro, emAndamento, rodarUmaVez };
}
