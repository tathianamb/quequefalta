import { lazy } from "react";

const ESPERA_NOVA_TENTATIVA_MS = 1000;

// Como `lazy()`, mas refaz o import uma vez (após ~1s) se ele falhar, p. ex.
// por sinal fraco. Devolve um componente estável que renderiza o `lazy`
// atual; quando o import falha de vez, o `lazy` rejeitado (que o React
// guardaria para sempre) é trocado por um novo, e a próxima montagem do
// componente (o "Tentar de novo" do LimiteDeErro remonta a tela) refaz o
// import em vez de reaproveitar a rejeição.
export function lazyComNovaTentativa(importador) {
  const criar = () =>
    lazy(async () => {
      try {
        return await importador();
      } catch {
        await new Promise((resolver) => setTimeout(resolver, ESPERA_NOVA_TENTATIVA_MS));
        try {
          return await importador();
        } catch (erro) {
          atual = criar();
          throw erro;
        }
      }
    });

  let atual = criar();

  function TelaCarregavel(props) {
    const Tela = atual;
    return <Tela {...props} />;
  }
  return TelaCarregavel;
}
