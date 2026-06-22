import { Check, X, ChefHat } from 'lucide-react'
import { TIPOGRAFIA, RAIO, COR } from '../utils/estilos'

function AdminPanel({ onFechar, modoAdmin, setModoAdmin, receitasPendentes = [], onAprovarReceita, onRejeitarReceita }) {
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
          maxHeight: '80vh',
          overflowY: 'auto',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
          <h2 style={{ ...TIPOGRAFIA.h2, color: 'var(--text)' }}>Admin</h2>
          <X size={22} color="var(--text-soft)" style={{ cursor: 'pointer' }} onClick={onFechar} />
        </div>

        {/* Toggle modo admin */}
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

        {/* Receitas pendentes */}
        {receitasPendentes.length > 0 && (
          <div style={{ marginTop: '24px' }}>
            <p style={{ ...TIPOGRAFIA.label, color: 'var(--text-soft)', marginBottom: '12px' }}>
              Receitas pendentes ({receitasPendentes.length})
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {receitasPendentes.map(r => (
                <div key={r.id} style={{
                  display: 'flex', alignItems: 'center', gap: '10px',
                  padding: '12px', background: 'var(--bg)', borderRadius: RAIO.md,
                }}>
                  <ChefHat size={18} color="var(--text-soft)" style={{ flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ ...TIPOGRAFIA.nomeProduto, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {r.nome}
                    </p>
                    <p style={{ ...TIPOGRAFIA.subcategoria, color: 'var(--text-soft)', marginTop: '2px' }}>
                      {r.categoria} · {r.ingredientes?.length ?? 0} ingredientes
                    </p>
                  </div>
                  <button
                    onClick={() => onAprovarReceita(r)}
                    style={{
                      width: '32px', height: '32px', borderRadius: '50%',
                      background: COR.sucessoBg, border: `1.5px solid ${COR.sucessoBorda}`,
                      cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <Check size={15} color={COR.sucesso} strokeWidth={3} />
                  </button>
                  <button
                    onClick={() => onRejeitarReceita(r)}
                    style={{
                      width: '32px', height: '32px', borderRadius: '50%',
                      background: COR.erroBg, border: `1.5px solid ${COR.erro}`,
                      cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <X size={15} color={COR.erro} strokeWidth={3} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default AdminPanel
