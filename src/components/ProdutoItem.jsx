import { Check, Home, Plus, ShoppingCart, Trash2, MoreVertical } from "lucide-react";
import BotaoIcone from "./BotaoIcone";
import { corDaCategoria } from "../utils/categorias";
import { memo, useState, useRef, useEffect } from "react";
import { TIPOGRAFIA, RAIO, COR } from '../utils/estilos'
import CaixaMarcacao from "./CaixaMarcacao";

// Caixa de lista (à esquerda) e botão "tem em casa" (à direita): ver CaixaMarcacao.
const TAMANHO_ICONE = 14;

// Texto das etiquetas: a cor da categoria misturada com preto (claro) ou branco
// (escuro, --mistura-tag) para ler bem sobre o fundo da mesma cor a 13%.
const corTextoTag = (cor) => `color-mix(in srgb, ${cor} 50%, var(--mistura-tag))`;

function ProdutoItem({
  produto,
  onToggle,
  onEmCasa,
  onAbrir,
  naLista,
  comprado,
  emCasa,
  onRemover,
  contexto,
  onFiltrarGrupo,
  detalhe, // texto curto opcional sob as tags (ex: preço no agrupamento por mercado)
}) {
  const cor = corDaCategoria(produto.categoria);
  const [feedback, setFeedback] = useState(false); // false | "lista" | "casa"
  const [menuAberto, setMenuAberto] = useState(false);
  const menuRef = useRef(null);
  // Evita dois cliques seguidos gravarem duas vezes antes do snapshot voltar.
  const gravandoRef = useRef(false);

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

  // Os timers ficam em ref para serem limpos antes de agendar outro e ao desmontar.
  const feedbackTimerRef = useRef(null);
  const gravandoTimerRef = useRef(null);
  useEffect(
    () => () => {
      clearTimeout(feedbackTimerRef.current);
      clearTimeout(gravandoTimerRef.current);
    },
    [],
  );

  const mostrarFeedback = (tipo) => {
    setFeedback(tipo);
    clearTimeout(feedbackTimerRef.current);
    feedbackTimerRef.current = setTimeout(() => setFeedback(false), 1500);
  };

  // As escritas do useLista são síncronas para quem chama (a gravação segue em
  // segundo plano), então o feedback aparece na hora, mesmo sem sinal.
  const handleEmCasa = (e) => {
    e.stopPropagation();
    if (gravandoRef.current) return;
    gravandoRef.current = true;
    // Trava curta: dá tempo de o snapshot local refletir a troca antes de aceitar
    // outro toque (que inverteria de novo).
    gravandoTimerRef.current = setTimeout(() => { gravandoRef.current = false; }, 600);
    const ficouEmCasa = onEmCasa(produto);
    mostrarFeedback(ficouEmCasa ? "casa" : "tirado");
  };

  const handleToggle = () => {
    if (!onToggle) return;
    if (contexto === "lista") {
      onToggle(produto);
      return;
    }

    if (naLista) {
      onRemover && onRemover(produto);
      return;
    }

    const adicionado = onToggle(produto);
    if (adicionado !== false) mostrarFeedback("lista");
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
          background: feedback ? "color-mix(in srgb, var(--laranja) 8%, var(--card))" : "var(--card)",
          borderRadius: RAIO.md,
          boxShadow: "var(--shadow)",
          borderLeft: `4px solid ${feedback ? "var(--laranja)" : comprado ? COR.neutro : cor}`,
          transition: "background 0.3s",
          position: "relative",
        }}
      >
        <CaixaMarcacao
          marcado={comprado}
          destaque={!comprado && (naLista || feedback)}
          onClick={onToggle ? handleToggle : undefined}
          rotulo={
            contexto === "lista"
              ? comprado ? "Desmarcar como comprado" : "Marcar como comprado"
              : naLista ? "Tirar da lista de compras" : "Adicionar à lista de compras"
          }
        >
          {comprado && <Check size={TAMANHO_ICONE} color="white" strokeWidth={3} />}
          {emCasa && !comprado && <Check size={TAMANHO_ICONE} color="var(--laranja)" />}
          {naLista && !emCasa && !comprado && <ShoppingCart size={TAMANHO_ICONE} color="var(--laranja)" />}
          {!naLista && !comprado && feedback && (
            <Check size={TAMANHO_ICONE} color="var(--laranja)" />
          )}
          {!naLista && !comprado && !feedback && onToggle && (
            <Plus size={TAMANHO_ICONE} color={COR.borda} />
          )}
        </CaixaMarcacao>

        <div
          onClick={() => onAbrir && onAbrir(produto)}
          style={{ flex: 1, minWidth: 0, cursor: onAbrir ? "pointer" : "default" }}
        >
          <p
            style={{
              ...TIPOGRAFIA.nomeProduto,
              overflowWrap: "anywhere",
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
            {produto.marcaPreferida && (
              <span style={{ fontWeight: 400, color: "var(--text-soft)" }}> · {produto.marcaPreferida}</span>
            )}
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "4px", marginTop: "4px" }}>
            <span
              onClick={onFiltrarGrupo && produto.subcategoria && produto.subcategoria !== "-"
                ? (e) => { e.stopPropagation(); onFiltrarGrupo(produto.subcategoria); }
                : undefined}
              style={{
                display: "inline-block",
                background: cor + "22",
                color: corTextoTag(cor),
                opacity: comprado ? 0.7 : 1,
                ...TIPOGRAFIA.subcategoria,
                fontWeight: 600,
                padding: "2px 8px",
                borderRadius: RAIO.pill,
                cursor: onFiltrarGrupo && produto.subcategoria && produto.subcategoria !== "-" ? "pointer" : "default",
              }}
            >
              {produto.subcategoria !== "-"
                ? produto.subcategoria
                : produto.categoria}
            </span>
            {(produto.grupoSubstituicao || []).map((g) => (
              <span
                key={g}
                onClick={onFiltrarGrupo ? (e) => { e.stopPropagation(); onFiltrarGrupo(g); } : undefined}
                style={{
                  display: "inline-block",
                  background: cor + "22",
                  color: corTextoTag(cor),
                  opacity: comprado ? 0.7 : 1,
                  ...TIPOGRAFIA.subcategoria,
                  fontWeight: 600,
                  padding: "2px 8px",
                  borderRadius: RAIO.pill,
                  cursor: onFiltrarGrupo ? "pointer" : "default",
                }}
              >
                {g}
              </span>
            ))}
          </div>
          {detalhe && (
            <p style={{ ...TIPOGRAFIA.subcategoria, color: "var(--text-soft)", marginTop: "4px" }}>
              {detalhe}
            </p>
          )}
          {feedback && (
            <p
              style={{
                ...TIPOGRAFIA.label,
                color: "var(--laranja)",
                marginTop: "2px",
              }}
            >
              {feedback === "casa"
                ? "✓ Marcado como tem em casa!"
                : feedback === "tirado"
                  ? "Voltou para a lista de compras"
                  : "✓ Adicionado à lista!"}
            </p>
          )}
        </div>

        {onEmCasa && (
          <CaixaMarcacao
            marcado={!!emCasa}
            onClick={handleEmCasa}
            icone={Home}
            rotulo={emCasa ? "Tirar de tem em casa" : "Marcar como tem em casa"}
          />
        )}

        {mostraOpcoes && (
          <div ref={menuRef} style={{ position: "relative", flexShrink: 0 }}>
            <BotaoIcone
              icone={MoreVertical}
              tamanho={18}
              rotulo="Mais opções"
              aria-expanded={menuAberto}
              onClick={(e) => { e.stopPropagation(); setMenuAberto((v) => !v); }}
              style={{ margin: "-7px -3px" }}
            />

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

export default memo(ProdutoItem);
