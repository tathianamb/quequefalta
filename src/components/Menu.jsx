import { useState } from "react";
import {
  Moon,
  Lightbulb,
  Link,
  Shield,
  LogOut,
  Users,
  Share2,
} from "lucide-react";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "../config/firebase";
import { ORDEM_CATEGORIAS } from "../utils/categorias";
import { signOut } from "firebase/auth";
import { auth } from "../config/firebase";
import { alternarLista, sairDaLista } from "../config/lista";
import { TIPOGRAFIA, BOTAO_SECUNDARIO } from "../utils/estilos";

function Menu({
  onFechar,
  escuro,
  toggleTema,
  seguirSistema,
  listaAtiva,
  todasListas,
  setListaAtiva,
  setTodasListas,
  usuario,
  isAdmin,
  onAbrirAdmin,
  telaInicial,
}) {
  const [tela, setTela] = useState(telaInicial || "menu");
  const [nome, setNome] = useState("");
  const [categoria, setCategoria] = useState("");
  const [subcategoria, setSubcategoria] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [sucesso, setSucesso] = useState(false);
  const [confirmandoSaida, setConfirmandoSaida] = useState(false);

  const handleSugestao = async () => {
    if (!nome || !categoria) return;
    setEnviando(true);
    try {
      await addDoc(collection(db, "sugestoes"), {
        nome,
        categoria,
        subcategoria,
        sugeridoPor: usuario.email,
        listaAtiva,
        criadoEm: serverTimestamp(),
        status: "pendente",
      });
      setSucesso(true);
      setNome("");
      setCategoria("");
      setSubcategoria("");
      setTimeout(() => {
        setSucesso(false);
        setTela("menu");
      }, 2000);
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 100,
        display: "flex",
        flexDirection: "column",
        justifyContent: "flex-end",
        background: "rgba(0,0,0,0.4)",
      }}
      onClick={onFechar}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "var(--card)",
          borderRadius: "24px 24px 0 0",
          padding: "24px 20px 40px",
          maxHeight: "85vh",
          overflowY: "auto",
          ...TIPOGRAFIA.corpo,
        }}
      >
        {/* Handle */}
        <div
          style={{
            width: "40px",
            height: "4px",
            background: "#DEE2E6",
            borderRadius: "2px",
            margin: "0 auto 20px",
          }}
        />

        {/* Header */}
        {tela === "menu" && (
          <div
            style={{ display: "flex", flexDirection: "column", gap: "24px" }}
          >
            {/* Perfil */}
            <div>
              <p
                style={{
                  ...TIPOGRAFIA.label,
                  color: "var(--text-soft)",
                  marginBottom: "8px",
                  paddingLeft: "4px",
                  opacity: 0.6,
                }}
              >
                Perfil
              </p>
              <div
                style={{
                  padding: "14px 16px",
                  background: "var(--bg)",
                  borderRadius: "14px",
                }}
              >
                <p
                  style={{
                    ...TIPOGRAFIA.titulo,
                    color: "var(--text)",
                  }}
                >
                  {usuario.displayName}
                </p>
                <p style={{ ...TIPOGRAFIA.corpo, color: "var(--text-soft)" }}>
                  {usuario.email}
                </p>
              </div>
            </div>

            {/* Configurações */}
            <div>
              <p
                style={{
                  ...TIPOGRAFIA.label,
                  color: "var(--text-soft)",
                  marginBottom: "8px",
                  paddingLeft: "4px",
                  opacity: 0.6,
                }}
              >
                Configurações
              </p>
              <div
                style={{ display: "flex", flexDirection: "column", gap: "8px" }}
              >
                {/* Tema */}
                <div
                  style={{
                    padding: "14px 16px",
                    background: "var(--bg)",
                    borderRadius: "14px",
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
                      const temaAtual = localStorage.getItem("tema");
                      const ativo =
                        (id === "auto" && !temaAtual) ||
                        (id === "escuro" && temaAtual === "escuro") ||
                        (id === "claro" && temaAtual === "claro");
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
                            borderRadius: "10px",
                            border: `2px solid ${ativo ? "#FE5F01" : "#DEE2E6"}`,
                            background: ativo ? "#FE5F0111" : "var(--card)",
                            color: ativo ? "#FE5F01" : "var(--text-soft)",
                            transition: "all 0.2s",
                          }}
                        >
                          {label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            {/* Minhas Listas */}
            <div>
              <p
                style={{
                  ...TIPOGRAFIA.label,
                  color: "var(--text-soft)",
                  marginBottom: "8px",
                  paddingLeft: "4px",
                  opacity: 0.6,
                }}
              >
                Minhas Listas
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
                        background: ativa ? "#FEC60122" : "var(--bg)",
                        borderRadius: "14px",
                        border: `1.5px solid ${ativa ? "#FEC601" : "transparent"}`,
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
                      <div>
                        <p
                          style={{
                            ...TIPOGRAFIA.nomeProduto,
                            color: "var(--text)",
                          }}
                        >
                          {propria
                            ? "Minha lista"
                            : `Lista de ${lista.criadaPor}`}
                        </p>
                        {ativa && (
                          <p
                            style={{
                              ...TIPOGRAFIA.subcategoria,
                              color: "#FEC601",
                            }}
                          >
                            ativa
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
                              if (navigator.share) {
                                await navigator.share({
                                  title: "QueQueFalta",
                                  text: "Acesse minha lista de compras!",
                                  url,
                                });
                              } else {
                                await navigator.clipboard.writeText(url);
                                alert("Link copiado!");
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
                            Compartilhar
                          </button>
                        )}
                        {!propria && (
                          <button
                            onClick={async (e) => {
                              e.stopPropagation();
                              await sairDaLista(usuario, lista.id);
                              setTodasListas((prev) =>
                                prev.filter((l) => l.id !== lista.id),
                              );
                              if (ativa) setListaAtiva(usuario.uid);
                              onFechar();
                            }}
                            style={{
                              padding: "6px 10px",
                              borderRadius: "8px",
                              border: "none",
                              background: "#FFE3E3",
                              color: "#FA5252",
                              cursor: "pointer",
                              fontSize: "12px",
                              fontWeight: 600,
                              fontFamily: "Nunito, sans-serif",
                            }}
                          >
                            Sair
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Ações */}
            <div>
              <p
                style={{
                  ...TIPOGRAFIA.label,
                  color: "var(--text-soft)",
                  marginBottom: "8px",
                  paddingLeft: "4px",
                  opacity: 0.6,
                }}
              >
                Ações
              </p>
              <div
                style={{ display: "flex", flexDirection: "column", gap: "8px" }}
              >
                <div
                  onClick={() => setTela("sugestao")}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "12px",
                    padding: "14px 16px",
                    background: "var(--bg)",
                    borderRadius: "14px",
                    cursor: "pointer",
                  }}
                >
                  <Lightbulb size={18} color="var(--text-soft)" />
                  <span
                    style={{
                      ...TIPOGRAFIA.nomeProduto,
                      color: "var(--text)",
                      flex: 1,
                    }}
                  >
                    Sugerir produto
                  </span>
                  <span style={{ color: "var(--text-soft)" }}>›</span>
                </div>

                <div
                  onClick={() => setTela("receitas")}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "12px",
                    padding: "14px 16px",
                    background: "var(--bg)",
                    borderRadius: "14px",
                    cursor: "pointer",
                  }}
                >
                  <Link size={18} color="var(--text-soft)" />
                  <div style={{ flex: 1 }}>
                    <span
                      style={{
                        ...TIPOGRAFIA.nomeProduto,
                        color: "var(--text)",
                      }}
                    >
                      Receitas
                    </span>
                    <p
                      style={{
                        ...TIPOGRAFIA.corpo,
                        color: "var(--text-soft)",
                        marginTop: "2px",
                      }}
                    >
                      Em breve
                    </p>
                  </div>
                  <span style={{ color: "var(--text-soft)" }}>›</span>
                </div>

                {isAdmin && (
                  <div
                    onClick={() => {
                      onFechar();
                      onAbrirAdmin();
                    }}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "12px",
                      padding: "14px 16px",
                      background: "var(--bg)",
                      borderRadius: "14px",
                      cursor: "pointer",
                    }}
                  >
                    <Shield size={18} color="#FA5252" />
                    <span
                      style={{
                        ...TIPOGRAFIA.nomeProduto,
                        color: "#FA5252",
                        flex: 1,
                      }}
                    >
                      Painel Admin
                    </span>
                    <span style={{ color: "var(--text-soft)" }}>›</span>
                  </div>
                )}
                <div
                  onClick={() => setConfirmandoSaida(true)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "12px",
                    padding: "14px 16px",
                    background: "var(--bg)",
                    borderRadius: "14px",
                    cursor: "pointer",
                    marginTop: "4px",
                  }}
                >
                  <LogOut size={18} color="var(--text-soft)" />
                  <span
                    style={{
                      ...TIPOGRAFIA.nomeProduto,
                      color: "var(--text-soft)",
                      flex: 1,
                    }}
                  >
                    Sair da conta
                  </span>
                </div>

                {/* Modal confirmação */}
                {confirmandoSaida && (
                  <div
                    style={{
                      position: "fixed",
                      inset: 0,
                      zIndex: 200,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      background: "rgba(0,0,0,0.5)",
                      padding: "20px",
                    }}
                  >
                    <div
                      style={{
                        background: "var(--card)",
                        borderRadius: "20px",
                        padding: "28px 24px",
                        width: "100%",
                        maxWidth: "320px",
                        textAlign: "center",
                      }}
                    >
                      <p style={{ ...TIPOGRAFIA.titulo, marginBottom: "12px" }}>
                        👋
                      </p>
                      <p
                        style={{
                          ...TIPOGRAFIA.titulo,
                          color: "var(--text)",
                          marginBottom: "8px",
                        }}
                      >
                        Sair da conta?
                      </p>
                      <p
                        style={{
                          ...TIPOGRAFIA.corpo,
                          color: "var(--text-soft)",
                          marginBottom: "24px",
                          lineHeight: 1.5,
                        }}
                      >
                        Você precisará fazer login novamente para acessar sua
                        lista.
                      </p>
                      <div style={{ display: "flex", gap: "12px" }}>
                        <button
                          onClick={() => setConfirmandoSaida(false)}
                          style={{
                            flex: 1,
                            padding: "14px",
                            ...BOTAO_PRIMARIO,
                            cursor: "pointer",
                          }}
                        >
                          Cancelar
                        </button>
                        <button
                          onClick={() => signOut(auth)}
                          style={{
                            flex: 1,
                            padding: "14px",
                            ...BOTAO_SECUNDARIO,
                            cursor: "pointer",
                          }}
                        >
                          Sair
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Tela Sugestão */}
        {tela === "sugestao" && (
          <div
            style={{ display: "flex", flexDirection: "column", gap: "12px" }}
          >
            <p
              style={{
                color: "var(--text-soft)",
                ...TIPOGRAFIA.corpo,
                marginBottom: "4px",
              }}
            >
              Encontrou um produto que não está no catálogo? Sugira e
              avaliaremos a inclusão!
            </p>

            <input
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Nome do produto *"
              style={{
                padding: "14px",
                borderRadius: "12px",
                border: "2px solid #DEE2E6",
                background: "var(--bg)",
                fontFamily: "Nunito, sans-serif",
                ...TIPOGRAFIA.corpo,
                color: "var(--text)",
                outline: "none",
              }}
            />

            <select
              value={categoria}
              onChange={(e) => setCategoria(e.target.value)}
              style={{
                padding: "14px",
                borderRadius: "12px",
                border: "2px solid #DEE2E6",
                background: "var(--bg)",
                fontFamily: "Nunito, sans-serif",
                ...TIPOGRAFIA.corpo,
                color: categoria ? "var(--text)" : "var(--text-soft)",
                outline: "none",
              }}
            >
              <option value="">Categoria *</option>
              {[...ORDEM_CATEGORIAS]
                .sort((a, b) => a.localeCompare(b, "pt-BR"))
                .map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              <option value="Outro">Outro</option>
            </select>

            <input
              value={subcategoria}
              onChange={(e) => setSubcategoria(e.target.value)}
              placeholder="Subcategoria (opcional)"
              style={{
                padding: "14px",
                borderRadius: "12px",
                border: "2px solid #DEE2E6",
                background: "var(--bg)",
                fontFamily: "Nunito, sans-serif",
                ...TIPOGRAFIA.corpo,
                color: "var(--text)",
                outline: "none",
              }}
            />

            <button
              onClick={handleSugestao}
              disabled={!nome || !categoria || enviando}
              style={{
                padding: "14px",
                ...BOTAO_PRIMARIO,
                cursor: !nome || !categoria ? "default" : "pointer",
                marginTop: "4px",
              }}
            >
              {sucesso
                ? "Sugestão enviada! ✓"
                : enviando
                  ? "Enviando..."
                  : "Enviar sugestão"}
            </button>
          </div>
        )}

        {/* Tela Receitas */}
        {tela === "receitas" && (
          <div style={{ textAlign: "center", padding: "40px 0" }}>
            <p style={{ ...TIPOGRAFIA.titulo }}>👨‍🍳</p>
            <p
              style={{
                ...TIPOGRAFIA.titulo,
                marginTop: "16px",
                color: "var(--text)",
              }}
            >
              Em breve!
            </p>
            <p
              style={{
                color: "var(--text-soft)",
                marginTop: "8px",
                lineHeight: 1.5,
              }}
            >
              Em breve você poderá vincular receitas aos produtos e adicionar os
              ingredientes faltantes à lista com um toque.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default Menu;
