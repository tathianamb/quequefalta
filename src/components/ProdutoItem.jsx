import { Check, Plus, ShoppingCart, Trash2, MoreVertical } from "lucide-react";
import { corDaCategoria } from "../utils/categorias";
import { useState, useRef, useEffect } from "react";
import { TIPOGRAFIA, RAIO, COR, BORDA } from '../utils/estilos'

function ProdutoItem({
  produto,
  onToggle,
  onAbrir,
  naLista,
  comprado,
  onRemover,
  contexto,
}) {
  const cor = corDaCategoria(produto.categoria);
  const [feedback, setFeedback] = useState(false);
  const [menuAberto, setMenuAberto] = useState(false);
  const menuRef = useRef(null);

  const mostraOpcoes = typeof onRemover === "function" && contexto !== "catalogo";

  useEffect(() => {
    if (!menuAberto) return;
    const fechar = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuAberto(false);
      }
    };
    document.addEventListener("mousedown", fechar);
    document.addEventListener("touchstart", fechar, { passive: true });
    return () => {
      document.removeEventListener("mousedown", fechar);
      document.removeEventListener("touchstart", fechar);
    };
  }, [menuAberto]);

  const handleToggle = async () => {
    if (!onToggle) return;

    if (contexto === "lista") {
      await onToggle(produto);
      return;
    }

    if (naLista) {
      onRemover && onRemover({ ...produto, id: produto.itemId || produto.id });
      return;
    }

    const adicionado = await onToggle(produto);
    if (adicionado !== false) {
      setFeedback(true);
      setTimeout(() => setFeedback(false), 1500);
    }
  };

  const handleRemover = () => {
    setMenuAberto(false);
    onRemover && onRemover(produto);
  };

  return (
    <div style={{ marginBottom: "8px" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "12px",
          padding: "14px 16px",
          background: feedback ? "var(--laranja)11" : "var(--card)",
          borderRadius: RAIO.md,
          boxShadow: "var(--shadow)",
          borderLeft: `4px solid ${feedback ? "var(--laranja)" : comprado ? "var(--laranja)" : cor}`,
          opacity: comprado ? 0.4 : 1,
          transition: "background 0.3s, opacity 0.2s",
          position: "relative",
        }}
      >
        <div
          onClick={handleToggle}
          style={{
            width: "28px",
            height: "28px",
            borderRadius: RAIO.sm,
            border: `1.5px solid ${comprado || naLista || feedback ? "var(--laranja)" : COR.borda}`,
            background: comprado
              ? "var(--laranja)"
              : naLista
                ? "#FE5F0122"
                : feedback
                  ? "#FE5F0122"
                  : "transparent",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            transition: "all 0.2s",
            cursor: onToggle ? "pointer" : "default",
          }}
        >
          {comprado && <Check size={16} color="white" strokeWidth={3} />}
          {naLista && !comprado && <ShoppingCart size={14} color="var(--laranja)" />}
          {!naLista && !comprado && feedback && (
            <Check size={14} color="var(--laranja)" />
          )}
          {!naLista && !comprado && !feedback && onToggle && (
            <Plus size={14} color={COR.borda} />
          )}
        </div>

        <div
          onClick={() => onAbrir && onAbrir(produto)}
          style={{ flex: 1, cursor: onAbrir ? "pointer" : "default" }}
        >
          <p
            style={{
              ...TIPOGRAFIA.nomeProduto,
              textDecoration: comprado ? "line-through" : "none",
              color: comprado
                ? "var(--text-soft)"
                : feedback
                  ? "var(--laranja)"
                  : "var(--text)",
              transition: "color 0.3s",
            }}
          >
            {produto.nome}
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "4px", marginTop: "4px" }}>
            <span
              style={{
                display: "inline-block",
                background: cor + "22",
                color: cor,
                ...TIPOGRAFIA.subcategoria,
                fontWeight: 600,
                padding: "2px 8px",
                borderRadius: RAIO.pill,
              }}
            >
              {produto.subcategoria !== "-"
                ? produto.subcategoria
                : produto.categoria}
            </span>
            {(produto.atributos || []).map((a) => (
              <span
                key={a}
                style={{
                  display: "inline-block",
                  background: "var(--bg)",
                  border: BORDA,
                  color: "var(--text-soft)",
                  ...TIPOGRAFIA.subcategoria,
                  fontWeight: 600,
                  padding: "2px 8px",
                  borderRadius: RAIO.pill,
                }}
              >
                {a}
              </span>
            ))}
          </div>
          {feedback && (
            <p
              style={{
                ...TIPOGRAFIA.label,
                color: "var(--laranja)",
                marginTop: "2px",
              }}
            >
              ✓ Adicionado à lista!
            </p>
          )}
        </div>

        {mostraOpcoes && (
          <div ref={menuRef} style={{ position: "relative", flexShrink: 0 }}>
            <button
              onClick={(e) => { e.stopPropagation(); setMenuAberto((v) => !v); }}
              style={{
                background: "none",
                border: "none",
                padding: "4px",
                cursor: "pointer",
                color: "var(--text-soft)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <MoreVertical size={18} />
            </button>

            {menuAberto && (
              <div
                style={{
                  position: "absolute",
                  right: 0,
                  top: "calc(100% + 4px)",
                  background: "var(--card)",
                  borderRadius: RAIO.sm,
                  boxShadow: "0 4px 20px rgba(0,0,0,0.15)",
                  minWidth: "170px",
                  zIndex: 50,
                  overflow: "hidden",
                }}
              >
                <button
                  onClick={handleRemover}
                  style={{
                    width: "100%",
                    padding: "13px 16px",
                    background: "none",
                    border: "none",
                    textAlign: "left",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    color: COR.erro,
                    fontFamily: "Nunito, sans-serif",
                    fontSize: "14px",
                    fontWeight: 600,
                  }}
                >
                  <Trash2 size={15} />
                  Remover da lista
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default ProdutoItem;
