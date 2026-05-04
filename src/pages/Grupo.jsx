import { useState } from 'react'
import { criarGrupo, entrarNoGrupo } from '../config/grupo'

function Grupo({ usuario, onGrupoDefinido }) {
  const [codigo, setCodigo] = useState('')
  const [erro, setErro] = useState('')
  const [carregando, setCarregando] = useState(false)

  const handleCriar = async () => {
    setCarregando(true)
    try {
      const id = await criarGrupo(usuario)
      onGrupoDefinido(id)
    } catch (e) {
      setErro('Erro ao criar grupo.')
    } finally {
      setCarregando(false)
    }
  }

  const handleEntrar = async () => {
    if (codigo.length < 6) return setErro('Código deve ter 6 caracteres.')
    setCarregando(true)
    try {
      const id = await entrarNoGrupo(usuario, codigo)
      onGrupoDefinido(id)
    } catch (e) {
      setErro(e.message)
    } finally {
      setCarregando(false)
    }
  }

  return (
    <div>
      <h1>QueQueFalta</h1>
      <p>Olá, {usuario.displayName}! Configure seu grupo familiar.</p>

      <button onClick={handleCriar} disabled={carregando}>
        Criar novo grupo
      </button>

      <hr />

      <p>Ou entre em um grupo existente:</p>
      <input
        value={codigo}
        onChange={e => setCodigo(e.target.value)}
        placeholder="Código do grupo (6 caracteres)"
        maxLength={6}
      />
      <button onClick={handleEntrar} disabled={carregando}>
        Entrar no grupo
      </button>

      {erro && <p style={{ color: 'red' }}>{erro}</p>}
    </div>
  )
}

export default Grupo