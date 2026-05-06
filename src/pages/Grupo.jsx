import { useState } from "react";
import { signOut } from "firebase/auth";
import { criarGrupo, entrarNoGrupo } from "../config/grupo";
import { auth } from "../config/firebase";
import { TIPOGRAFIA, BOTAO_PRIMARIO, BOTAO_SECUNDARIO } from "../utils/estilos";

function Grupo({ usuario, onGrupoDefinido, onVoltar }) {
  const [codigo, setCodigo] = useState("");
  const [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(false);

  const handleCriar = async () => {
    setCarregando(true);
    try {
      const id = await criarGrupo(usuario);
      onGrupoDefinido(id);
    } catch (e) {
      setErro("Erro ao criar grupo.");
    } finally {
      setCarregando(false);
    }
  };

  const handleEntrar = async () => {
    if (codigo.length < 6) return setErro("Código deve ter 6 caracteres.");
    setCarregando(true);
    try {
      const id = await entrarNoGrupo(usuario, codigo.trim());
      onGrupoDefinido(id);
    } catch (e) {
      setErro(e.message);
    } finally {
      setCarregando(false);
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: "var(--bg)",
        padding: "20px",
      }}
    >
      <p style={{ fontSize: "64px", marginBottom: "8px" }}>🛒</p>
      <h1 style={{ ...TIPOGRAFIA.display, marginBottom: "4px" }}>
        <span style={{ color: "#FEC601" }}>QueQue</span>
        <span style={{ color: "#FE5F01" }}>Falta</span>
      </h1>

      <p
        style={{
          ...TIPOGRAFIA.subcategoria,
          color: "var(--text-soft)",
          marginBottom: "32px",
        }}
      >
        Logado como <strong>{usuario.email}</strong>
      </p>

      <div
        style={{
          width: "100%",
          maxWidth: "320px",
          display: "flex",
          flexDirection: "column",
          gap: "12px",
        }}
      >
        <button
          onClick={handleCriar}
          disabled={carregando}
          style={{ ...BOTAO_PRIMARIO, padding: "16px", width: "100%" }}
        >
          {carregando ? "Criando..." : "Criar novo grupo"}
        </button>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            margin: "4px 0",
          }}
        >
          <div style={{ flex: 1, height: "1px", background: "#DEE2E6" }} />
          <span
            style={{ ...TIPOGRAFIA.subcategoria, color: "var(--text-soft)" }}
          >
            ou
          </span>
          <div style={{ flex: 1, height: "1px", background: "#DEE2E6" }} />
        </div>

        <input
          value={codigo}
          onChange={(e) => setCodigo(e.target.value.toUpperCase())}
          placeholder="Código do grupo"
          maxLength={6}
          style={{
            padding: "14px",
            borderRadius: "12px",
            border: "2px solid #DEE2E6",
            background: "var(--card)",
            fontFamily: "Nunito, sans-serif",
            ...TIPOGRAFIA.nomeProduto,
            color: "var(--text)",
            outline: "none",
            textAlign: "center",
            letterSpacing: "6px",
            width: "100%",
          }}
        />

        <button
          onClick={handleEntrar}
          disabled={carregando || codigo.length < 6}
          style={{
            ...BOTAO_PRIMARIO,
            padding: "16px",
            width: "100%",
            opacity: codigo.length < 6 ? 0.4 : 1,
            cursor: codigo.length < 6 ? "default" : "pointer",
          }}
        >
          {carregando ? "Entrando..." : "Entrar no grupo"}
        </button>

        {erro && (
          <p
            style={{
              ...TIPOGRAFIA.subcategoria,
              color: "#FA5252",
              textAlign: "center",
            }}
          >
            {erro}
          </p>
        )}

        {onVoltar && (
          <button
            onClick={onVoltar}
            style={{ ...BOTAO_SECUNDARIO, padding: "12px", width: "100%" }}
          >
            ← Voltar
          </button>
        )}

        <button
          onClick={() => signOut(auth)}
          style={{
            ...BOTAO_SECUNDARIO,
            padding: "12px",
            width: "100%",
            marginTop: "4px",
          }}
        >
          Usar outra conta
        </button>
      </div>
    </div>
  );
}

export default Grupo;
