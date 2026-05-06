import { useEffect, useState } from "react";
import { onAuthStateChanged, getRedirectResult } from "firebase/auth";
import { auth } from "./config/firebase";
import {
  inicializarLista,
  obterListaAtiva,
  entrarNaLista,
} from "./config/lista";
import Login from "./pages/Login";
import Home from "./pages/Home";

function App() {
  const [usuario, setUsuario] = useState(undefined);
  const [listaAtiva, setListaAtiva] = useState(null);
  const [todasListas, setTodasListas] = useState([]);
  const [listaPendente, setListaPendente] = useState(null); // link recebido
  const [confirmandoLista, setConfirmandoLista] = useState(null); // lista para confirmar

  useEffect(() => {
    // Verifica se tem ?lista= na URL
    const params = new URLSearchParams(window.location.search);
    const listaParam = params.get("lista");
    if (listaParam) setListaPendente(listaParam);

    getRedirectResult(auth).catch(console.error);

    const unsub = onAuthStateChanged(auth, async (user) => {
      if (user) {
        await inicializarLista(user);
        const { listaAtiva: ativa, listas } = await obterListaAtiva(user);
        setListaAtiva(ativa);
        setTodasListas(listas);

        // Se veio com link, verifica se já participa
        if (listaParam) {
          const jaParticipa = listas.some((l) => l.id === listaParam);
          if (!jaParticipa) {
            // Busca detalhes da lista para mostrar no modal
            try {
              const lista = await entrarNaLista(user, listaParam);
              setConfirmandoLista(lista);
            } catch (e) {
              console.error("Lista não encontrada:", e);
            }
          } else if (ativa !== listaParam) {
            // Já participa mas não está ativa
            setConfirmandoLista(listas.find((l) => l.id === listaParam));
          }
          // Limpa o parâmetro da URL sem recarregar
          window.history.replaceState({}, "", window.location.pathname);
        }
      }
      setUsuario(user ?? null);
    });
    return () => unsub();
  }, []);

  const handleConfirmarLista = async (confirmar) => {
    if (confirmar && confirmandoLista) {
      await import("./config/lista").then(({ alternarLista }) =>
        alternarLista(usuario, confirmandoLista.id),
      );
      setListaAtiva(confirmandoLista.id);
      setTodasListas((prev) =>
        prev.some((l) => l.id === confirmandoLista.id)
          ? prev
          : [...prev, confirmandoLista],
      );
    }
    setConfirmandoLista(null);
  };

  if (usuario === undefined)
    return (
      <p
        style={{
          textAlign: "center",
          marginTop: "40vh",
          color: "var(--text-soft)",
        }}
      >
        Carregando...
      </p>
    );

  if (!usuario) return <Login />;

  return (
    <>
      <Home
        usuario={usuario}
        listaAtiva={listaAtiva}
        todasListas={todasListas}
        setListaAtiva={setListaAtiva}
        setTodasListas={setTodasListas}
      />

      {/* Modal confirmar nova lista */}
      {confirmandoLista && (
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
            <p style={{ fontSize: "36px", marginBottom: "12px" }}>🛒</p>
            <p
              style={{
                fontWeight: 900,
                fontSize: "18px",
                color: "var(--text)",
                marginBottom: "8px",
              }}
            >
              Acessar lista compartilhada?
            </p>
            <p
              style={{
                fontSize: "14px",
                color: "var(--text-soft)",
                marginBottom: "24px",
                lineHeight: 1.5,
              }}
            >
              Lista de <strong>{confirmandoLista.criadaPor}</strong>
            </p>
            <div style={{ display: "flex", gap: "12px" }}>
              <button
                onClick={() => handleConfirmarLista(false)}
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
                Agora não
              </button>
              <button
                onClick={() => handleConfirmarLista(true)}
                style={{
                  flex: 1,
                  padding: "14px",
                  borderRadius: "12px",
                  border: "none",
                  background: "linear-gradient(135deg, #FEC601, #FE5F01)",
                  color: "#212529",
                  fontFamily: "Nunito, sans-serif",
                  fontWeight: 700,
                  fontSize: "15px",
                  cursor: "pointer",
                }}
              >
                Acessar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default App;
