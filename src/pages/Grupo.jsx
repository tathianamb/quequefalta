import { useState } from "react";
import { signOut } from "firebase/auth";
import { criarGrupo, entrarNoGrupo } from "../config/grupo";
import { auth } from "../config/firebase";

function Grupo({ usuario, onGrupoDefinido }) {
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
      const id = await entrarNoGrupo(usuario, codigo);
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
      <h1 style={{ fontWeight: 900, fontSize: "32px", marginBottom: "4px" }}>
        <span style={{ color: "#FEC601" }}>QueQue</span>
        <span style={{ color: "#FE5F01" }}>Falta</span>
      </h1>

      <p
        style={{
          color: "var(--text-soft)",
          fontSize: "14px",
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
          style={{
            padding: "16px",
            borderRadius: "14px",
            border: "none",
            background: "linear-gradient(135deg, #FEC601, #FE5F01)",
            color: "#212529",
            fontFamily: "Nunito, sans-serif",
            fontWeight: 700,
            fontSize: "15px",
            cursor: "pointer",
          }}
        >
          Criar novo grupo
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
          <span style={{ color: "var(--text-soft)", fontSize: "13px" }}>
            ou
          </span>
          <div style={{ flex: 1, height: "1px", background: "#DEE2E6" }} />
        </div>

        <input
          value={codigo}
          onChange={(e) => setCodigo(e.target.value.toUpperCase())}
          placeholder="Código do grupo (6 caracteres)"
          maxLength={6}
          style={{
            padding: "14px",
            borderRadius: "12px",
            border: "2px solid #DEE2E6",
            background: "var(--card)",
            fontFamily: "Nunito, sans-serif",
            fontSize: "15px",
            color: "var(--text)",
            outline: "none",
            textAlign: "center",
            letterSpacing: "4px",
            fontWeight: 700,
          }}
        />

        <button
          onClick={handleEntrar}
          disabled={carregando || codigo.length < 6}
          style={{
            padding: "16px",
            borderRadius: "14px",
            border: "none",
            background: codigo.length === 6 ? "var(--text)" : "#DEE2E6",
            color: codigo.length === 6 ? "var(--card)" : "var(--text-soft)",
            fontFamily: "Nunito, sans-serif",
            fontWeight: 700,
            fontSize: "15px",
            cursor: codigo.length === 6 ? "pointer" : "default",
          }}
        >
          Entrar no grupo
        </button>

        {erro && (
          <p
            style={{ color: "#FA5252", fontSize: "13px", textAlign: "center" }}
          >
            {erro}
          </p>
        )}

        <button
          onClick={() => signOut(auth)}
          style={{
            padding: "12px",
            borderRadius: "12px",
            border: "1.5px solid #DEE2E6",
            background: "transparent",
            color: "var(--text-soft)",
            fontFamily: "Nunito, sans-serif",
            fontWeight: 600,
            fontSize: "14px",
            cursor: "pointer",
            marginTop: "8px",
          }}
        >
          Usar outra conta
        </button>
      </div>
    </div>
  );
}

export default Grupo;
