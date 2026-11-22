import { useEffect, useId, useRef } from "react";
import { useTeclaEsc } from "../hooks/useTeclaEsc";
import { TIPOGRAFIA, RAIO, COR, BOTAO_PRIMARIO, BOTAO_SECUNDARIO } from "../utils/estilos";

// Diálogo central de confirmação. Cancelar à esquerda, confirmar à direita;
// `destrutiva` pinta o confirmar de vermelho. Esc cancela. O foco começa no
// cancelar, para um Enter sem querer não confirmar a ação.
function Confirmacao({
  icone,
  titulo,
  children,
  confirmar = "Confirmar",
  cancelar = "Cancelar",
  destrutiva = false,
  aoConfirmar,
  aoCancelar,
}) {
  const idTitulo = useId();
  const idTexto = useId();
  const cancelarRef = useRef(null);

  useTeclaEsc(aoCancelar);

  useEffect(() => {
    const anterior = document.activeElement;
    cancelarRef.current?.focus({ preventScroll: true });
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
        zIndex: 250,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(0,0,0,0.5)",
        padding: "20px",
      }}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={idTitulo}
        aria-describedby={children ? idTexto : undefined}
        style={{
          background: "var(--card)",
          borderRadius: RAIO.xxl,
          padding: "28px 24px",
          width: "100%",
          maxWidth: "320px",
          textAlign: "center",
        }}
      >
        {icone && <p style={{ fontSize: "36px", marginBottom: "12px" }}>{icone}</p>}
        <h2 id={idTitulo} style={{ ...TIPOGRAFIA.h2, color: "var(--text)", marginBottom: "8px" }}>
          {titulo}
        </h2>
        {children && (
          <p
            id={idTexto}
            style={{ ...TIPOGRAFIA.corpo, color: "var(--text-soft)", marginBottom: "24px", lineHeight: 1.5 }}
          >
            {children}
          </p>
        )}
        <div style={{ display: "flex", gap: "12px", marginTop: children ? 0 : "24px" }}>
          <button
            ref={cancelarRef}
            type="button"
            onClick={aoCancelar}
            style={{ flex: 1, padding: "14px", ...BOTAO_SECUNDARIO, fontSize: "15px" }}
          >
            {cancelar}
          </button>
          <button
            type="button"
            onClick={aoConfirmar}
            style={{
              flex: 1,
              padding: "14px",
              ...BOTAO_PRIMARIO,
              ...(destrutiva ? { background: COR.erro, color: "#fff" } : {}),
            }}
          >
            {confirmar}
          </button>
        </div>
      </div>
    </div>
  );
}

export default Confirmacao;
