import { useState } from 'react'
import { doc, updateDoc, arrayUnion } from 'firebase/firestore'
import { db } from '../config/firebase'
import { corDaCategoria } from '../utils/categorias'
import { X, Plus } from 'lucide-react'

const MERCADOS = ['Atacadão', 'Max', 'Avenida', 'Superbom']

function DetalhesProduto({ produto, onFechar, grupoId, itemDaLista }) {
  const [mercado, setMercado] = useState('')
  const [preco, setPreco] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [sucesso, setSucesso] = useState(false)

  const cor = corDaCategoria(produto.categoria)

  const historico = (produto.historico || [])
    .slice()
    .sort((a, b) => b.data?.toDate?.() - a.data?.toDate?.())

  const melhorPreco = () => {
    if (!historico.length) return null
    const porMercado = {}
    historico.forEach(h => {
      if (!porMercado[h.mercado] || h.preco < porMercado[h.mercado]) {
        porMercado[h.mercado] = h.preco
      }
    })
    const melhor = Object.entries(porMercado).sort((a, b) => a[1] - b[1])[0]
    return melhor ? { mercado: melhor[0], preco: melhor[1] } : null
  }

  const handleRegistrar = async () => {
    if (!mercado || !preco) return
    setSalvando(true)
    try {
      const ref = doc(db, 'catalogo', produto.id)
      await updateDoc(ref, {
        historico: arrayUnion({
          mercado,
          preco: parseFloat(preco.replace(',', '.')),
          data: new Date(),
          grupoId,
        })
      })
      setSucesso(true)
      setMercado('')
      setPreco('')
      setTimeout(() => setSucesso(false), 2000)
    } finally {
      setSalvando(false)
    }
  }

  const melhor = melhorPreco()

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 100,
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'flex-end',
      background: 'rgba(0,0,0,0.4)',
    }}
      onClick={onFechar}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: 'var(--card)',
          borderRadius: '24px 24px 0 0',
          padding: '24px 20px 40px',
          maxHeight: '85vh',
          overflowY: 'auto',
        }}
      >
        {/* Handle */}
        <div style={{
          width: '40px',
          height: '4px',
          background: '#DEE2E6',
          borderRadius: '2px',
          margin: '0 auto 20px',
        }} />

        {/* Header */}
        <div style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          marginBottom: '20px',
        }}>
          <div>
            <div style={{
              display: 'inline-block',
              background: cor + '22',
              color: cor,
              fontSize: '12px',
              fontWeight: 700,
              padding: '3px 10px',
              borderRadius: '20px',
              marginBottom: '6px',
            }}>
              {produto.categoria}
            </div>
            <h2 style={{ fontWeight: 900, fontSize: '22px', lineHeight: 1.2 }}>
              {produto.nome}
            </h2>
            {produto.subcategoria && (
              <p style={{ color: 'var(--text-soft)', fontSize: '14px', marginTop: '2px' }}>
                {produto.subcategoria}
              </p>
            )}
          </div>
          <X
            size={22}
            color="var(--text-soft)"
            style={{ cursor: 'pointer', flexShrink: 0 }}
            onClick={onFechar}
          />
        </div>

        {/* Melhor preço */}
        {melhor && (
          <div style={{
            background: '#EBFBEE',
            border: '1px solid #69DB7C',
            borderRadius: '12px',
            padding: '12px 16px',
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}>
            <div>
              <p style={{ fontSize: '12px', color: '#2F9E44', fontWeight: 700 }}>Melhor preço registrado</p>
              <p style={{ fontWeight: 900, fontSize: '20px', color: '#2F9E44' }}>
                R$ {melhor.preco.toFixed(2).replace('.', ',')}
              </p>
            </div>
            <p style={{ fontWeight: 700, color: '#2F9E44', fontSize: '15px' }}>{melhor.mercado}</p>
          </div>
        )}

        {/* Registrar preço */}
        <div style={{
          background: 'var(--bg)',
          borderRadius: '16px',
          padding: '16px',
          marginBottom: '24px',
        }}>
          <p style={{ fontWeight: 800, fontSize: '15px', marginBottom: '12px' }}>
            Registrar preço
          </p>

          {/* Mercados */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '8px',
            marginBottom: '12px',
          }}>
            {MERCADOS.map(m => (
              <button
                key={m}
                onClick={() => setMercado(m)}
                style={{
                  padding: '10px',
                  borderRadius: '10px',
                  border: `2px solid ${mercado === m ? '#FE5F01' : '#DEE2E6'}`,
                  background: mercado === m ? cor + '22' : 'var(--card)',
                  color: mercado === m ? '#FE5F01' : 'var(--text)',
                  fontFamily: 'Nunito, sans-serif',
                  fontWeight: 700,
                  fontSize: '14px',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
              >
                {m}
              </button>
            ))}
          </div>

          {/* Preço */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            background: 'var(--card)',
            borderRadius: '10px',
            border: '2px solid #DEE2E6',
            padding: '10px 14px',
            marginBottom: '12px',
            gap: '8px',
          }}>
            <span style={{ fontWeight: 700, color: 'var(--text-soft)' }}>R$</span>
            <input
              type="number"
              inputMode="decimal"
              placeholder="0,00"
              value={preco}
              onChange={e => setPreco(e.target.value)}
              style={{
                border: 'none',
                outline: 'none',
                fontFamily: 'Nunito, sans-serif',
                fontSize: '16px',
                fontWeight: 700,
                flex: 1,
                color: 'var(--text)',
                background: 'transparent',
              }}
            />
          </div>

          <button
            onClick={handleRegistrar}
            disabled={!mercado || !preco || salvando}
            style={{
              width: '100%',
              padding: '14px',
              borderRadius: '12px',
              border: 'none',
              background: !mercado || !preco ? '#DEE2E6' : '#FE5F01',
              color: !mercado || !preco ? 'var(--text-soft)' : 'white',
              fontFamily: 'Nunito, sans-serif',
              fontWeight: 800,
              fontSize: '16px',
              cursor: !mercado || !preco ? 'default' : 'pointer',
              transition: 'all 0.2s',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
            }}
          >
            <Plus size={18} />
            {sucesso ? 'Registrado! ✓' : salvando ? 'Salvando...' : 'Registrar'}
          </button>
        </div>

        {/* Histórico */}
        {historico.length > 0 && (
          <div>
            <p style={{ fontWeight: 800, fontSize: '15px', marginBottom: '12px' }}>
              Histórico de preços
            </p>
            {historico.map((h, i) => (
              <div key={i} style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '10px 0',
                borderBottom: i < historico.length - 1 ? '1px solid #F1F3F5' : 'none',
              }}>
                <div>
                  <p style={{ fontWeight: 700, fontSize: '15px' }}>{h.mercado}</p>
                  <p style={{ fontSize: '12px', color: 'var(--text-soft)' }}>
                    {h.data?.toDate
                      ? h.data.toDate().toLocaleDateString('pt-BR')
                      : new Date(h.data).toLocaleDateString('pt-BR')}
                  </p>
                </div>
                <p style={{ fontWeight: 800, fontSize: '17px' }}>
                  R$ {h.preco.toFixed(2).replace('.', ',')}
                </p>
              </div>
            ))}
          </div>
        )}

        {historico.length === 0 && (
          <p style={{ textAlign: 'center', color: 'var(--text-soft)', fontSize: '14px' }}>
            Nenhum preço registrado ainda.
          </p>
        )}
      </div>
    </div>
  )
}

export default DetalhesProduto