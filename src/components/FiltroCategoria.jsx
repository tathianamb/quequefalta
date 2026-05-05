import { ORDEM_CATEGORIAS } from "../utils/categorias";
import { SlidersHorizontal, X, Check } from "lucide-react";
import { useState } from "react";

function FiltroCategoria({ categoriasFiltro, setCategoriasFiltro }) {
  const [aberto, setAberto] = useState(false);
  const [selecao, setSelecao] = useState(categoriasFiltro);

  const abrirModal = () => {
    setSelecao(categoriasFiltro);
    setAberto(true);
  };

  const toggleCategoria = (cat) => {
    setSelecao((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat],
    );
  };

  const aplicar = () => {
    setCategoriasFiltro(selecao);
    setAberto(false);
  };

  const limpar = () => {
    setSelecao([]);
  };

  const resumo = () => {
    if (categoriasFiltro.length === 0) return null;
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
            onClick={abrirModal}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              padding: "6px 12px",
              borderRadius: "20px",
              border: "none",
              background: "#FEC601",
              color: "#212529",
              fontFamily: "Nunito, sans-serif",
              fontWeight: 700,
              fontSize: "13px",
              cursor: "pointer",
              flex: 1,
              justifyContent: "space-between",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <SlidersHorizontal size={14} />
              <span>Filtrado por: {resumo()}</span>
            </div>
            <X
              size={14}
              onClick={(e) => {
                e.stopPropagation();
                setCategoriasFiltro([]);
              }}
            />
          </button>
        </div>
      )}

      {/* Botão filtrar quando não há filtro */}
      {categoriasFiltro.length === 0 && (
        <div style={{ padding: "0 16px 12px" }}>
          <button
            onClick={abrirModal}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              padding: "6px 14px",
              borderRadius: "20px",
              border: "none",
              fontFamily: "Nunito, sans-serif",
              fontWeight: 500,
              fontSize: "13px",
              cursor: "pointer",
              background: "var(--bg)",
              color: "var(--text-soft)",
            }}
          >
            <SlidersHorizontal size={14} />
            Filtrar
          </button>
        </div>
      )}

      {/* Bottom sheet */}
      {aberto && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 200,
            display: "flex",
            flexDirection: "column",
            justifyContent: "flex-end",
            background: "rgba(0,0,0,0.4)",
          }}
          onClick={() => setAberto(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "var(--card)",
              borderRadius: "24px 24px 0 0",
              maxHeight: "85vh",
              display: "flex",
              flexDirection: "column",
            }}
          >
            {/* Handle */}
            <div
              style={{
                width: "40px",
                height: "4px",
                background: "#DEE2E6",
                borderRadius: "2px",
                margin: "16px auto 0",
                flexShrink: 0,
              }}
            />

            {/* Header fixo */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "16px 20px",
                flexShrink: 0,
                borderBottom: "1px solid #F1F3F5",
              }}
            >
              <h2
                style={{
                  fontWeight: 700,
                  fontSize: "18px",
                  color: "var(--text)",
                }}
              >
                Filtrar
              </h2>
              <X
                size={20}
                color="var(--text-soft)"
                style={{ cursor: "pointer" }}
                onClick={() => setAberto(false)}
              />
            </div>

            {/* Lista em tags */}
            <div
              style={{
                padding: "16px 20px",
                display: "flex",
                flexWrap: "wrap",
                gap: "10px",
                overflowY: "auto",
                flex: 1,
              }}
            >
              {ORDEM_CATEGORIAS.map((cat) => {
                const selecionado = selecao.includes(cat);
                return (
                  <button
                    key={cat}
                    onClick={() => toggleCategoria(cat)}
                    style={{
                      padding: "8px 10px",
                      border: `1.5px solid ${selecionado ? "#FEC60155" : "#DEE2E655"}`,
                      background: selecionado ? "#FEC60122" : "var(--card)",
                      color: selecionado ? "var(--text)" : "var(--text-soft)",
                      borderRadius: "20px",
                      fontFamily: "Nunito, sans-serif",
                      fontWeight: 500,
                      fontSize: "14px",
                      cursor: "pointer",
                      transition: "all 0.2s",
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                      letterSpacing: "0.5px",
                    }}
                  >
                    {selecionado && <Check size={14} color="#FE5F01" />}
                    {cat}
                  </button>
                );
              })}
            </div>

            {/* Rodapé fixo */}
            <div
              style={{
                display: "flex",
                gap: "12px",
                padding: "16px 20px 80px",
                borderTop: "1px solid #F1F3F5",
                flexShrink: 0,
                background: "var(--card)",
              }}
            >
              <button
                onClick={limpar}
                style={{
                  flex: 1,
                  padding: "14px",
                  borderRadius: "15px",
                  border: "1.5px solid #DEE2E6",
                  background: "transparent",
                  color: "var(--text-soft)",
                  fontFamily: "Nunito, sans-serif",
                  fontWeight: 600,
                  fontSize: "15px",
                  cursor: "pointer",
                }}
              >
                Limpar
              </button>
              <button
                onClick={aplicar}
                style={{
                  flex: 2,
                  padding: "14px",
                  borderRadius: "15px",
                  border: "none",
                  background:
                    selecao.length === 0
                      ? "var(--bg)"
                      : "linear-gradient(135deg, #FEC601, #FEC601)",
                  color: selecao.length === 0 ? "var(--text-soft)" : "#212529",
                  fontFamily: "Nunito, sans-serif",
                  fontWeight: 700,
                  fontSize: "15px",
                  cursor: "pointer",
                  transition: "all 0.2s",
                }}
              >
                {selecao.length === 0
                  ? "Ver todos"
                  : `Aplicar (${selecao.length})`}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default FiltroCategoria;
