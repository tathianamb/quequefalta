import { Lightbulb } from 'lucide-react'
import { TIPOGRAFIA, RAIO } from '../../utils/estilos'
import { resumoDoTexto, dataDaDica } from '../../utils/textoDica'

function CardDica({ dica, onClick }) {
  return (
    <div
      onClick={() => onClick(dica)}
      style={{
        background: 'var(--card)',
        borderRadius: RAIO.lg,
        padding: '16px',
        cursor: 'pointer',
        border: '1.5px solid var(--borda, #DEE2E6)',
        borderLeft: '4px solid var(--amarelo)',
      }}
    >
      <p style={{ ...TIPOGRAFIA.h3, color: 'var(--text)', lineHeight: 1.3 }}>
        {dica.titulo}
      </p>
      <p style={{ ...TIPOGRAFIA.corpo, color: 'var(--text-soft)', lineHeight: 1.5, marginTop: '6px' }}>
        {resumoDoTexto(dica.texto)}
      </p>
      {dica.criadaEm && (
        <p style={{ ...TIPOGRAFIA.subcategoria, color: 'var(--text-soft)', marginTop: '10px' }}>
          {dataDaDica(dica.criadaEm)}
        </p>
      )}
    </div>
  )
}

export function DicaLista({ dicas, carregando, erro, busca, onVerDica }) {
  if (carregando) {
    return <p style={{ textAlign: 'center', color: 'var(--text-soft)' }}>Carregando...</p>
  }

  if (erro) {
    return (
      <p style={{ ...TIPOGRAFIA.corpo, textAlign: 'center', color: 'var(--text-soft)', padding: '40px 20px' }}>
        Não foi possível carregar as dicas. Tente novamente mais tarde.
      </p>
    )
  }

  if (dicas.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '40px 20px' }}>
        {busca ? (
          <p style={{ fontSize: '40px' }}>🔍</p>
        ) : (
          <Lightbulb size={40} color="var(--text-soft)" />
        )}
        <p style={{ ...TIPOGRAFIA.corpo, color: 'var(--text-soft)', marginTop: '12px' }}>
          {busca ? 'Nenhuma dica encontrada' : 'Nenhuma dica publicada ainda'}
        </p>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {dicas.map(d => (
        <CardDica key={d.id} dica={d} onClick={onVerDica} />
      ))}
    </div>
  )
}
