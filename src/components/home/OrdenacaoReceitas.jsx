import { Check } from "lucide-react";
import Folha from "../Folha";
import { TIPOGRAFIA, RAIO } from "../../utils/estilos";

const OPCOES = [
  { id: "relevancia", label: "Relevância", descricao: "Receitas com mais ingredientes em casa primeiro" },
  { id: "az", label: "A → Z", descricao: "Ordem alfabética crescente" },
  { id: "za", label: "Z → A", descricao: "Ordem alfabética decrescente" },
];

// Folha "Ordenar" da listagem de receitas. Escolher uma opção já fecha a folha.
export default function OrdenacaoReceitas({ ordenacao, onEscolher, onFechar }) {
  return (
    <Folha onFechar={onFechar} titulo="Ordenar">
      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        {OPCOES.map(op => (
          <div
            key={op.id}
            onClick={() => { onEscolher(op.id); onFechar(); }}
            style={{
              display: "flex", alignItems: "center", gap: "12px",
              padding: "14px 16px", borderRadius: RAIO.md,
              background: ordenacao === op.id ? "var(--amarelo-suave)" : "var(--bg)",
              border: `1.5px solid ${ordenacao === op.id ? "var(--amarelo)" : "transparent"}`,
              cursor: "pointer",
            }}
          >
            <div style={{ flex: 1 }}>
              <p style={{ ...TIPOGRAFIA.nomeProduto, color: "var(--text)" }}>{op.label}</p>
              <p style={{ ...TIPOGRAFIA.subcategoria, color: "var(--text-soft)", marginTop: "2px" }}>{op.descricao}</p>
            </div>
            {ordenacao === op.id && <Check size={16} color="var(--laranja)" strokeWidth={3} />}
          </div>
        ))}
      </div>
    </Folha>
  );
}
