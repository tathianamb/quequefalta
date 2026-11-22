import { TIPOGRAFIA, RAIO, COR } from "../../utils/estilos";

// Aviso flutuante de gravação que falhou, acima da navegação inferior.
export default function AvisoErro({ mensagem }) {
  return (
    <div
      role="alert"
      style={{
        position: "fixed",
        bottom: "80px",
        left: "50%",
        transform: "translateX(-50%)",
        width: "calc(100% - 32px)",
        maxWidth: "448px",
        padding: "10px 14px",
        borderRadius: RAIO.md,
        background: COR.erroBg,
        color: COR.erro,
        boxShadow: "var(--shadow)",
        ...TIPOGRAFIA.subcategoria,
        textAlign: "center",
        zIndex: 300,
      }}
    >
      {mensagem}
    </div>
  );
}
