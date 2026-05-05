import { useState, useEffect } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { corDaCategoria } from '../utils/categorias'
import ProdutoItem from './ProdutoItem'

function CategoriaGrupo({ categoria, itens, onToggle, onAbrir, busca, itensDaLista, collapsed, corOverride, onRemover }) {
  const [aberto, setAberto] = useState(!collapsed)

  useEffect(() => {
    if (busca && busca.length > 0) setAberto(true)
  }, [busca])

  const cor = corOverride || corDaCategoria(categoria)

  return (
    <div style={{ marginBottom: '16px' }}>
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

      {aberto && itens.map(p => (
        <ProdutoItem
          key={p.id}
          produto={p}
          onToggle={onToggle}
          onAbrir={onAbrir}
          naLista={itensDaLista?.some(i => i.produtoId === p.id)}
          comprado={p.comprado}
          onRemover={onRemover}
        />
      ))}
    </div>
  )
}

export default CategoriaGrupo