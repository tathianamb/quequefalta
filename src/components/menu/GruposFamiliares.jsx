import { useEffect, useRef, useState } from "react";
import { Share2 } from "lucide-react";
import { alternarLista } from "../../config/lista";
import { TIPOGRAFIA, FONTE, RAIO, BOTAO_SECUNDARIO, COR } from "../../utils/estilos";

// Seção "Grupo familiar" do menu: trocar de grupo, convidar (no próprio grupo
// ativo) e pedir para sair de um grupo alheio (`aoSair` abre a confirmação, que
// fica no Menu).
function GruposFamiliares({ todasListas, listaAtiva, usuario, setListaAtiva, onFechar, aoSair }) {
  const [aviso, setAviso] = useState(null);
  const timerAvisoRef = useRef(null);

  // Não deixa o timer do aviso disparar depois que o menu fechou.
  useEffect(() => () => clearTimeout(timerAvisoRef.current), []);

  // Aviso curto na própria tela (some em 2s).
  const mostrarAviso = (texto) => {
    setAviso(texto);
    clearTimeout(timerAvisoRef.current);
    timerAvisoRef.current = setTimeout(() => setAviso(null), 2000);
  };

  return (
    <div>
      <p
        style={{
          ...TIPOGRAFIA.label,
          color: "var(--text-soft)",
          marginBottom: "8px",
          paddingLeft: "4px",
        }}
      >
        Grupo familiar
      </p>
      <div
        style={{ display: "flex", flexDirection: "column", gap: "8px" }}
      >
        {todasListas.map((lista) => {
          const ativa = lista.id === listaAtiva;
          const propria = lista.id === usuario.uid;
          return (
            <div
              key={lista.id}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "14px 16px",
                background: ativa ? "var(--amarelo-suave)" : "var(--bg)",
                borderRadius: RAIO.md,
                border: `1.5px solid ${ativa ? "var(--amarelo)" : "transparent"}`,
                cursor: ativa ? "default" : "pointer",
              }}
              onClick={async () => {
                if (!ativa) {
                  await alternarLista(usuario, lista.id);
                  setListaAtiva(lista.id);
                  onFechar();
                }
              }}
            >
              <div style={{ flex: 1, minWidth: 0, overflowWrap: "anywhere" }}>
                <p
                  style={{
                    ...TIPOGRAFIA.nomeProduto,
                    color: "var(--text)",
                  }}
                >
                  {propria
                    ? "Meu grupo"
                    : `Grupo de ${lista.criadaPor}`}
                </p>
                {ativa && (
                  <p
                    style={{
                      ...TIPOGRAFIA.subcategoria,
                      color: "var(--text)",
                      fontWeight: FONTE.bold,
                    }}
                  >
                    Ativa
                  </p>
                )}
              </div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                }}
              >
                {propria && ativa && (
                  <button
                    onClick={async (e) => {
                      e.stopPropagation();
                      const url = `${window.location.origin}/quequefalta/?lista=${lista.id}`;
                      try {
                        if (navigator.share) {
                          await navigator.share({
                            title: "QueQueFalta",
                            text: "Entre no meu grupo familiar no QueQueFalta!",
                            url,
                          });
                        } else {
                          await navigator.clipboard.writeText(url);
                          mostrarAviso("Link de convite copiado!");
                        }
                      } catch (erro) {
                        // Cancelar o compartilhamento rejeita com AbortError: não é erro.
                        if (erro?.name !== "AbortError") console.error("Erro ao convidar:", erro);
                      }
                    }}
                    style={{
                      ...BOTAO_SECUNDARIO,
                      padding: "6px 12px",
                      fontSize: "12px",
                      display: "flex",
                      alignItems: "center",
                      gap: "4px",
                    }}
                  >
                    <Share2 size={14} />
                    Convidar
                  </button>
                )}
                {!propria && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      aoSair(lista);
                    }}
                    style={{
                      padding: "6px 10px",
                      borderRadius: RAIO.sm,
                      border: "none",
                      background: COR.erroBg,
                      color: COR.erro,
                      cursor: "pointer",
                      fontSize: "12px",
                      fontWeight: 600,
                      fontFamily: "Nunito, sans-serif",
                    }}
                  >
                    Sair do grupo
                  </button>
                )}
              </div>
            </div>
          );
        })}
        {aviso && (
          <p role="status" style={{ ...TIPOGRAFIA.subcategoria, color: COR.sucesso, paddingLeft: "4px" }}>
            {aviso}
          </p>
        )}
      </div>
    </div>
  );
}

export default GruposFamiliares;
