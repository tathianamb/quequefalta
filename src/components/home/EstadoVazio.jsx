import { TIPOGRAFIA } from "../../utils/estilos";

// Tela vazia das abas Lista e Catálogo: emoji, título, texto opcional e, como
// children, o botão de ação (cada uso tem o seu estilo).
export default function EstadoVazio({ emoji, titulo, texto, children }) {
  return (
    <div
      style={{
        textAlign: "center",
        marginTop: "60px",
        padding: "0 20px",
      }}
    >
      <p style={{ fontSize: "48px" }}>{emoji}</p>
      <p
        style={{
          ...TIPOGRAFIA.h2,
          marginTop: "12px",
          color: "var(--text)",
        }}
      >
        {titulo}
      </p>
      {texto && (
        <p
          style={{
            ...TIPOGRAFIA.corpo,
            color: "var(--text-soft)",
            marginTop: "8px",
            lineHeight: 1.5,
          }}
        >
          {texto}
        </p>
      )}
      {children}
    </div>
  );
}
