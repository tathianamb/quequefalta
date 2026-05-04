import { Check, Plus, ShoppingCart } from 'lucide-react'
import { corDaCategoria } from '../utils/categorias'

function ProdutoItem({ produto, onToggle, onAbrir, naLista, comprado }) {
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
        borderLeft: `4px solid ${cor}`,
        opacity: comprado ? 0.4 : 1,
        transition: 'opacity 0.2s',
      }}
    >
      {/* Ação esquerda — checkbox ou adicionar */}
      <div
        onClick={() => onToggle && onToggle(produto)}
        style={{
          width: '28px',
          height: '28px',
          borderRadius: '8px',
          border: `2px solid ${naLista || comprado ? cor : '#DEE2E6'}`,
          background: comprado ? cor : naLista ? cor + '22' : 'transparent',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          transition: 'all 0.2s',
          cursor: onToggle ? 'pointer' : 'default',
        }}
      >
        {comprado && <Check size={16} color="white" strokeWidth={3} />}
        {naLista && !comprado && <ShoppingCart size={14} color={cor} />}
        {!naLista && !comprado && onToggle && <Plus size={14} color="#DEE2E6" />}
      </div>

      {/* Nome — abre detalhe */}
      <div
        onClick={() => onAbrir && onAbrir(produto)}
        style={{ flex: 1, cursor: onAbrir ? 'pointer' : 'default' }}
      >
        <p style={{
          fontWeight: 700,
          fontSize: '15px',
          textDecoration: comprado ? 'line-through' : 'none',
          color: comprado ? 'var(--text-soft)' : 'var(--text)',
        }}>
          {produto.nome}
        </p>
        <p style={{ fontSize: '12px', color: 'var(--text-soft)' }}>
          {produto.subcategoria !== '-' ? produto.subcategoria : produto.categoria}
        </p>
      </div>
    </div>
  )
}

export default ProdutoItem