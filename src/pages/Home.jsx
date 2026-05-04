import { useEffect, useState } from 'react'
import { signOut } from 'firebase/auth'
import { collection, onSnapshot, doc, updateDoc } from 'firebase/firestore'
import { auth, db } from '../config/firebase'
import { corDaCategoria, ORDEM_CATEGORIAS } from '../utils/categorias'
import CategoriaGrupo from '../components/CategoriaGrupo'
import { ShoppingCart, LogOut } from 'lucide-react'

function Home({ usuario, grupoId }) {
  const [produtos, setProdutos] = useState([])
  const [carregando, setCarregando] = useState(true)

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

  const faltando = produtos.filter(p => !p.temEmCasa)

  const porCategoria = ORDEM_CATEGORIAS.reduce((acc, cat) => {
    const itens = faltando.filter(p => p.categoria === cat)
    if (itens.length > 0) acc[cat] = itens
    return acc
  }, {})

  return (
    <div style={{ minHeight: '100vh', paddingBottom: '32px' }}>
      {/* Header */}
      <div style={{
        background: 'white',
        padding: '16px 20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        boxShadow: 'var(--shadow)',
        position: 'sticky',
        top: 0,
        zIndex: 10,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <ShoppingCart size={24} color="#212529" />
          <span style={{ fontWeight: 900, fontSize: '20px' }}>QueQueFalta</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '13px', color: 'var(--text-soft)' }}>
            {faltando.length} itens
          </span>
          <LogOut
            size={20}
            color="var(--text-soft)"
            style={{ cursor: 'pointer' }}
            onClick={() => signOut(auth)}
          />
        </div>
      </div>

      {/* Conteúdo */}
      <div style={{ padding: '20px 16px' }}>
        {carregando && (
          <p style={{ textAlign: 'center', color: 'var(--text-soft)' }}>Carregando...</p>
        )}

        {!carregando && faltando.length === 0 && (
          <div style={{ textAlign: 'center', marginTop: '60px' }}>
            <p style={{ fontSize: '48px' }}>🎉</p>
            <p style={{ fontWeight: 800, fontSize: '20px', marginTop: '12px' }}>Tudo em casa!</p>
            <p style={{ color: 'var(--text-soft)', marginTop: '4px' }}>Nenhum item faltando por enquanto.</p>
          </div>
        )}

        {Object.entries(porCategoria).map(([categoria, itens]) => (
          <CategoriaGrupo
            key={categoria}
            categoria={categoria}
            itens={itens}
            onToggle={handleToggle}
          />
        ))}
      </div>
    </div>
  )
}

export default Home