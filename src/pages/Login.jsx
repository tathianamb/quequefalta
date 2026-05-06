import { signInWithPopup } from "firebase/auth";
import { auth, googleProvider } from "../config/firebase";
import { useState } from "react";

function Login() {
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState("");

  const handleLogin = async () => {
    setCarregando(true);
    setErro("");
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error("Erro no login:", error);
      if (error.code === "auth/popup-blocked") {
        setErro(
          "Popup bloqueado! Permite popups para este site nas configurações do navegador.",
        );
      } else {
        setErro("Erro ao fazer login. Tente novamente.");
      }
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
          marginBottom: "48px",
          fontSize: "15px",
        }}
      >
        Lista de compras compartilhada
      </p>
      <button
        onClick={handleLogin}
        disabled={carregando}
        style={{
          display: "flex",
          alignItems: "center",
          gap: "12px",
          padding: "16px 28px",
          borderRadius: "16px",
          border: "none",
          background: "white",
          boxShadow: "0 2px 16px rgba(0,0,0,0.12)",
          fontFamily: "Nunito, sans-serif",
          fontWeight: 800,
          fontSize: "16px",
          cursor: carregando ? "default" : "pointer",
          color: "#212529",
          opacity: carregando ? 0.7 : 1,
        }}
      >
        <img
          src="https://www.google.com/favicon.ico"
          width="20"
          height="20"
          alt="Google"
        />
        {carregando ? "Entrando..." : "Entrar com Google"}
      </button>
      {erro && (
        <p
          style={{
            color: "#FA5252",
            marginTop: "16px",
            fontSize: "14px",
            textAlign: "center",
          }}
        >
          {erro}
        </p>
      )}
    </div>
  );
}

export default Login;
