import { useEffect, useState } from 'react'
import { signOut } from 'firebase/auth'
import { collection, onSnapshot, doc, updateDoc } from 'firebase/firestore'
import { auth, db } from '../config/firebase'
import { ORDEM_CATEGORIAS, corDaCategoria } from '../utils/categorias'
import CategoriaGrupo from '../components/CategoriaGrupo'
import Catalogo from './Catalogo'
import { ShoppingCart, BookOpen, LogOut, Search, X } from 'lucide-react'

function Home({ usuario, grupoId }) {
  const [produtos, setProdutos] = useState([])
  const [carregando, setCarregando] = useState(true)
  const [aba, setAba] = useState('lista')
  const [busca, setBusca] = useState('')
  const [categoriaFiltro, setCategoriaFiltro] = useState(null)

  useEffect(() => {
    if (!grupoId) return
    const ref = collection(db, 'grupos', grupoId, 'produtos')
    const unsub = onSnapshot(ref, (snap) => {
      const lista = snap.docs.map(d => ({ id: d.id, ...d.data() }))
      setProdutos(lista)
      setCarregando(false)
    })
    return () => unsub()
  }, [grupoId])

  const handleToggle = async (produto) => {
    const ref = doc(db, 'grupos', grupoId, 'produtos', produto.id)
    await updateDoc(ref, { temEmCasa: !produto.temEmCasa })
  }

  const filtrar = (lista) => lista.filter(p => {
    const buscaOk = p.nome.toLowerCase().includes(busca.toLowerCase())
    const categoriaOk = !categoriaFiltro || p.categoria === categoriaFiltro
    return buscaOk && categoriaOk
  })

  const faltando = busca
  ? filtrar(produtos)
  : filtrar(produtos.filter(p => !p.temEmCasa))
  const todosFiltrados = filtrar(produtos)

  const agrupar = (lista) => ORDEM_CATEGORIAS.reduce((acc, cat) => {
    const itens = lista.filter(p => p.categoria === cat)
    if (itens.length > 0) acc[cat] = itens
    return acc
  }, {})

  const porCategoriaLista = agrupar(faltando)
  const porCatalogoCatalogo = agrupar(todosFiltrados)

  return (
    <div style={{ minHeight: '100vh', paddingBottom: '72px' }}>

      {/* Header */}
      <div style={{
        background: 'white',
        boxShadow: 'var(--shadow)',
        position: 'sticky',
        top: 0,
        zIndex: 10,
      }}>
        {/* Título */}
        <div style={{
          padding: '16px 20px 12px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <ShoppingCart size={24} color="#212529" />
            <span style={{ fontWeight: 900, fontSize: '20px' }}>QueQueFalta</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {aba === 'lista' && (
              <span style={{ fontSize: '13px', color: 'var(--text-soft)' }}>
                {faltando.length} itens
              </span>
            )}
            <LogOut
              size={20}
              color="var(--text-soft)"
              style={{ cursor: 'pointer' }}
              onClick={() => signOut(auth)}
            />
          </div>
        </div>

        {/* Busca */}
        <div style={{ padding: '0 16px 12px' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            background: 'var(--bg)',
            borderRadius: '12px',
            padding: '10px 14px',
          }}>
            <Search size={18} color="var(--text-soft)" />
            <input
              value={busca}
              onChange={e => setBusca(e.target.value)}
              placeholder="Buscar produto..."
              style={{
                border: 'none',
                background: 'transparent',
                outline: 'none',
                fontFamily: 'Nunito, sans-serif',
                fontSize: '15px',
                flex: 1,
                color: 'var(--text)',
              }}
            />
            {busca && (
              <X
                size={16}
                color="var(--text-soft)"
                style={{ cursor: 'pointer' }}
                onClick={() => setBusca('')}
              />
            )}
          </div>
        </div>

        {/* Filtro de categorias */}
        <div style={{
          display: 'flex',
          gap: '8px',
          overflowX: 'auto',
          padding: '0 16px 12px',
          scrollbarWidth: 'none',
        }}>
          <button
            onClick={() => setCategoriaFiltro(null)}
            style={{
              flexShrink: 0,
              padding: '6px 14px',
              borderRadius: '20px',
              border: 'none',
              fontFamily: 'Nunito, sans-serif',
              fontWeight: 700,
              fontSize: '13px',
              cursor: 'pointer',
              background: !categoriaFiltro ? '#212529' : 'var(--bg)',
              color: !categoriaFiltro ? 'white' : 'var(--text-soft)',
              transition: 'all 0.2s',
            }}
          >
            Todas
          </button>
          {ORDEM_CATEGORIAS.map(cat => {
            const cor = corDaCategoria(cat)
            const ativo = categoriaFiltro === cat
            return (
              <button
                key={cat}
                onClick={() => setCategoriaFiltro(ativo ? null : cat)}
                style={{
                  flexShrink: 0,
                  padding: '6px 14px',
                  borderRadius: '20px',
                  border: 'none',
                  fontFamily: 'Nunito, sans-serif',
                  fontWeight: 700,
                  fontSize: '13px',
                  cursor: 'pointer',
                  background: ativo ? cor : cor + '22',
                  color: ativo ? 'white' : cor,
                  transition: 'all 0.2s',
                }}
              >
                {cat}
              </button>
            )
          })}
        </div>
      </div>

      {/* Conteúdo Lista */}
      {aba === 'lista' && (
        <div style={{ padding: '20px 16px' }}>
          {carregando && (
            <p style={{ textAlign: 'center', color: 'var(--text-soft)' }}>Carregando...</p>
          )}
          {!carregando && faltando.length === 0 && (
            <div style={{ textAlign: 'center', marginTop: '60px' }}>
              <p style={{ fontSize: '48px' }}>🎉</p>
              <p style={{ fontWeight: 800, fontSize: '20px', marginTop: '12px' }}>
                {busca ? 'Nenhum item encontrado!' : 'Tudo em casa!'}
              </p>
              <p style={{ color: 'var(--text-soft)', marginTop: '4px' }}>
                {busca ? 'Tente outro termo de busca.' : 'Nenhum item faltando por enquanto.'}
              </p>
            </div>
          )}
          {Object.entries(porCategoriaLista).map(([categoria, itens]) => (
            <CategoriaGrupo
              key={categoria}
              categoria={categoria}
              itens={itens}
              onToggle={handleToggle}
              busca={busca}
            />
          ))}
        </div>
      )}

      {/* Conteúdo Catálogo */}
      {aba === 'catalogo' && (
        <Catalogo
          porCategoria={porCatalogoCatalogo}
          grupoId={grupoId}
          busca={busca}
        />
      )}

      {/* Navegação inferior */}
      <div style={{
        position: 'fixed',
        bottom: 0,
        left: '50%',
        transform: 'translateX(-50%)',
        width: '100%',
        maxWidth: '480px',
        background: 'white',
        borderTop: '1px solid #F1F3F5',
        display: 'flex',
        zIndex: 20,
      }}>
        {[
          { id: 'lista', label: 'Lista', icon: ShoppingCart },
          { id: 'catalogo', label: 'Catálogo', icon: BookOpen },
        ].map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setAba(id)}
            style={{
              flex: 1,
              padding: '12px 0',
              border: 'none',
              background: 'transparent',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '4px',
              color: aba === id ? '#212529' : 'var(--text-soft)',
              fontFamily: 'Nunito, sans-serif',
              fontWeight: aba === id ? 800 : 600,
              fontSize: '12px',
              transition: 'all 0.2s',
              borderTop: aba === id ? '2px solid #212529' : '2px solid transparent',
            }}
          >
            <Icon size={20} />
            {label}
          </button>
        ))}
      </div>
    </div>
  )
}

export default Home