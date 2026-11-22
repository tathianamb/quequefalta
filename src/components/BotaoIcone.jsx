// Botão só de ícone com área de toque de 40x40. O rótulo vira aria-label e
// title (leitor de tela e dica ao passar o mouse). `style` permite margens
// negativas onde o layout em volta não pode crescer; `children` entra depois
// do ícone (ex.: bolinha de "não lido", posicionada em absolute).
function BotaoIcone({ icone: Icone, rotulo, tamanho = 20, cor = "var(--text-soft)", style, children, ...resto }) {
  return (
    <button
      type="button"
      aria-label={rotulo}
      title={rotulo}
      {...resto}
      style={{
        position: "relative",
        width: "40px",
        height: "40px",
        flexShrink: 0,
        padding: 0,
        border: "none",
        background: "transparent",
        color: cor,
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        ...style,
      }}
    >
      <Icone size={tamanho} color={cor} aria-hidden="true" />
      {children}
    </button>
  );
}

export default BotaoIcone;
