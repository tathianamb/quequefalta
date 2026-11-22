import { RAIO, COR } from "../utils/estilos";

const TAMANHO = "28px";
const TAMANHO_ICONE = 14;

// Quadrado de marcar / "tem em casa", o mesmo em todo o app: 28px, borda de
// 1.5px, cheio na cor quando marcado. A área de toque vai 8px além do visual
// (o span absoluto), sem mudar o tamanho desenhado.
// - icone: ícone Lucide mostrado dentro (branco quando marcado).
// - children: conteúdo próprio no lugar do ícone (estados que o ícone não cobre).
// - destaque: aparência "na lista" (borda e fundo suave na cor) sem estar marcado.
function CaixaMarcacao({
  marcado,
  onClick,
  icone: Icone,
  corMarcado = "var(--laranja)",
  rotulo,
  destaque = false,
  children,
}) {
  const ativo = marcado || destaque;
  return (
    <button
      type="button"
      aria-pressed={!!marcado}
      aria-label={rotulo}
      onClick={onClick}
      style={{
        position: "relative",
        width: TAMANHO,
        height: TAMANHO,
        flexShrink: 0,
        borderRadius: RAIO.sm,
        border: `1.5px solid ${ativo ? corMarcado : COR.borda}`,
        background: marcado
          ? corMarcado
          : destaque
            ? "color-mix(in srgb, " + corMarcado + " 13%, transparent)"
            : "transparent",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: onClick ? "pointer" : "default",
        padding: 0,
        transition: "all 0.2s",
      }}
    >
      <span aria-hidden="true" style={{ position: "absolute", inset: "-8px" }} />
      {children ??
        (Icone && (
          <Icone
            size={TAMANHO_ICONE}
            color={marcado ? "white" : "var(--text-soft)"}
          />
        ))}
    </button>
  );
}

export default CaixaMarcacao;
