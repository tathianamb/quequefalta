import { signInWithPopup } from 'firebase/auth'
import { auth, googleProvider } from '../config/firebase'

function Login() {
  const handleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider)
    } catch (error) {
      console.error('Erro no login:', error)
    }
  }

  return (
    <div>
      <h1>QueQueFalta</h1>
      <button onClick={handleLogin}>Entrar com Google</button>
    </div>
  )
}

export default Login