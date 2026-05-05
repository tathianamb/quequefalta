import {
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
} from "firebase/auth";
import { auth, googleProvider } from "../config/firebase";
import { useEffect, useState } from "react";
import { TIPOGRAFIA, FONTE, RAIO } from "../utils/estilos";

const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

function Login() {
  const [carregando, setCarregando] = useState(isMobile);

  useEffect(() => {
    if (!isMobile) return;
    getRedirectResult(auth)
      .then((result) => {
        if (result?.user) console.log("Login via redirect ok");
      })
      .catch(console.error)
      .finally(() => setCarregando(false));
  }, []);

  const handleLogin = async () => {
    try {
      if (isMobile) {
        await signInWithRedirect(auth, googleProvider);
      } else {
        await signInWithPopup(auth, googleProvider);
      }
    } catch (error) {
      console.error("Erro no login:", error);
    }
  };

  if (carregando)
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "var(--bg)",
        }}
      >
        <p style={{ color: "var(--text-soft)" }}>Carregando...</p>
      </div>
    );

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
          ...TIPOGRAFIA.corpo,
          color: "var(--text-soft)",
          marginBottom: "48px",
        }}
      >
        Lista de compras compartilhada
      </p>
      <button
        onClick={handleLogin}
        style={{
          display: "flex",
          alignItems: "center",
          gap: "12px",
          padding: "16px 28px",
          borderRadius: RAIO.lg,
          border: "none",
          background: "white",
          boxShadow: "0 2px 16px rgba(0,0,0,0.12)",
          fontFamily: "Nunito, sans-serif",
          fontWeight: FONTE.extrabold,
          fontSize: FONTE.lg,
          cursor: "pointer",
          color: "#212529",
        }}
      >
        <img
          src="https://www.google.com/favicon.ico"
          width="20"
          height="20"
          alt="Google"
        />
        Entrar com Google
      </button>
    </div>
  );
}

export default Login;
