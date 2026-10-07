import { Fragment } from 'react'
import { ArrowLeft, Pencil } from 'lucide-react'
import { TIPOGRAFIA, BOTAO_SECUNDARIO } from '../../utils/estilos'
import { blocosDoTexto, trechosDaLinha, dataDaDica } from '../../utils/textoDica'

function Linha({ texto }) {
  return trechosDaLinha(texto).map((t, i) =>
    t.negrito ? <strong key={i} style={{ fontWeight: 800 }}>{t.texto}</strong> : <Fragment key={i}>{t.texto}</Fragment>
  )
}

function Paragrafo({ texto }) {
  const linhas = texto.split('\n')
  return linhas.map((l, i) => (
    <Fragment key={i}>
      <Linha texto={l} />
      {i < linhas.length - 1 && <br />}
    </Fragment>
  ))
}

export function TextoDica({ texto }) {
  const corpo = { ...TIPOGRAFIA.corpo, fontSize: '15px', color: 'var(--text)', lineHeight: 1.7 }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      {blocosDoTexto(texto).map((b, i) => {
        if (b.tipo === 'titulo') {
          return (
            <h3 key={i} style={{ ...TIPOGRAFIA.h3, color: 'var(--text)', marginTop: '6px' }}>
              <Linha texto={b.texto} />
            </h3>
          )
        }
        if (b.tipo === 'lista' || b.tipo === 'numerada') {
          const Tag = b.tipo === 'lista' ? 'ul' : 'ol'
          return (
            <Tag key={i} style={{ ...corpo, paddingLeft: '22px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {b.itens.map((item, j) => <li key={j}><Linha texto={item} /></li>)}
            </Tag>
          )
        }
        return <p key={i} style={corpo}><Paragrafo texto={b.texto} /></p>
      })}
    </div>
  )
}

export function DicaDetalhe({ dica, isAdmin, onVoltar, onEditar }) {
  const data = dataDaDica(dica.criadaEm)
  const meta = [data, dica.autorNome].filter(Boolean).join(' · ')

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '16px' }}>
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
        {isAdmin && (
          <button
            onClick={onEditar}
            style={{ ...BOTAO_SECUNDARIO, padding: '6px 12px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <Pencil size={14} /> Editar
          </button>
        )}
      </div>

      <h1 style={{ ...TIPOGRAFIA.titulo, color: 'var(--text)', lineHeight: 1.3 }}>
        {dica.titulo}
      </h1>
      {meta && (
        <p style={{ ...TIPOGRAFIA.subcategoria, color: 'var(--text-soft)', marginTop: '6px' }}>
          {meta}
        </p>
      )}

      <div style={{ marginTop: '20px' }}>
        <TextoDica texto={dica.texto} />
      </div>
    </div>
  )
}
