import { TIPOGRAFIA, FONTE, RAIO, COR } from "../../utils/estilos";

/**
 * Fila de receitas pendentes (aba Receitas, listagem, modo admin): editar,
 * aprovar ou rejeitar. Receita com ingrediente fora do catálogo (nomeTemp)
 * não pode ser aprovada. rodarUmaVez/emAndamento vêm de useAvisoErro (Home).
 */
export default function ReceitasPendentesAdmin({
  pendentes,
  onEditar,
  aprovar,
  rejeitar,
  emAndamento,
  rodarUmaVez,
}) {
  return (
    <div style={{ marginBottom: "24px" }}>
      <p style={{ ...TIPOGRAFIA.label, color: "var(--text-soft)", marginBottom: "10px" }}>
        Pendentes ({pendentes.length})
      </p>
      {pendentes.map((r) => {
        const temIngredienteTemp = r.ingredientes?.some((ing) => ing.nomeTemp);
        const ocupado = emAndamento.includes(r.id);
        return (
          <div
            key={r.id}
            style={{
              opacity: 0.6,
              marginBottom: "8px",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "12px",
                padding: "12px 16px",
                background: "var(--card)",
                borderRadius: RAIO.md,
                boxShadow: "var(--shadow)",
                borderLeft: `4px solid ${COR.neutro}`,
              }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ ...TIPOGRAFIA.nomeProduto, color: "var(--text)" }}>{r.nome}</p>
                {r.origem === "nutreai" && (
                  <p style={{ ...TIPOGRAFIA.subcategoria, color: "var(--text-soft)", marginTop: "2px", overflowWrap: "anywhere" }}>
                    Montada pelo Gemini a partir de "comi…" no nutreai
                    {r.fonte?.url && (
                      <>
                        {" · "}
                        <a href={r.fonte.url} target="_blank" rel="noopener noreferrer" style={{ color: "inherit" }}>
                          fonte{r.fonte.titulo ? ` (${r.fonte.titulo})` : ""}
                        </a>
                      </>
                    )}
                  </p>
                )}
                {temIngredienteTemp && (
                  <p style={{ ...TIPOGRAFIA.subcategoria, color: "var(--laranja)", marginTop: "2px" }}>
                    ⚠ Ingredientes não catalogados
                  </p>
                )}
              </div>
              <div style={{ display: "flex", gap: "6px", flexShrink: 0 }}>
                <button
                  onClick={() => onEditar(r)}
                  style={{
                    padding: "6px 12px",
                    borderRadius: RAIO.sm,
                    border: "none",
                    background: "var(--bg)",
                    color: "var(--text-soft)",
                    fontFamily: "Nunito, sans-serif",
                    fontSize: FONTE.sm,
                    fontWeight: FONTE.bold,
                    cursor: "pointer",
                  }}
                >
                  Editar
                </button>
                <button
                  onClick={() => !temIngredienteTemp && rodarUmaVez(r.id, () => aprovar(r), "Não foi possível aprovar a receita.")}
                  disabled={temIngredienteTemp || ocupado}
                  style={{
                    padding: "6px 12px",
                    borderRadius: RAIO.sm,
                    border: "none",
                    background: temIngredienteTemp ? COR.borda : COR.sucessoBg,
                    color: temIngredienteTemp ? COR.neutro : COR.sucesso,
                    fontFamily: "Nunito, sans-serif",
                    fontSize: FONTE.sm,
                    fontWeight: FONTE.bold,
                    cursor: temIngredienteTemp ? "not-allowed" : ocupado ? "default" : "pointer",
                    opacity: temIngredienteTemp || ocupado ? 0.6 : 1,
                  }}
                >
                  Aprovar
                </button>
                <button
                  onClick={() => rodarUmaVez(r.id, () => rejeitar(r), "Não foi possível rejeitar a receita.")}
                  disabled={ocupado}
                  style={{
                    padding: "6px 12px",
                    borderRadius: RAIO.sm,
                    border: "none",
                    background: COR.erroBg,
                    color: COR.erro,
                    fontFamily: "Nunito, sans-serif",
                    fontSize: FONTE.sm,
                    fontWeight: FONTE.bold,
                    cursor: ocupado ? "default" : "pointer",
                    opacity: ocupado ? 0.6 : 1,
                  }}
                >
                  Rejeitar
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
