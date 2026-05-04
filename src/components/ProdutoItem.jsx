import { Check } from 'lucide-react'
import { corDaCategoria } from '../utils/categorias'

function ProdutoItem({ produto, onToggle }) {
  const cor = corDaCategoria(produto.categoria)

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '14px 16px',
        background: 'var(--card)',
        borderRadius: '12px',
        marginBottom: '8px',
        boxShadow: 'var(--shadow)',
        cursor: 'pointer',
        borderLeft: `4px solid ${cor}`,
        transition: 'opacity 0.2s',
        opacity: produto.temEmCasa ? 0.4 : 1,
      }}
      onClick={() => onToggle(produto)}
    >
      <div
        style={{
          width: '28px',
          height: '28px',
          borderRadius: '8px',
          border: `2px solid ${cor}`,
          background: produto.temEmCasa ? cor : 'transparent',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          transition: 'all 0.2s',
        }}
      >
        {produto.temEmCasa && <Check size={16} color="white" strokeWidth={3} />}
      </div>
      <div style={{ flex: 1 }}>
        <p style={{ fontWeight: 700, fontSize: '15px' }}>{produto.nome}</p>
        <p style={{ fontSize: '12px', color: 'var(--text-soft)' }}>{produto.subcategoria}</p>
      </div>
    </div>
  )
}

export default ProdutoItem