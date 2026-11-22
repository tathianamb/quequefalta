import { Component, Fragment } from "react";
import Folha from "./Folha";
import { BOTAO_PRIMARIO, BOTAO_SECUNDARIO, RAIO, TIPOGRAFIA } from "../utils/estilos";

// Falha ao baixar o arquivo de uma tela carregada sob demanda (sinal fraco, ou
// um deploy novo que apagou o arquivo antigo com o app aberto).
function ehErroDeChunk(erro) {
  const texto = `${erro?.name ?? ""} ${erro?.message ?? ""}`;
  return /ChunkLoadError|Failed to fetch dynamically imported module|Importing a module script failed|error loading dynamically imported module/i.test(
    texto,
  );
}

const estiloBotao = { padding: "12px 18px", minHeight: "44px" };

// Error boundary (React 19 ainda exige classe) para as telas `lazy`: sem ele,
// um import que falha desmonta a árvore inteira e a tela fica em branco.
// Mostra o aviso só no lugar da tela que falhou. "Tentar de novo" zera o erro
// e remonta os filhos (key nova), o que refaz o import (ver utils/lazy.jsx).
//
// `aoFechar` (opcional): para telas que são modais; mostra também "Fechar".
// Passe o fechador que já cuida da pilha do voltar.
class LimiteDeErro extends Component {
  state = { erro: null, tentativa: 0 };

  static getDerivedStateFromError(erro) {
    return { erro };
  }

  componentDidCatch(erro, info) {
    console.error("Falha ao exibir a tela:", erro, info?.componentStack);
  }

  tentarDeNovo = () => {
    this.setState((s) => ({ erro: null, tentativa: s.tentativa + 1 }));
  };

  render() {
    const { erro, tentativa } = this.state;
    const { aoFechar, children } = this.props;

    if (!erro) return <Fragment key={tentativa}>{children}</Fragment>;

    const conteudo = (
      <div role="alert" style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
        <p style={{ ...TIPOGRAFIA.corpo, color: "var(--text-soft)", lineHeight: 1.5 }}>
          Não foi possível abrir esta tela. Confira a conexão.
        </p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "10px" }}>
          <button type="button" onClick={this.tentarDeNovo} style={{ ...BOTAO_PRIMARIO, ...estiloBotao }}>
            Tentar de novo
          </button>
          {ehErroDeChunk(erro) && (
            <button
              type="button"
              onClick={() => window.location.reload()}
              style={{ ...BOTAO_SECUNDARIO, ...estiloBotao }}
            >
              Atualizar o app
            </button>
          )}
          {aoFechar && (
            <button type="button" onClick={aoFechar} style={{ ...BOTAO_SECUNDARIO, ...estiloBotao }}>
              Fechar
            </button>
          )}
        </div>
      </div>
    );

    if (aoFechar) {
      return (
        <Folha onFechar={aoFechar} rotulo="Erro ao abrir a tela">
          {conteudo}
        </Folha>
      );
    }
    return (
      <div
        style={{
          margin: "16px",
          padding: "16px",
          background: "var(--card)",
          borderRadius: RAIO.lg,
        }}
      >
        {conteudo}
      </div>
    );
  }
}

export default LimiteDeErro;
