import { useEffect, useState } from "react";
import Confirmacao from "./components/Confirmacao";
import { onAuthStateChanged, getRedirectResult } from "firebase/auth";
import { auth } from "./config/firebase";
import {
  inicializarLista,
  obterListaAtiva,
  entrarNaLista,
  alternarLista,
} from "./config/lista";
import Login from "./pages/Login";
import Home from "./pages/Home";

function App() {
  const [usuario, setUsuario] = useState(undefined);
  const [listaAtiva, setListaAtiva] = useState(null);
  const [todasListas, setTodasListas] = useState([]);
  const [confirmandoLista, setConfirmandoLista] = useState(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const listaParam = params.get("lista");

    getRedirectResult(auth).catch(console.error);

    const unsub = onAuthStateChanged(auth, async (user) => {
      if (user) {
        await inicializarLista(user);
        const { listaAtiva: ativa, listas } = await obterListaAtiva(user);
        setListaAtiva(ativa);
        setTodasListas(listas);

        if (listaParam) {
          const jaParticipa = listas.some((l) => l.id === listaParam);
          if (!jaParticipa) {

            try {
              const lista = await entrarNaLista(user, listaParam);
              setConfirmandoLista(lista);
            } catch (e) {
              console.error("Lista não encontrada:", e);
            }
          } else if (ativa !== listaParam) {

            setConfirmandoLista(listas.find((l) => l.id === listaParam));
          }

          window.history.replaceState({}, "", window.location.pathname);
        }
      }
      setUsuario(user ?? null);
    });
    return () => unsub();
  }, []);

  const handleConfirmarLista = async (confirmar) => {
    if (confirmar && confirmandoLista) {
      await alternarLista(usuario, confirmandoLista.id);
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
        <Confirmacao
          icone="👨‍👩‍👧"
          titulo={`Usar o grupo de ${confirmandoLista.criadaPor} agora?`}
          cancelar="Depois"
          confirmar="Trocar agora"
          aoCancelar={() => handleConfirmarLista(false)}
          aoConfirmar={() => handleConfirmarLista(true)}
        >
          Grupo de <strong>{confirmandoLista.criadaPor}</strong>.<br />
          Vocês passam a dividir a lista de compras e o que tem em casa.
        </Confirmacao>
      )}
    </>
  );
}

export default App;
