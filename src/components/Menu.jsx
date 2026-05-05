import { useState } from 'react'
import { X, Moon, Sun, Lightbulb, Link, Shield } from 'lucide-react'
import { addDoc, collection, serverTimestamp } from 'firebase/firestore'
import { db } from '../config/firebase'
import { ORDEM_CATEGORIAS } from '../utils/categorias'

function Menu({ onFechar, escuro, toggleTema, grupoId, usuario, isAdmin, onAbrirAdmin }) {
  const [tela, setTela] = useState('menu') // 'menu' | 'sugestao' | 'receitas'
  const [nome, setNome] = useState('')
  const [categoria, setCategoria] = useState('')
  const [subcategoria, setSubcategoria] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [sucesso, setSucesso] = useState(false)

  const handleSugestao = async () => {
    if (!nome || !categoria) return
    setEnviando(true)
    try {
      await addDoc(collection(db, 'sugestoes'), {
        nome,
        categoria,
        subcategoria,
        sugeridoPor: usuario.email,
        grupoId,
        criadoEm: serverTimestamp(),
        status: 'pendente'
      })
      setSucesso(true)
      setNome('')
      setCategoria('')
      setSubcategoria('')
      setTimeout(() => { setSucesso(false); setTela('menu') }, 2000)
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div
      style={{
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
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '24px',
        }}>
          <h2 style={{ fontWeight: 900, fontSize: '20px', color: 'var(--text)' }}>
            {tela === 'menu' && 'Menu'}
            {tela === 'sugestao' && 'Sugerir produto'}
            {tela === 'receitas' && 'Receitas'}
          </h2>
          <X
            size={22}
            color="var(--text-soft)"
            style={{ cursor: 'pointer' }}
            onClick={tela === 'menu' ? onFechar : () => setTela('menu')}
          />
        </div>

        {/* Tela Menu */}
        {tela === 'menu' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>

            {/* Modo escuro */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '16px',
              background: 'var(--bg)',
              borderRadius: '14px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                {escuro
                  ? <Sun size={20} color="var(--text-soft)" />
                  : <Moon size={20} color="var(--text-soft)" />
                }
                <span style={{ fontWeight: 700, color: 'var(--text)' }}>
                  {escuro ? 'Modo claro' : 'Modo escuro'}
                </span>
              </div>
              <div
                onClick={toggleTema}
                style={{
                  width: '48px',
                  height: '28px',
                  borderRadius: '14px',
                  background: escuro ? '#4DABF7' : '#DEE2E6',
                  position: 'relative',
                  cursor: 'pointer',
                  transition: 'background 0.2s',
                }}
              >
                <div style={{
                  position: 'absolute',
                  top: '4px',
                  left: escuro ? '24px' : '4px',
                  width: '20px',
                  height: '20px',
                  borderRadius: '50%',
                  background: 'white',
                  transition: 'left 0.2s',
                  boxShadow: '0 1px 4px rgba(0,0,0,0.2)',
                }} />
              </div>
            </div>

            {/* Sugerir produto */}
            <div
              onClick={() => setTela('sugestao')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '16px',
                background: 'var(--bg)',
                borderRadius: '14px',
                cursor: 'pointer',
              }}
            >
              <Lightbulb size={20} color="var(--text-soft)" />
              <span style={{ fontWeight: 700, color: 'var(--text)', flex: 1 }}>
                Sugerir produto
              </span>
              <span style={{ color: 'var(--text-soft)', fontSize: '18px' }}>›</span>
            </div>

            {/* Receitas */}
            <div
              onClick={() => setTela('receitas')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '16px',
                background: 'var(--bg)',
                borderRadius: '14px',
                cursor: 'pointer',
              }}
            >
              <Link size={20} color="var(--text-soft)" />
              <div style={{ flex: 1 }}>
                <span style={{ fontWeight: 700, color: 'var(--text)' }}>Receitas</span>
                <p style={{ fontSize: '12px', color: 'var(--text-soft)', marginTop: '2px' }}>Em breve</p>
              </div>
              <span style={{ color: 'var(--text-soft)', fontSize: '18px' }}>›</span>
            </div>

            {/* Admin — só para admins */}
            {isAdmin && (
            <div
                onClick={() => { onFechar(); onAbrirAdmin() }}
                style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '16px',
                background: 'var(--bg)',
                borderRadius: '14px',
                cursor: 'pointer',
                }}
            >
                <Shield size={20} color="#FA5252" />
                <span style={{ fontWeight: 700, color: '#FA5252', flex: 1 }}>
                Painel Admin
                </span>
                <span style={{ color: 'var(--text-soft)', fontSize: '18px' }}>›</span>
            </div>
            )}
          </div>
        )}

        {/* Tela Sugestão */}
        {tela === 'sugestao' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <p style={{ color: 'var(--text-soft)', fontSize: '14px', marginBottom: '4px' }}>
              Encontrou um produto que não está no catálogo? Sugira e avaliaremos a inclusão!
            </p>

            <input
              value={nome}
              onChange={e => setNome(e.target.value)}
              placeholder="Nome do produto *"
              style={{
                padding: '14px',
                borderRadius: '12px',
                border: '2px solid #DEE2E6',
                background: 'var(--bg)',
                fontFamily: 'Nunito, sans-serif',
                fontSize: '15px',
                color: 'var(--text)',
                outline: 'none',
              }}
            />

            <select
            value={categoria}
            onChange={e => setCategoria(e.target.value)}
            style={{
                padding: '14px',
                borderRadius: '12px',
                border: '2px solid #DEE2E6',
                background: 'var(--bg)',
                fontFamily: 'Nunito, sans-serif',
                fontSize: '15px',
                color: categoria ? 'var(--text)' : 'var(--text-soft)',
                outline: 'none',
            }}
            >
            <option value="">Categoria *</option>
            {[...ORDEM_CATEGORIAS]
                .sort((a, b) => a.localeCompare(b, 'pt-BR'))
                .map(cat => (
                <option key={cat} value={cat}>{cat}</option>
                ))
            }
            <option value="Outro">Outro</option>
            </select>

            <input
              value={subcategoria}
              onChange={e => setSubcategoria(e.target.value)}
              placeholder="Subcategoria (opcional)"
              style={{
                padding: '14px',
                borderRadius: '12px',
                border: '2px solid #DEE2E6',
                background: 'var(--bg)',
                fontFamily: 'Nunito, sans-serif',
                fontSize: '15px',
                color: 'var(--text)',
                outline: 'none',
              }}
            />

            <button
              onClick={handleSugestao}
              disabled={!nome || !categoria || enviando}
              style={{
                padding: '14px',
                borderRadius: '12px',
                border: 'none',
                background: !nome || !categoria ? '#DEE2E6' : '#4DABF7',
                color: !nome || !categoria ? 'var(--text-soft)' : 'white',
                fontFamily: 'Nunito, sans-serif',
                fontWeight: 800,
                fontSize: '16px',
                cursor: !nome || !categoria ? 'default' : 'pointer',
                marginTop: '4px',
              }}
            >
              {sucesso ? 'Sugestão enviada! ✓' : enviando ? 'Enviando...' : 'Enviar sugestão'}
            </button>
          </div>
        )}

        {/* Tela Receitas */}
        {tela === 'receitas' && (
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <p style={{ fontSize: '48px' }}>👨‍🍳</p>
            <p style={{ fontWeight: 800, fontSize: '20px', marginTop: '16px', color: 'var(--text)' }}>
              Em breve!
            </p>
            <p style={{ color: 'var(--text-soft)', marginTop: '8px', lineHeight: 1.5 }}>
              Em breve você poderá vincular receitas aos produtos e adicionar os ingredientes faltantes à lista com um toque.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

export default Menu