import { ShoppingCart, BookOpen, ChefHat, Lightbulb } from "lucide-react";
import { TIPOGRAFIA, FONTE, RAIO, COR } from "../../utils/estilos";

// Navegação inferior das quatro abas. Os selos contam o que está pendente de
// moderação (só no modo admin; a Home passa 0 fora dele).
export default function NavInferior({ aba, onTrocarAba, pendentesCatalogo, pendentesReceitas }) {
  return (
    <div
      style={{
        position: "fixed",
        bottom: 0,
        left: "50%",
        transform: "translateX(-50%)",
        width: "100%",
        maxWidth: "480px",
        background: "var(--card)",
        borderTop: `1px solid ${COR.divisoria}`,
        display: "flex",
        zIndex: 20,
      }}
    >
      {[
        { id: "lista", label: "Lista", icon: ShoppingCart, badge: 0 },
        { id: "catalogo", label: "Catálogo", icon: BookOpen, badge: pendentesCatalogo },
        { id: "receitas", label: "Receitas", icon: ChefHat, badge: pendentesReceitas },
        { id: "dicas", label: "Dicas", icon: Lightbulb, badge: 0 },
      ].map(({ id, label, icon: Icon, badge }) => (
        <button
          key={id}
          aria-current={aba === id ? "page" : undefined}
          onClick={() => onTrocarAba(id)}
          style={{
            flex: 1,
            padding: "12px 0",
            border: "none",
            background: "transparent",
            cursor: "pointer",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "4px",
            color: aba === id ? "var(--laranja)" : "var(--text-soft)",
            fontFamily: "Nunito, sans-serif",
            ...(aba === id ? TIPOGRAFIA.aba : TIPOGRAFIA.abaInativa),
            transition: "all 0.2s",
            borderTop:
              aba === id ? "2px solid var(--amarelo)" : "2px solid transparent",
          }}
        >
          <div style={{ position: "relative" }}>
            <Icon size={20} />
            {badge > 0 && (
              <div style={{
                position: "absolute",
                top: "-6px",
                right: "-8px",
                background: "var(--amarelo)",
                color: COR.textoSobreDestaque,
                borderRadius: RAIO.full,
                width: "16px",
                height: "16px",
                fontSize: FONTE.xs,
                fontWeight: FONTE.extrabold,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}>
                {badge}
              </div>
            )}
          </div>
          {label}
        </button>
      ))}
    </div>
  );
}
