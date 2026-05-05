import { useState } from 'react'
import { criarGrupo, entrarNoGrupo } from '../config/grupo'
import { TIPOGRAFIA, FONTE, RAIO, BOTAO_PRIMARIO, BOTAO_SECUNDARIO } from '../utils/estilos'

function Grupo({ usuario, onGrupoDefinido }) {
  const [codigo, setCodigo] = useState('')
  const [erro, setErro] = useState('')
  const [carregando, setCarregando] = useState(false)

  const handleCriar = async () => {
    setCarregando(true)
    setErro('')
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
    setErro('')
    try {
      const id = await entrarNoGrupo(usuario, codigo)
      onGrupoDefinido(id)
    } catch (e) {
      setErro(e.message)
    } finally {
      setCarregando(false)
    }
  }

  const codigoCompleto = codigo.length === 6

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--bg)',
        padding: '20px',
      }}
    >
      {/* Logo */}
      <p style={{ fontSize: '64px', marginBottom: '8px' }}>🛒</p>
      <h1 style={{ ...TIPOGRAFIA.display, marginBottom: '4px' }}>
        <span style={{ color: '#FEC601' }}>QueQue</span>
        <span style={{ color: '#FE5F01' }}>Falta</span>
      </h1>
      <p style={{ ...TIPOGRAFIA.corpo, color: 'var(--text-soft)', marginBottom: '32px' }}>
        Olá, {usuario.displayName}! Configure seu grupo.
      </p>

      <div
        style={{
          width: '100%',
          maxWidth: '360px',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
        }}
      >
        {/* Criar grupo */}
        <div
          style={{
            background: 'var(--card)',
            borderRadius: RAIO.lg,
            padding: '20px',
            boxShadow: 'var(--shadow)',
          }}
        >
          <p style={{ ...TIPOGRAFIA.h3, color: 'var(--text)', marginBottom: '6px' }}>
            Criar novo grupo
          </p>
          <p style={{ ...TIPOGRAFIA.corpo, color: 'var(--text-soft)', marginBottom: '16px' }}>
            Inicie uma lista compartilhada para sua família.
          </p>
          <button
            onClick={handleCriar}
            disabled={carregando}
            style={{ width: '100%', padding: '14px', ...BOTAO_PRIMARIO }}
          >
            {carregando ? 'Criando...' : 'Criar novo grupo'}
          </button>
        </div>

        {/* Divisor */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ flex: 1, height: '1px', background: '#DEE2E6' }} />
          <span style={{ ...TIPOGRAFIA.label, color: 'var(--text-soft)' }}>ou</span>
          <div style={{ flex: 1, height: '1px', background: '#DEE2E6' }} />
        </div>

        {/* Entrar em grupo */}
        <div
          style={{
            background: 'var(--card)',
            borderRadius: RAIO.lg,
            padding: '20px',
            boxShadow: 'var(--shadow)',
          }}
        >
          <p style={{ ...TIPOGRAFIA.h3, color: 'var(--text)', marginBottom: '6px' }}>
            Entrar em grupo existente
          </p>
          <p style={{ ...TIPOGRAFIA.corpo, color: 'var(--text-soft)', marginBottom: '16px' }}>
            Informe o código compartilhado por um familiar.
          </p>
          <input
            value={codigo}
            onChange={e => setCodigo(e.target.value.toUpperCase())}
            placeholder="CÓDIGO"
            maxLength={6}
            style={{
              width: '100%',
              padding: '14px',
              borderRadius: RAIO.md,
              border: `2px solid ${codigoCompleto ? '#FE5F01' : '#DEE2E6'}`,
              background: 'var(--bg)',
              fontFamily: 'Nunito, sans-serif',
              fontSize: FONTE.xl,
              fontWeight: FONTE.bold,
              color: 'var(--text)',
              outline: 'none',
              marginBottom: '12px',
              boxSizing: 'border-box',
              letterSpacing: '6px',
              textAlign: 'center',
              textTransform: 'uppercase',
              transition: 'border-color 0.2s',
            }}
          />
          <button
            onClick={handleEntrar}
            disabled={carregando || !codigoCompleto}
            style={{
              width: '100%',
              padding: '14px',
              ...BOTAO_PRIMARIO,
              background: codigoCompleto ? BOTAO_PRIMARIO.background : '#DEE2E6',
              color: codigoCompleto ? BOTAO_PRIMARIO.color : 'var(--text-soft)',
              cursor: codigoCompleto ? 'pointer' : 'default',
            }}
          >
            {carregando ? 'Entrando...' : 'Entrar no grupo'}
          </button>
        </div>

        {/* Erro */}
        {erro && (
          <p style={{ ...TIPOGRAFIA.corpo, color: '#FA5252', textAlign: 'center' }}>
            {erro}
          </p>
        )}
      </div>
    </div>
  )
}

export default Grupo
