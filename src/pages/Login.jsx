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
        background: "var(--verde)",
        padding: "20px",
      }}
    >
      <h1
        style={{
          fontFamily: "Comfortaa, sans-serif",
          fontWeight: 800,
          fontSize: "36px",
          marginBottom: "8px",
        }}
      >
        <span style={{ color: "var(--amarelo)" }}>QueQue</span>
        <span style={{ color: "var(--laranja)" }}>Falta</span>
      </h1>
      <p style={{ color: "var(--verde-sage)", marginBottom: "48px", fontSize: "15px" }}>
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
          color: "var(--verde)",
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
            color: "var(--laranja)",
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
