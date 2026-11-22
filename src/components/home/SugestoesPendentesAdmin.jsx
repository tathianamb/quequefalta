import { useState } from "react";
import { ORDEM_CATEGORIAS } from "../../utils/categorias";
import { normalizar } from "../../utils/texto";
import { TIPOGRAFIA, FONTE, RAIO, COR } from "../../utils/estilos";

/**
 * Fila de sugestões de produto pendentes (aba Catálogo, modo admin): editar
 * nome/categoria/subcategoria, aprovar ou rejeitar. O estado da edição fica
 * aqui; rodarUmaVez/emAndamento/avisarErro vêm de useAvisoErro (Home).
 */
export default function SugestoesPendentesAdmin({
  pendentes,
  catalogo,
  aprovar,
  rejeitar,
  atualizar,
  emAndamento,
  rodarUmaVez,
  avisarErro,
}) {
  const [sugestaoEditando, setSugestaoEditando] = useState(null); // { id, nome, categoria, subcategoria }
  const [sugestaoNomeFoco, setSugestaoNomeFoco] = useState(false);

  return (
    <div style={{ marginBottom: "24px" }}>
      <p style={{ ...TIPOGRAFIA.label, color: "var(--text-soft)", marginBottom: "10px" }}>
        Pendentes ({pendentes.length})
      </p>
      {pendentes.map((s) => {
        const editando = sugestaoEditando?.id === s.id;
        const ocupado = emAndamento.includes(s.id);
        return (
          <div
            key={s.id}
            style={{
              opacity: editando ? 1 : 0.5,
              marginBottom: "8px",
            }}
          >
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "10px",
                padding: "12px 16px",
                background: "var(--card)",
                borderRadius: RAIO.md,
                boxShadow: "var(--shadow)",
                borderLeft: `4px solid ${editando ? "var(--laranja)" : COR.neutro}`,
              }}
            >
              {editando ? (
                <>
                  {(() => {
                    const termo = normalizar(sugestaoEditando.nome);
                    const sugestoes = termo.length >= 2
                      ? catalogo.filter(p => normalizar(p.nome).includes(termo)).slice(0, 6)
                      : [];
                    const mostrarDropdown = sugestaoNomeFoco && sugestoes.length > 0;
                    return (
                      <div style={{ position: "relative" }}>
                        <input
                          value={sugestaoEditando.nome}
                          onChange={e => setSugestaoEditando(prev => ({ ...prev, nome: e.target.value }))}
                          onFocus={() => setSugestaoNomeFoco(true)}
                          onBlur={() => setTimeout(() => setSugestaoNomeFoco(false), 150)}
                          placeholder="Nome *"
                          style={{
                            padding: "8px 12px", borderRadius: RAIO.sm,
                            border: "1.5px solid var(--borda, #DEE2E6)",
                            background: "var(--bg)", color: "var(--text)",
                            fontFamily: "Nunito, sans-serif", fontSize: FONTE.campo,
                            width: "100%", boxSizing: "border-box",
                          }}
                        />
                        {mostrarDropdown && (
                          <div style={{
                            position: "absolute", top: "100%", left: 0, right: 0, zIndex: 20,
                            background: "var(--card)", borderRadius: RAIO.md,
                            border: "1.5px solid var(--borda, #DEE2E6)",
                            boxShadow: "0 4px 16px rgba(0,0,0,0.1)",
                            marginTop: "2px", overflow: "hidden",
                          }}>
                            {sugestoes.map(p => (
                              <div
                                key={p.id}
                                onMouseDown={() => setSugestaoEditando(prev => ({
                                  ...prev,
                                  nome: p.nome,
                                  categoria: p.categoria ?? prev.categoria,
                                  subcategoria: p.subcategoria ?? prev.subcategoria,
                                }))}
                                style={{
                                  padding: "10px 14px", cursor: "pointer",
                                  borderBottom: "1px solid var(--borda, #DEE2E6)",
                                  fontFamily: "Nunito, sans-serif",
                                }}
                              >
                                <p style={{ fontSize: FONTE.sm, color: "var(--text)", margin: 0 }}>{p.nome}</p>
                                <p style={{ fontSize: FONTE.xs, color: "var(--text-soft)", margin: "2px 0 0" }}>
                                  {p.categoria}{p.subcategoria ? ` · ${p.subcategoria}` : ""} · já no catálogo
                                </p>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })()}
                  <select
                    value={sugestaoEditando.categoria}
                    onChange={e => setSugestaoEditando(prev => ({ ...prev, categoria: e.target.value, subcategoria: "" }))}
                    style={{
                      padding: "8px 12px", borderRadius: RAIO.sm,
                      border: "1.5px solid var(--borda, #DEE2E6)",
                      background: "var(--bg)", color: sugestaoEditando.categoria ? "var(--text)" : "var(--text-soft)",
                      fontFamily: "Nunito, sans-serif", fontSize: FONTE.campo,
                      width: "100%", boxSizing: "border-box",
                    }}
                  >
                    <option value="">Categoria *</option>
                    {[...ORDEM_CATEGORIAS].sort((a, b) => a.localeCompare(b, "pt-BR")).map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                  {(() => {
                    const subcats = [...new Set(
                      catalogo
                        .filter(p => p.categoria === sugestaoEditando.categoria && p.subcategoria)
                        .map(p => p.subcategoria)
                    )].sort((a, b) => a.localeCompare(b, "pt-BR"));
                    return (
                      <select
                        value={sugestaoEditando.subcategoria}
                        onChange={e => setSugestaoEditando(prev => ({ ...prev, subcategoria: e.target.value }))}
                        disabled={!sugestaoEditando.categoria}
                        style={{
                          padding: "8px 12px", borderRadius: RAIO.sm,
                          border: "1.5px solid var(--borda, #DEE2E6)",
                          background: "var(--bg)", color: sugestaoEditando.subcategoria ? "var(--text)" : "var(--text-soft)",
                          fontFamily: "Nunito, sans-serif", fontSize: FONTE.campo,
                          width: "100%", boxSizing: "border-box",
                          opacity: !sugestaoEditando.categoria ? 0.5 : 1,
                        }}
                      >
                        <option value="">Subcategoria *</option>
                        {subcats.map(sc => (
                          <option key={sc} value={sc}>{sc}</option>
                        ))}
                      </select>
                    );
                  })()}
                  <div style={{ display: "flex", gap: "6px", justifyContent: "flex-end" }}>
                    <button
                      onClick={() => setSugestaoEditando(null)}
                      style={{
                        padding: "6px 12px", borderRadius: RAIO.sm, border: "none",
                        background: "var(--bg)", color: "var(--text-soft)",
                        fontFamily: "Nunito, sans-serif", fontSize: FONTE.sm,
                        fontWeight: FONTE.bold, cursor: "pointer",
                      }}
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={() => {
                        atualizar(s, {
                          nome: sugestaoEditando.nome.trim(),
                          categoria: sugestaoEditando.categoria,
                          subcategoria: sugestaoEditando.subcategoria,
                        }).catch((e) => avisarErro("Não foi possível salvar a sugestão.", e));
                        setSugestaoEditando(null);
                      }}
                      disabled={!sugestaoEditando.nome.trim() || !sugestaoEditando.categoria || !sugestaoEditando.subcategoria}
                      style={{
                        padding: "6px 12px", borderRadius: RAIO.sm, border: "none",
                        background: COR.sucessoBg, color: COR.sucesso,
                        fontFamily: "Nunito, sans-serif", fontSize: FONTE.sm,
                        fontWeight: FONTE.bold, cursor: "pointer",
                        opacity: (!sugestaoEditando.nome.trim() || !sugestaoEditando.categoria || !sugestaoEditando.subcategoria) ? 0.5 : 1,
                      }}
                    >
                      Salvar
                    </button>
                  </div>
                </>
              ) : (
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ ...TIPOGRAFIA.nomeProduto, color: "var(--text)" }}>{s.nome}</p>
                    <p style={{ ...TIPOGRAFIA.subcategoria, color: "var(--text-soft)", marginTop: "2px" }}>
                      {s.categoria}{s.subcategoria ? ` · ${s.subcategoria}` : ""}
                    </p>
                  </div>
                  <div style={{ display: "flex", gap: "6px", flexShrink: 0 }}>
                    <button
                      onClick={() => setSugestaoEditando({ id: s.id, nome: s.nome, categoria: s.categoria ?? "", subcategoria: s.subcategoria ?? "" })}
                      style={{
                        padding: "6px 12px", borderRadius: RAIO.sm, border: "none",
                        background: "var(--bg)", color: "var(--text-soft)",
                        fontFamily: "Nunito, sans-serif", fontSize: FONTE.sm,
                        fontWeight: FONTE.bold, cursor: "pointer",
                      }}
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => s.categoria && rodarUmaVez(s.id, () => aprovar(s), "Não foi possível aprovar a sugestão.")}
                      disabled={!s.categoria || ocupado}
                      style={{
                        padding: "6px 12px", borderRadius: RAIO.sm, border: "none",
                        background: !s.categoria ? COR.borda : COR.sucessoBg,
                        color: !s.categoria ? COR.neutro : COR.sucesso,
                        fontFamily: "Nunito, sans-serif", fontSize: FONTE.sm,
                        fontWeight: FONTE.bold, cursor: !s.categoria || ocupado ? "default" : "pointer",
                        opacity: ocupado ? 0.6 : 1,
                      }}
                      title={!s.categoria ? "Defina uma categoria antes de aprovar" : undefined}
                    >
                      Aprovar
                    </button>
                    <button
                      onClick={() => rodarUmaVez(s.id, () => rejeitar(s), "Não foi possível rejeitar a sugestão.")}
                      disabled={ocupado}
                      style={{
                        padding: "6px 12px", borderRadius: RAIO.sm, border: "none",
                        background: COR.erroBg, color: COR.erro,
                        fontFamily: "Nunito, sans-serif", fontSize: FONTE.sm,
                        fontWeight: FONTE.bold, cursor: ocupado ? "default" : "pointer",
                        opacity: ocupado ? 0.6 : 1,
                      }}
                    >
                      Rejeitar
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
