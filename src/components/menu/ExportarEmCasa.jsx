import { useState } from "react";
import { X, Download, Check } from "lucide-react";
import BotaoIcone from "../BotaoIcone";
import { baixarCsv } from "../../utils/csv";
import { ORDEM_CATEGORIAS, CATEGORIAS_NAO_ALIMENTARES } from "../../utils/categorias";
import { TIPOGRAFIA, FONTE, RAIO, BOTAO_PRIMARIO } from "../../utils/estilos";

// Última seleção de categorias da exportação "em casa" — conveniência por
// aparelho, para não ter que remarcar tudo a cada exportação.
const CHAVE_CATEGORIAS_EXPORTAR = "quequefalta:exportarCasa:categorias";

function lerCategoriasExportar() {
  try {
    const salvo = JSON.parse(localStorage.getItem(CHAVE_CATEGORIAS_EXPORTAR));
    return Array.isArray(salvo) ? salvo : [];
  } catch {
    return [];
  }
}

function salvarCategoriasExportar(categorias) {
  try {
    localStorage.setItem(CHAVE_CATEGORIAS_EXPORTAR, JSON.stringify(categorias));
  } catch {
    // sem storage (aba anônima etc.) — só não lembra a seleção
  }
}

const mesmasCategorias = (a, b) => a.length === b.length && a.every((c) => b.includes(c));

// Mesma ordem da lista (alimentos primeiro, limpeza/higiene no fim).
const posicaoCategoria = (cat) => {
  const i = ORDEM_CATEGORIAS.indexOf(cat);
  return i === -1 ? ORDEM_CATEGORIAS.length : i;
};

// Tela interna "Exportar o que tem em casa": escolhe categorias e baixa o CSV.
function ExportarEmCasa({ voltarTela, itensEmCasa }) {
  const [categoriasExportar, setCategoriasExportar] = useState(lerCategoriasExportar);

  const categoriasEmCasa = [
    ...new Set(itensEmCasa.map((i) => i.categoria).filter(Boolean)),
  ].sort((a, b) => posicaoCategoria(a) - posicaoCategoria(b) || a.localeCompare(b, "pt-BR"));

  const alimentosEmCasa = categoriasEmCasa.filter((c) => !CATEGORIAS_NAO_ALIMENTARES.includes(c));
  const naoAlimentosEmCasa = categoriasEmCasa.filter((c) => CATEGORIAS_NAO_ALIMENTARES.includes(c));

  // A seleção lembrada pode citar categorias que hoje não têm item em casa —
  // só as presentes contam (rótulo do botão e filtro do CSV).
  const selecionadasExportar = categoriasExportar.filter((c) => categoriasEmCasa.includes(c));

  const toggleCategoriaExportar = (cat) => {
    setCategoriasExportar(
      selecionadasExportar.includes(cat)
        ? selecionadasExportar.filter((c) => c !== cat)
        : [...selecionadasExportar, cat],
    );
  };

  const exportarEmCasa = () => {
    salvarCategoriasExportar(selecionadasExportar);
    const itens =
      selecionadasExportar.length === 0
        ? itensEmCasa
        : itensEmCasa.filter((i) => selecionadasExportar.includes(i.categoria));
    baixarCsv(
      "em-casa.csv",
      ["nome", "categoria", "subcategoria"],
      [...itens]
        .sort((a, b) => (a.nome ?? "").localeCompare(b.nome ?? "", "pt-BR"))
        .map((p) => [p.nome, p.categoria, p.subcategoria]),
    );
  };

  return (
    <div
      style={{ display: "flex", flexDirection: "column", gap: "12px" }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "4px",
        }}
      >
        <p style={{ ...TIPOGRAFIA.h2, color: "var(--text)" }}>
          Exportar o que tem em casa
        </p>
        <BotaoIcone
          icone={X}
          tamanho={22}
          rotulo="Fechar"
          onClick={voltarTela /* aberta direto pelo atalho do "Tem em casa": fecha o menu */}
          style={{ margin: "-6px -10px -6px 0" }}
        />
      </div>

      {itensEmCasa.length === 0 ? (
        <p
          style={{
            color: "var(--text-soft)",
            ...TIPOGRAFIA.corpo,
            marginBottom: "4px",
          }}
        >
          Nenhum item marcado como tem em casa ainda.
        </p>
      ) : (
        <>
          <p
            style={{
              color: "var(--text-soft)",
              ...TIPOGRAFIA.corpo,
              marginBottom: "4px",
            }}
          >
            Escolha as categorias que quer exportar. Deixe sem seleção
            para exportar tudo.
          </p>

          {/* Atalhos: marcam um conjunto de categorias de uma vez */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
            {[
              { rotulo: "🍎 Só alimentos", categorias: alimentosEmCasa },
              { rotulo: "🧴 Limpeza e higiene", categorias: naoAlimentosEmCasa },
            ]
              .filter((a) => a.categorias.length > 0)
              .map(({ rotulo, categorias }) => {
                const ativo = mesmasCategorias(selecionadasExportar, categorias);
                return (
                  <button
                    key={rotulo}
                    onClick={() => setCategoriasExportar(ativo ? [] : categorias)}
                    style={{
                      flex: 1,
                      whiteSpace: "nowrap",
                      padding: "10px",
                      border: `1.5px solid ${ativo ? "var(--laranja)" : "var(--borda-suave)"}`,
                      background: ativo ? "var(--amarelo-suave)" : "var(--bg)",
                      color: "var(--text)",
                      borderRadius: RAIO.md,
                      fontFamily: "Nunito, sans-serif",
                      fontWeight: FONTE.bold,
                      fontSize: FONTE.md,
                      cursor: "pointer",
                    }}
                  >
                    {rotulo}
                  </button>
                );
              })}
          </div>

          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "10px",
            }}
          >
            {categoriasEmCasa.map((cat) => {
              const selecionado = selecionadasExportar.includes(cat);
              return (
                <button
                  key={cat}
                  onClick={() => toggleCategoriaExportar(cat)}
                  style={{
                    padding: "8px 10px",
                    border: `1.5px solid ${selecionado ? "var(--amarelo-borda)" : "var(--borda-suave)"}`,
                    background: selecionado ? "var(--amarelo-suave)" : "var(--card)",
                    color: selecionado ? "var(--text)" : "var(--text-soft)",
                    borderRadius: RAIO.pill,
                    fontFamily: "Nunito, sans-serif",
                    fontWeight: FONTE.medio,
                    fontSize: FONTE.md,
                    cursor: "pointer",
                    transition: "all 0.2s",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    letterSpacing: "0.5px",
                  }}
                >
                  {selecionado && <Check size={14} color="var(--laranja)" />}
                  {cat}
                </button>
              );
            })}
          </div>

          <button
            onClick={exportarEmCasa}
            style={{
              padding: "14px",
              ...BOTAO_PRIMARIO,
              cursor: "pointer",
              marginTop: "4px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
            }}
          >
            <Download size={18} />
            {selecionadasExportar.length === 0
              ? "Exportar tudo"
              : `Exportar (${selecionadasExportar.length} categoria${selecionadasExportar.length > 1 ? "s" : ""})`}
          </button>
        </>
      )}
    </div>
  );
}

export default ExportarEmCasa;
