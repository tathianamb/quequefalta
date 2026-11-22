import { TIPOGRAFIA, RAIO } from "../../utils/estilos";

// Linha de ação do menu principal: ícone, rótulo e, opcionalmente, algo extra
// (selo, interruptor) e a seta "›". Sem `onClick` a linha não é clicável.
function ItemMenu({
  icone: Icone,
  corIcone = "var(--text-soft)",
  corTexto = "var(--text)",
  onClick,
  seta = false,
  extra,
  style,
  children,
}) {
  return (
    <div
      onClick={onClick}
      style={{
        display: "flex",
        alignItems: "center",
        gap: "12px",
        padding: "14px 16px",
        background: "var(--bg)",
        borderRadius: RAIO.md,
        ...(onClick ? { cursor: "pointer" } : {}),
        ...style,
      }}
    >
      <Icone size={18} color={corIcone} />
      <span style={{ ...TIPOGRAFIA.nomeProduto, color: corTexto, flex: 1 }}>
        {children}
      </span>
      {extra}
      {seta && <span style={{ color: "var(--text-soft)" }}>›</span>}
    </div>
  );
}

export default ItemMenu;
