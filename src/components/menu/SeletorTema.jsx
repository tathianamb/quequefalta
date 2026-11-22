import { Moon } from "lucide-react";
import { TIPOGRAFIA, RAIO, BOTAO_SECUNDARIO, COR } from "../../utils/estilos";

// Cartão "Tema" do menu: Claro / Escuro / Auto.
function SeletorTema({ escuro, temaPreferencia, toggleTema, seguirSistema }) {
  return (
    <div
      style={{
        padding: "14px 16px",
        background: "var(--bg)",
        borderRadius: RAIO.md,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          marginBottom: "12px",
        }}
      >
        <Moon size={18} color="var(--text-soft)" />
        <span
          style={{
            ...TIPOGRAFIA.nomeProduto,
            color: "var(--text)",
          }}
        >
          Tema
        </span>
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr 1fr",
          gap: "8px",
        }}
      >
        {[
          { id: "claro", label: "☀️ Claro" },
          { id: "escuro", label: "🌙 Escuro" },
          { id: "auto", label: "⚙️ Auto" },
        ].map(({ id, label }) => {
          const ativo = temaPreferencia === id;
          return (
            <button
              key={id}
              onClick={() => {
                if (id === "auto") seguirSistema();
                else if (id === "escuro" && !escuro) toggleTema();
                else if (id === "claro" && escuro) toggleTema();
              }}
              style={{
                padding: "10px 8px",
                ...BOTAO_SECUNDARIO,
                borderRadius: RAIO.sm,
                border: `1.5px solid ${ativo ? "var(--laranja)" : COR.borda}`,
                background: ativo ? "var(--laranja-suave)" : "var(--card)",
                color: ativo ? "var(--laranja)" : "var(--text-soft)",
                transition: "all 0.2s",
              }}
            >
              {label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default SeletorTema;

