import { X } from 'lucide-react'
import { TIPOGRAFIA, RAIO } from '../utils/estilos'

function AdminPanel({ onFechar, modoAdmin, setModoAdmin }) {
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
          borderRadius: `${RAIO.xxl} ${RAIO.xxl} 0 0`,
          padding: '24px 20px 40px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
          <h2 style={{ ...TIPOGRAFIA.h2, color: 'var(--text)' }}>Admin</h2>
          <X size={22} color="var(--text-soft)" style={{ cursor: 'pointer' }} onClick={onFechar} />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px', background: 'var(--bg)', borderRadius: RAIO.md }}>
          <div>
            <p style={{ ...TIPOGRAFIA.nomeProduto, color: 'var(--text)' }}>Modo admin</p>
            <p style={{ ...TIPOGRAFIA.subcategoria, color: 'var(--text-soft)', marginTop: '2px' }}>
              {modoAdmin ? 'Edição ativa · pendentes visíveis' : 'Desativado'}
            </p>
          </div>
          <div
            onClick={() => setModoAdmin(v => !v)}
            style={{
              width: '48px',
              height: '28px',
              borderRadius: RAIO.pill,
              background: modoAdmin ? 'var(--laranja)' : 'var(--text-soft)',
              position: 'relative',
              cursor: 'pointer',
              transition: 'background 0.2s',
              flexShrink: 0,
            }}
          >
            <div style={{
              position: 'absolute',
              top: '3px',
              left: modoAdmin ? '23px' : '3px',
              width: '22px',
              height: '22px',
              borderRadius: '50%',
              background: 'white',
              transition: 'left 0.2s',
              boxShadow: '0 1px 4px rgba(0,0,0,0.2)',
            }} />
          </div>
        </div>
      </div>
    </div>
  )
}

export default AdminPanel