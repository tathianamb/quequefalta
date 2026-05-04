import { useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { corDaCategoria } from '../utils/categorias'
import ProdutoItem from './ProdutoItem'

function CategoriaGrupo({ categoria, itens, onToggle }) {
  const [aberto, setAberto] = useState(true)
  const cor = corDaCategoria(categoria)

  return (
    <div style={{ marginBottom: '16px' }}>
      {/* Header da categoria */}
      <div
        onClick={() => setAberto(!aberto)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          marginBottom: aberto ? '10px' : '0',
          cursor: 'pointer',
          userSelect: 'none',
          padding: '8px 4px',
        }}
      >
        <div style={{
          width: '12px',
          height: '12px',
          borderRadius: '50%',
          background: cor,
          flexShrink: 0,
        }} />
        <span style={{
          fontWeight: 800,
          fontSize: '14px',
          textTransform: 'uppercase',
          letterSpacing: '0.5px',
          flex: 1,
        }}>
          {categoria}
        </span>
        <span style={{
          fontSize: '12px',
          background: cor + '22',
          color: cor,
          padding: '2px 8px',
          borderRadius: '20px',
          fontWeight: 700,
        }}>
          {itens.length}
        </span>
        {aberto
          ? <ChevronUp size={18} color="var(--text-soft)" />
          : <ChevronDown size={18} color="var(--text-soft)" />
        }
      </div>

      {/* Itens */}
      {aberto && itens.map(p => (
        <ProdutoItem key={p.id} produto={p} onToggle={onToggle} />
      ))}
    </div>
  )
}

export default CategoriaGrupo