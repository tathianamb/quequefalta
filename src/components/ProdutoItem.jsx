import { Check, Plus, ShoppingCart, Trash2 } from "lucide-react";
import { corDaCategoria } from "../utils/categorias";
import { useState, useRef } from "react";
import { TIPOGRAFIA, RAIO, BOTAO_PRIMARIO, BOTAO_SECUNDARIO } from '../utils/estilos'

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
  const [swipeX, setSwipeX] = useState(0);
  const [swipando, setSwipando] = useState(false);
  const startX = useRef(0);
  const threshold = 80;

  const handleToggle = async () => {
    if (!onToggle) return;

    if (contexto === "lista") {
      await onToggle(produto);
      return;
    }

    // contexto === 'catalogo'
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

  const podeSwipe = typeof onRemover === "function" && contexto !== "catalogo";

  const onTouchStart = (e) => {
    if (!podeSwipe) return;
    startX.current = e.touches[0].clientX;
    setSwipando(true);
  };

  const onTouchMove = (e) => {
    if (!swipando || !podeSwipe) return;
    const diff = e.touches[0].clientX - startX.current;
    const novoX = swipeX + diff;
    if (novoX <= 0) setSwipeX(Math.max(novoX, -threshold));
    startX.current = e.touches[0].clientX;
  };

  const onTouchEnd = () => {
    if (!podeSwipe) return;
    setSwipando(false);
    if (swipeX < -threshold / 2) {
      setSwipeX(-threshold);
    } else {
      setSwipeX(0);
    }
  };
  const handleRemover = () => {
    setSwipeX(0);
    onRemover && onRemover(produto);
  };

  return (
    <div
      style={{
        position: "relative",
        marginBottom: "8px",
        borderRadius: "12px",
        overflow: "hidden",
        isolation: "isolate",
      }}
    >
      {/* Fundo vermelho com lixeira */}
      {podeSwipe && swipeX < 0 && (
        <div
          style={{
            position: "absolute",
            right: 0,
            top: 0,
            bottom: 0,
            width: `${threshold}px`,
            background: "#FA5252",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            borderRadius: "0 12px 12px 0",
            cursor: "pointer",
          }}
          onClick={handleRemover}
        >
          <Trash2 size={20} color="white" />
        </div>
      )}

      {/* Card deslizável */}
      <div
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        style={{
          display: "flex",
          alignItems: "center",
          gap: "12px",
          padding: "14px 16px",
          background: feedback ? "var(--laranja)11" : "var(--card)",
          borderRadius: "12px",
          boxShadow: "var(--shadow)",
          borderLeft: `4px solid ${feedback ? "var(--laranja)" : comprado ? "var(--laranja)" : cor}`,
          opacity: comprado ? 0.4 : 1,
          transform: `translateX(${swipeX}px)`,
          transition: swipando
            ? "none"
            : "transform 0.3s ease, background 0.3s, opacity 0.2s",
          cursor: "grab",
          userSelect: "none",
          position: "relative",
          zIndex: 1,
        }}
      >
        <div
          onClick={handleToggle}
          style={{
            width: "28px",
            height: "28px",
            borderRadius: "8px",
            border: `2px solid ${comprado || naLista || feedback ? "var(--laranja)" : "#DEE2E6"}`,
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
            cursor: onToggle && !naLista ? "pointer" : "default",
          }}
        >
          {comprado && <Check size={16} color="white" strokeWidth={3} />}
          {naLista && !comprado && <ShoppingCart size={14} color="var(--laranja)" />}
          {!naLista && !comprado && feedback && (
            <Check size={14} color="var(--laranja)" />
          )}
          {!naLista && !comprado && !feedback && onToggle && (
            <Plus size={14} color="#DEE2E6" />
          )}
        </div>

        <div
          onClick={() => swipeX === 0 && onAbrir && onAbrir(produto)}
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
          <p style={{ ...TIPOGRAFIA.subcategoria, color: "var(--text-soft)" }}>
            {produto.subcategoria !== "-"
              ? produto.subcategoria
              : produto.categoria}
          </p>
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
      </div>
    </div>
  );
}

export default ProdutoItem;
