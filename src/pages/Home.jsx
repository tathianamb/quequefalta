import { signOut } from 'firebase/auth'
import { auth } from '../config/firebase'

function Home({ usuario }) {
  const handleLogout = async () => {
    await signOut(auth)
  }

  return (
    <div>
      <p>Olá, {usuario.displayName}!</p>S
      <button onClick={handleLogout}>Sair</button>
    </div>
  )
}

export default Home