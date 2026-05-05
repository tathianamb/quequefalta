import { useState } from "react";
import { X, Moon, Lightbulb, Link, Shield, LogOut } from "lucide-react";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "../config/firebase";
import { ORDEM_CATEGORIAS } from "../utils/categorias";
import { signOut } from "firebase/auth";
import { auth } from "../config/firebase";

function Menu({
  onFechar,
  escuro,
  toggleTema,
  seguirSistema,
  grupoId,
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
        grupoId,
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
                  fontSize: "10px",
                  fontWeight: 700,
                  color: "var(--text-soft)",
                  textTransform: "uppercase",
                  letterSpacing: "1.2px",
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
                    fontWeight: 800,
                    fontSize: "15px",
                    color: "var(--text)",
                  }}
                >
                  {usuario.displayName}
                </p>
                <p style={{ fontSize: "12px", color: "var(--text-soft)" }}>
                  {usuario.email}
                </p>
              </div>
            </div>

            {/* Configurações */}
            <div>
              <p
                style={{
                  fontSize: "10px",
                  fontWeight: 700,
                  color: "var(--text-soft)",
                  textTransform: "uppercase",
                  letterSpacing: "1.2px",
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
                        fontWeight: 700,
                        color: "var(--text)",
                        fontSize: "15px",
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
                            borderRadius: "10px",
                            border: `2px solid ${ativo ? "#FE5F01" : "#DEE2E6"}`,
                            background: ativo ? "#FE5F0111" : "var(--card)",
                            color: ativo ? "#FE5F01" : "var(--text-soft)",
                            fontFamily: "Nunito, sans-serif",
                            fontWeight: 700,
                            fontSize: "13px",
                            cursor: "pointer",
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

            {/* Ações */}
            <div>
              <p
                style={{
                  fontSize: "10px",
                  fontWeight: 700,
                  color: "var(--text-soft)",
                  textTransform: "uppercase",
                  letterSpacing: "1.2px",
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
                      fontWeight: 700,
                      color: "var(--text)",
                      flex: 1,
                      fontSize: "15px",
                    }}
                  >
                    Sugerir produto
                  </span>
                  <span style={{ color: "var(--text-soft)", fontSize: "18px" }}>
                    ›
                  </span>
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
                        fontWeight: 700,
                        color: "var(--text)",
                        fontSize: "15px",
                      }}
                    >
                      Receitas
                    </span>
                    <p
                      style={{
                        fontSize: "12px",
                        color: "var(--text-soft)",
                        marginTop: "2px",
                      }}
                    >
                      Em breve
                    </p>
                  </div>
                  <span style={{ color: "var(--text-soft)", fontSize: "18px" }}>
                    ›
                  </span>
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
                        fontWeight: 700,
                        color: "#FA5252",
                        flex: 1,
                        fontSize: "15px",
                      }}
                    >
                      Painel Admin
                    </span>
                    <span
                      style={{ color: "var(--text-soft)", fontSize: "18px" }}
                    >
                      ›
                    </span>
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
                      fontWeight: 700,
                      color: "var(--text-soft)",
                      flex: 1,
                      fontSize: "15px",
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
                      <p style={{ fontSize: "36px", marginBottom: "12px" }}>
                        👋
                      </p>
                      <p
                        style={{
                          fontWeight: 900,
                          fontSize: "18px",
                          color: "var(--text)",
                          marginBottom: "8px",
                        }}
                      >
                        Sair da conta?
                      </p>
                      <p
                        style={{
                          fontSize: "14px",
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
                            borderRadius: "12px",
                            border: "none",
                            background: "var(--bg)",
                            color: "var(--text-soft)",
                            fontFamily: "Nunito, sans-serif",
                            fontWeight: 700,
                            fontSize: "15px",
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
                            borderRadius: "12px",
                            border: "none",
                            background: "#FA5252",
                            color: "white",
                            fontFamily: "Nunito, sans-serif",
                            fontWeight: 700,
                            fontSize: "15px",
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
                fontSize: "14px",
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
                fontSize: "15px",
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
                fontSize: "15px",
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
                fontSize: "15px",
                color: "var(--text)",
                outline: "none",
              }}
            />

            <button
              onClick={handleSugestao}
              disabled={!nome || !categoria || enviando}
              style={{
                padding: "14px",
                borderRadius: "12px",
                border: "none",
                background: !nome || !categoria ? "#DEE2E6" : "#FE5F01",
                color: !nome || !categoria ? "var(--text-soft)" : "white",
                fontFamily: "Nunito, sans-serif",
                fontWeight: 800,
                fontSize: "16px",
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
            <p style={{ fontSize: "48px" }}>👨‍🍳</p>
            <p
              style={{
                fontWeight: 800,
                fontSize: "20px",
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
