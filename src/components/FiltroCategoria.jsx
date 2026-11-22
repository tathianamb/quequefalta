import { SlidersHorizontal, X, Check } from "lucide-react";
import Folha from "./Folha";
import BotaoIcone from "./BotaoIcone";
import { useState } from "react";
import {
  FONTE,
  RAIO,
  BOTAO_PRIMARIO,
  BOTAO_SECUNDARIO,
  COR,
} from "../utils/estilos";

function FiltroCategoria({
  categoriasFiltro,
  setCategoriasFiltro,
  botoesExtras,
  categorias,
  pushBack, // opcionais (useBackStack da Home): o voltar do aparelho fecha a folha
  descartar,
}) {
  const [aberto, setAberto] = useState(false);
  const [selecao, setSelecao] = useState(categoriasFiltro);

  const abrirModal = () => {
    setSelecao(categoriasFiltro);
    setAberto(true);
    pushBack?.(() => setAberto(false), "filtro");
  };

  const fecharModal = () => {
    setAberto(false);
    descartar?.("filtro");
  };

  const toggleCategoria = (cat) => {
    setSelecao((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat],
    );
  };

  const aplicar = () => {
    setCategoriasFiltro(selecao);
    fecharModal();
  };

  const limpar = () => {
    setSelecao([]);
  };

  const resumo = () => {
    const visiveis = categoriasFiltro.slice(0, 2);
    const extras = categoriasFiltro.length - 2;
    let texto = visiveis.join(", ");
    if (extras > 0) texto += ` +${extras}`;
    return texto;
  };

  return (
    <>
      {/* Linha de filtro ativo */}
      {categoriasFiltro.length > 0 && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            padding: "0 16px 12px",
          }}
        >
          <button
            type="button"
            onClick={abrirModal}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              padding: "6px 12px",
              borderRadius: RAIO.pill,
              border: "none",
              background: "var(--amarelo)",
              color: COR.textoSobreDestaque,
              fontFamily: "Nunito, sans-serif",
              fontWeight: FONTE.bold,
              fontSize: "13px",
              cursor: "pointer",
              flex: 1,
              minWidth: 0,
              justifyContent: "space-between",
            }}
          >
            <span style={{ display: "flex", alignItems: "center", gap: "6px", minWidth: 0 }}>
              <SlidersHorizontal size={14} style={{ flexShrink: 0 }} />
              <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>Filtrado por: {resumo()}</span>
            </span>
          </button>
          <BotaoIcone
            icone={X}
            rotulo="Limpar filtro"
            tamanho={14}
            cor="var(--text)"
            onClick={() => setCategoriasFiltro([])}
            style={{ width: "36px", height: "36px" }}
          />

          {/* Botão expandir/recolher — passado como prop */}
          {botoesExtras}
        </div>
      )}

      {/* Botão filtrar quando não há filtro */}
      {categoriasFiltro.length === 0 && (
        <div
          style={{
            padding: "0 16px 12px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <button
            type="button"
            onClick={abrirModal}
            style={{
              ...BOTAO_SECUNDARIO,
              padding: "6px 14px",
              fontSize: "13px",
              display: "flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            <SlidersHorizontal size={14} />
            Filtrar
          </button>

          {/* Botão expandir/recolher — passado como prop */}
          {botoesExtras}
        </div>
      )}

      {/* Bottom sheet */}
      {aberto && (
        <Folha
          onFechar={fecharModal}
          titulo="Filtrar"
          corpoStyle={{ display: "flex", flexWrap: "wrap", gap: "10px", alignContent: "flex-start" }}
          rodape={
            <div style={{ display: "flex", gap: "12px" }}>
              <button
                type="button"
                onClick={limpar}
                style={{
                  flex: 1,
                  padding: "14px",
                  ...BOTAO_SECUNDARIO,
                  borderRadius: RAIO.md,
                  fontSize: FONTE.base,
                }}
              >
                Limpar
              </button>
              <button
                type="button"
                onClick={aplicar}
                style={{
                  flex: 2,
                  padding: "14px",
                  ...BOTAO_PRIMARIO,
                  borderRadius: RAIO.md,
                  background:
                    selecao.length === 0
                      ? "var(--bg)"
                      : BOTAO_PRIMARIO.background,
                  color:
                    selecao.length === 0
                      ? "var(--text-soft)"
                      : BOTAO_PRIMARIO.color,
                  transition: "all 0.2s",
                }}
              >
                {selecao.length === 0
                  ? "Ver todos"
                  : `Aplicar (${selecao.length})`}
              </button>
            </div>
          }
        >
          {categorias.map((cat) => {
            const selecionado = selecao.includes(cat);
            return (
              <button
                key={cat}
                type="button"
                aria-pressed={selecionado}
                onClick={() => toggleCategoria(cat)}
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
        </Folha>
      )}
    </>
  );
}

export default FiltroCategoria;
