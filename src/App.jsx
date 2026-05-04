import { useEffect, useState } from 'react'
import { onAuthStateChanged } from 'firebase/auth'
import { auth } from './config/firebase'
import { obterOuCriarGrupo } from './config/grupo'
import Login from './pages/Login'
import Grupo from './pages/Grupo'
import Home from './pages/Home'

function App() {
  const [usuario, setUsuario] = useState(undefined)
  const [grupoId, setGrupoId] = useState(null)

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const id = await obterOuCriarGrupo(user)
        setGrupoId(id)
      }
      setUsuario(user ?? null)
    })
    return () => unsub()
  }, [])

  if (usuario === undefined) return <p>Carregando...</p>
  if (!usuario) return <Login />
  if (!grupoId) return <Grupo usuario={usuario} onGrupoDefinido={setGrupoId} />
  return <Home usuario={usuario} grupoId={grupoId} />
}

export default App