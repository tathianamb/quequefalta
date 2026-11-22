import { useEffect, useId, useRef } from "react";
import { X } from "lucide-react";
import BotaoIcone from "./BotaoIcone";
import { useTeclaEsc } from "../hooks/useTeclaEsc";
import { TIPOGRAFIA, RAIO, COR } from "../utils/estilos";

// Folha inferior padrão (bottom sheet): fundo que fecha ao toque, painel de
// até 480px, cabeçalho com título e X, corpo rolável e rodapé fixo opcional.
//
// `onFechar` deve ser o callback que já cuida da pilha do voltar (fechar +
// descartar); a folha nunca fecha por conta própria. `onEsc` troca só o que o
// Esc faz (ex.: o Menu volta uma tela em vez de fechar).
//
// - titulo / subtitulo: cabeçalho padrão. Sem `titulo`, passe `rotulo` (nome
//   acessível) e, se quiser, `cabecalho` com um cabeçalho próprio.
// - rodape: botões fixos abaixo do corpo.
// - corpoStyle: ajusta o corpo (ex.: padding próprio).
function Folha({ onFechar, onEsc, titulo, subtitulo, rotulo, cabecalho, rodape, corpoStyle, children }) {
  const idTitulo = useId();
  const painelRef = useRef(null);

  useTeclaEsc(onEsc ?? onFechar);

  // Foco no painel ao abrir (sem roubar o de um campo que já tenha autoFocus)
  // e de volta a quem o tinha ao fechar.
  useEffect(() => {
    const anterior = document.activeElement;
    const painel = painelRef.current;
    if (painel && !painel.contains(document.activeElement)) painel.focus({ preventScroll: true });
    return () => {
      if (anterior instanceof HTMLElement && document.contains(anterior)) {
        anterior.focus({ preventScroll: true });
      }
    };
  }, []);

  return (
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
      onClick={onFechar}
    >
      <div
        ref={painelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titulo ? idTitulo : undefined}
        aria-label={titulo ? undefined : rotulo}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "var(--card)",
          borderRadius: `${RAIO.xxl} ${RAIO.xxl} 0 0`,
          maxHeight: "90vh",
          display: "flex",
          flexDirection: "column",
          width: "100%",
          maxWidth: "480px",
          margin: "0 auto",
          outline: "none",
        }}
      >
        {cabecalho ??
          (titulo && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "16px 20px",
                flexShrink: 0,
                borderBottom: `1px solid ${COR.divisoria}`,
              }}
            >
              <div>
                <h2 id={idTitulo} style={{ ...TIPOGRAFIA.h2, color: "var(--text)" }}>
                  {titulo}
                </h2>
                {subtitulo && (
                  <p style={{ ...TIPOGRAFIA.subcategoria, color: "var(--text-soft)", marginTop: "2px" }}>
                    {subtitulo}
                  </p>
                )}
              </div>
              <BotaoIcone icone={X} rotulo="Fechar" onClick={onFechar} style={{ marginRight: "-10px" }} />
            </div>
          ))}

        <div
          style={{
            padding: rodape ? "16px 20px" : "16px 20px calc(16px + env(safe-area-inset-bottom))",
            overflowY: "auto",
            flex: 1,
            minHeight: 0,
            ...corpoStyle,
          }}
        >
          {children}
        </div>

        {rodape && (
          <div
            style={{
              padding: "16px 20px calc(16px + env(safe-area-inset-bottom))",
              borderTop: `1px solid ${COR.divisoria}`,
              flexShrink: 0,
              background: "var(--card)",
            }}
          >
            {rodape}
          </div>
        )}
      </div>
    </div>
  );
}

export default Folha;
