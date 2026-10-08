import { useState } from 'react'
import { ArrowLeft, Trash2 } from 'lucide-react'
import { TIPOGRAFIA, RAIO, BOTAO_PRIMARIO, BOTAO_SECUNDARIO, COR } from '../../utils/estilos'
import { TextoDica } from './DicaDetalhe'

const inputStyle = {
  width: '100%',
  padding: '12px',
  borderRadius: RAIO.md,
  border: '1.5px solid var(--borda, #DEE2E6)',
  background: 'var(--bg)',
  color: 'var(--text)',
  fontFamily: 'Nunito, sans-serif',
  fontSize: '14px',
  boxSizing: 'border-box',
  outline: 'none',
}

const PLACEHOLDER = `Escreva a dica aqui. Dá pra formatar assim:

## Subtítulo
- item de lista
1. passo numerado
**negrito**
[texto do link](https://endereco.com)

Deixe uma linha em branco entre os parágrafos.`

export function DicaFormulario({ dicaInicial, onSalvar, onExcluir, onVoltar }) {
  const editando = !!dicaInicial
  const [titulo, setTitulo] = useState(dicaInicial?.titulo ?? '')
  const [texto, setTexto] = useState(dicaInicial?.texto ?? '')
  const [previa, setPrevia] = useState(false)
  const [salvando, setSalvando] = useState(false)

  const podeSalvar = titulo.trim() && texto.trim() && !salvando

  const salvar = async () => {
    if (!podeSalvar) return
    setSalvando(true)
    try {
      await onSalvar({ titulo: titulo.trim(), texto: texto.trim() })
    } catch (e) {
      console.error(e)
      alert('Não foi possível salvar a dica. Tente novamente.')
      setSalvando(false)
    }
  }

  const excluir = async () => {
    if (!window.confirm(`Excluir a dica "${dicaInicial.titulo}"?`)) return
    setSalvando(true)
    try {
      await onExcluir()
    } catch (e) {
      console.error(e)
      alert('Não foi possível excluir a dica. Tente novamente.')
      setSalvando(false)
    }
  }

  const abaPrevia = (ativa) => ({
    ...BOTAO_SECUNDARIO,
    padding: '6px 14px',
    fontSize: '13px',
    ...(ativa ? { background: 'var(--amarelo)', color: '#212529', border: 'none' } : {}),
  })

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
        <button
          onClick={onVoltar}
          style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            background: 'none', border: 'none', cursor: 'pointer', padding: 0,
            color: 'var(--text-soft)', fontFamily: 'Nunito, sans-serif', fontWeight: 600, fontSize: '14px',
          }}
        >
          <ArrowLeft size={16} /> Dicas
        </button>
        {editando && (
          <button
            onClick={excluir}
            disabled={salvando}
            style={{
              ...BOTAO_SECUNDARIO,
              padding: '6px 12px', fontSize: '13px',
              display: 'flex', alignItems: 'center', gap: '6px',
              color: COR.erro, borderColor: COR.erro,
            }}
          >
            <Trash2 size={14} /> Excluir
          </button>
        )}
      </div>

      <h2 style={{ ...TIPOGRAFIA.h2, color: 'var(--text)', marginBottom: '20px' }}>
        {editando ? 'Editar dica' : 'Nova dica'}
      </h2>

      <input
        value={titulo}
        onChange={e => setTitulo(e.target.value)}
        placeholder="Título"
        style={{ ...inputStyle, fontSize: '16px', fontWeight: 700, marginBottom: '12px' }}
      />

      <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
        <button onClick={() => setPrevia(false)} style={abaPrevia(!previa)}>Escrever</button>
        <button onClick={() => setPrevia(true)} style={abaPrevia(previa)}>Pré-visualizar</button>
      </div>

      {previa ? (
        <div style={{ ...inputStyle, background: 'var(--card)', minHeight: '200px', padding: '16px' }}>
          {texto.trim()
            ? <TextoDica texto={texto} />
            : <p style={{ ...TIPOGRAFIA.corpo, color: 'var(--text-soft)' }}>Nada para mostrar ainda.</p>}
        </div>
      ) : (
        <textarea
          value={texto}
          onChange={e => setTexto(e.target.value)}
          placeholder={PLACEHOLDER}
          rows={16}
          style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.6 }}
        />
      )}

      <button
        onClick={salvar}
        disabled={!podeSalvar}
        style={{
          ...BOTAO_PRIMARIO,
          padding: '14px',
          width: '100%',
          marginTop: '20px',
          opacity: podeSalvar ? 1 : 0.5,
          cursor: podeSalvar ? 'pointer' : 'not-allowed',
        }}
      >
        {salvando ? 'Salvando...' : editando ? 'Salvar alterações' : 'Publicar dica'}
      </button>
    </div>
  )
}
