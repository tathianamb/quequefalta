import { useState } from 'react'
import { ArrowLeft } from 'lucide-react'
import { TIPOGRAFIA, RAIO, BOTAO_PRIMARIO } from '../../utils/estilos'
import { parseReceita } from '../../utils/parseReceita'

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
  resize: 'vertical',
  lineHeight: 1.6,
}

const PLACEHOLDER = `Cole aqui o texto da receita. Exemplo:

Macarrão ao molho vermelho
Tempo: 30 min | Porções: 4 | Dificuldade: fácil

Ingredientes:
2 xícaras de macarrão
1 lata de molho de tomate
2 dentes de alho
sal a gosto

Modo de preparo:
Cozinhe o macarrão al dente.
Refogue o alho no azeite...`

export function ReceitaTexto({ textoInicial = '', catalogo, atributos, onContinuar, onVoltar }) {
  const [texto, setTexto] = useState(textoInicial)

  const handleContinuar = () => {
    if (!texto.trim()) return
    const resultado = parseReceita(texto, { catalogo, atributos })
    onContinuar(texto, resultado)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Voltar */}
      <button
        onClick={onVoltar}
        style={{
          display: 'flex', alignItems: 'center', gap: '6px',
          background: 'none', border: 'none', cursor: 'pointer',
          padding: 0, color: 'var(--text-soft)',
          fontFamily: 'Nunito, sans-serif', fontWeight: 600, fontSize: '14px',
        }}
      >
        <ArrowLeft size={16} /> Receitas
      </button>

      <h2 style={{ ...TIPOGRAFIA.h2, color: 'var(--text)', margin: 0 }}>
        Nova receita
      </h2>

      {/* Textarea */}
      <div>
        <textarea
          value={texto}
          onChange={e => setTexto(e.target.value)}
          placeholder={PLACEHOLDER}
          rows={14}
          style={inputStyle}
        />
        <p style={{ ...TIPOGRAFIA.subcategoria, color: 'var(--text-soft)', marginTop: '6px' }}>
          O app vai tentar reconhecer ingredientes, quantidades e modo de preparo automaticamente.
        </p>
      </div>

      {/* Continuar */}
      <button
        onClick={handleContinuar}
        disabled={!texto.trim()}
        style={{
          ...BOTAO_PRIMARIO,
          padding: '14px',
          width: '100%',
          opacity: !texto.trim() ? 0.5 : 1,
          cursor: !texto.trim() ? 'not-allowed' : 'pointer',
        }}
      >
        Continuar →
      </button>
    </div>
  )
}
