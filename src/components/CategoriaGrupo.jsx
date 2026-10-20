import { useState, useEffect } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { corDaCategoria } from "../utils/categorias";
import ProdutoItem from "./ProdutoItem";
import { TIPOGRAFIA, FONTE, RAIO } from "../utils/estilos";

function CategoriaGrupo({
  categoria,
  itens,
  onToggle,
  onAbrir,
  busca,
  itensDaLista,
  collapsed,
  corOverride,
  onRemover,
  forcarAberto,
  contexto,
  onFiltrarGrupo,
  subgrupos,
  acao, // { icone, rotulo, onClick } — botão opcional no cabeçalho
}) {
  const [aberto, setAberto] = useState(!collapsed);

  useEffect(() => {
    if (busca && busca.length > 0) setAberto(true);
  }, [busca]);

  useEffect(() => {
    if (forcarAberto !== undefined) setAberto(forcarAberto);
  }, [forcarAberto]);
  
  const cor = corOverride || corDaCategoria(categoria);

  const renderizarItem = (p) => (
    <ProdutoItem
      key={p.id}
      produto={p}
      onToggle={onToggle}
      onAbrir={onAbrir}
      naLista={itensDaLista?.some((i) => i.produtoId === p.id)}
      comprado={p.comprado}
      onRemover={onRemover || null}
      contexto={contexto}
      onFiltrarGrupo={onFiltrarGrupo}
    />
  );

  return (
    <div style={{ marginBottom: "16px" }}>
      <div
        onClick={() => setAberto(!aberto)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          marginBottom: aberto ? "10px" : "0",
          cursor: "pointer",
          userSelect: "none",
          padding: "8px 4px",
        }}
      >
        <div
          style={{
            width: "12px",
            height: "12px",
            borderRadius: RAIO.full,
            background: cor,
            flexShrink: 0,
          }}
        />
        <span
          style={{
            ...TIPOGRAFIA.categoria,
            flex: 1,
          }}
        >
          {categoria}
        </span>
        {acao && (
          <button
            onClick={(e) => { e.stopPropagation(); acao.onClick(); }}
            aria-label={acao.rotulo}
            title={acao.rotulo}
            style={{ background: "none", border: "none", padding: "2px 4px", cursor: "pointer", color: "var(--text-soft)", display: "flex", alignItems: "center" }}
          >
            <acao.icone size={18} />
          </button>
        )}
        <span
          style={{
            fontSize: FONTE.sm,
            background: cor + "22",
            color: cor,
            padding: "2px 8px",
            borderRadius: RAIO.pill,
            fontWeight: FONTE.bold,
          }}
        >
          {itens.length}
        </span>
        {aberto ? (
          <ChevronUp size={18} color="var(--text-soft)" />
        ) : (
          <ChevronDown size={18} color="var(--text-soft)" />
        )}
      </div>

      {aberto && !subgrupos && itens.map(renderizarItem)}

      {/* Subgrupos por categoria dentro do grupo (ex: "Tem em casa"), para
          não misturar alimentos com limpeza/higiene */}
      {aberto &&
        subgrupos?.map(([sub, itensSub]) => (
          <div key={sub} style={{ marginBottom: "8px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "6px", padding: "6px 4px 4px" }}>
              <div style={{ width: "8px", height: "8px", borderRadius: RAIO.full, background: corDaCategoria(sub), flexShrink: 0 }} />
              <span style={{ ...TIPOGRAFIA.label, color: "var(--text-soft)" }}>
                {sub} ({itensSub.length})
              </span>
            </div>
            {itensSub.map(renderizarItem)}
          </div>
        ))}
    </div>
  );
}

export default CategoriaGrupo;
