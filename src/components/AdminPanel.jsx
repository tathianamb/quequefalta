import { useState } from 'react'
import { X, Check, Trash2, Edit2 } from 'lucide-react'
import { ORDEM_CATEGORIAS, corDaCategoria } from '../utils/categorias'

function AdminPanel({ onFechar, sugestoes, pendentes, aprovar, rejeitar, atualizar, deletar, usuario }) {
  const [editando, setEditando] = useState(null)
  const [aba, setAba] = useState('pendentes')

  const todas = sugestoes.filter(s => s.status === 'aprovado' || s.status === 'rejeitado')

  const handleAprovar = async (s) => {
    const jaAprovou = s.aprovadores?.includes(usuario.uid)
    if (jaAprovou) return
    await aprovar(s)
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
          maxHeight: '90vh',
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
          marginBottom: '20px',
        }}>
          <h2 style={{ fontWeight: 900, fontSize: '20px', color: 'var(--text)' }}>
            Painel Admin
          </h2>
          <X size={22} color="var(--text-soft)" style={{ cursor: 'pointer' }} onClick={onFechar} />
        </div>

        {/* Abas */}
        <div style={{
          display: 'flex',
          gap: '8px',
          marginBottom: '20px',
        }}>
          {[
            { id: 'pendentes', label: `Pendentes (${pendentes.length})` },
            { id: 'historico', label: 'Histórico' },
          ].map(({ id, label }) => (
            <button
              key={id}
              onClick={() => setAba(id)}
              style={{
                padding: '8px 16px',
                borderRadius: '20px',
                border: 'none',
                fontFamily: 'Nunito, sans-serif',
                fontWeight: 700,
                fontSize: '13px',
                cursor: 'pointer',
                background: aba === id ? 'var(--text)' : 'var(--bg)',
                color: aba === id ? 'var(--card)' : 'var(--text-soft)',
                transition: 'all 0.2s',
              }}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Pendentes */}
        {aba === 'pendentes' && (
          <div>
            {pendentes.length === 0 && (
              <div style={{ textAlign: 'center', padding: '40px 0' }}>
                <p style={{ fontSize: '40px' }}>✅</p>
                <p style={{ fontWeight: 800, color: 'var(--text)', marginTop: '12px' }}>
                  Nenhuma sugestão pendente!
                </p>
              </div>
            )}
            {pendentes.map(s => {
              const jaAprovou = s.aprovadores?.includes(usuario.uid)
              const cor = corDaCategoria(s.categoria)
              return (
                <div key={s.id} style={{
                  background: 'var(--bg)',
                  borderRadius: '14px',
                  padding: '16px',
                  marginBottom: '12px',
                  borderLeft: `4px solid ${cor}`,
                }}>
                  {editando?.id === s.id ? (
                    // Modo edição
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <input
                        value={editando.nome}
                        onChange={e => setEditando({ ...editando, nome: e.target.value })}
                        style={{
                          padding: '10px',
                          borderRadius: '8px',
                          border: '2px solid #DEE2E6',
                          background: 'var(--card)',
                          fontFamily: 'Nunito, sans-serif',
                          fontSize: '14px',
                          color: 'var(--text)',
                          outline: 'none',
                        }}
                      />
                      <select
                        value={editando.categoria}
                        onChange={e => setEditando({ ...editando, categoria: e.target.value })}
                        style={{
                          padding: '10px',
                          borderRadius: '8px',
                          border: '2px solid #DEE2E6',
                          background: 'var(--card)',
                          fontFamily: 'Nunito, sans-serif',
                          fontSize: '14px',
                          color: 'var(--text)',
                          outline: 'none',
                        }}
                      >
                        {[...ORDEM_CATEGORIAS]
                          .sort((a, b) => a.localeCompare(b, 'pt-BR'))
                          .map(cat => (
                            <option key={cat} value={cat}>{cat}</option>
                          ))}
                        <option value="Outro">Outro</option>
                      </select>
                      <input
                        value={editando.subcategoria}
                        onChange={e => setEditando({ ...editando, subcategoria: e.target.value })}
                        placeholder="Subcategoria"
                        style={{
                          padding: '10px',
                          borderRadius: '8px',
                          border: '2px solid #DEE2E6',
                          background: 'var(--card)',
                          fontFamily: 'Nunito, sans-serif',
                          fontSize: '14px',
                          color: 'var(--text)',
                          outline: 'none',
                        }}
                      />
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                          onClick={async () => {
                            await atualizar(s, {
                              nome: editando.nome,
                              categoria: editando.categoria,
                              subcategoria: editando.subcategoria,
                            })
                            setEditando(null)
                          }}
                          style={{
                            flex: 1,
                            padding: '10px',
                            borderRadius: '8px',
                            border: 'none',
                            background: '#51CF66',
                            color: 'white',
                            fontFamily: 'Nunito, sans-serif',
                            fontWeight: 700,
                            cursor: 'pointer',
                          }}
                        >
                          Salvar
                        </button>
                        <button
                          onClick={() => setEditando(null)}
                          style={{
                            flex: 1,
                            padding: '10px',
                            borderRadius: '8px',
                            border: 'none',
                            background: 'var(--bg)',
                            color: 'var(--text-soft)',
                            fontFamily: 'Nunito, sans-serif',
                            fontWeight: 700,
                            cursor: 'pointer',
                          }}
                        >
                          Cancelar
                        </button>
                      </div>
                    </div>
                  ) : (
                    // Modo visualização
                    <>
                      <div style={{ marginBottom: '10px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <p style={{ fontWeight: 800, fontSize: '16px', color: 'var(--text)' }}>{s.nome}</p>
                          <Edit2
                            size={16}
                            color="var(--text-soft)"
                            style={{ cursor: 'pointer' }}
                            onClick={() => setEditando({ ...s })}
                          />
                        </div>
                        <p style={{ fontSize: '13px', color: 'var(--text-soft)', marginTop: '2px' }}>
                          {s.categoria}{s.subcategoria ? ` › ${s.subcategoria}` : ''}
                        </p>
                        <p style={{ fontSize: '12px', color: 'var(--text-soft)', marginTop: '4px' }}>
                          Sugerido por {s.sugeridoPor}
                        </p>
                        {s.status === 'aguardando_segunda_aprovacao' && (
                          <div style={{
                            marginTop: '8px',
                            padding: '6px 10px',
                            background: '#FFF3BF',
                            borderRadius: '8px',
                            fontSize: '12px',
                            fontWeight: 700,
                            color: '#E67700',
                          }}>
                            ⏳ Aguardando segunda aprovação ({s.aprovadores?.length}/2)
                          </div>
                        )}
                      </div>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                          onClick={() => handleAprovar(s)}
                          disabled={jaAprovou}
                          style={{
                            flex: 1,
                            padding: '10px',
                            borderRadius: '8px',
                            border: 'none',
                            background: jaAprovou ? '#DEE2E6' : '#51CF66',
                            color: jaAprovou ? 'var(--text-soft)' : 'white',
                            fontFamily: 'Nunito, sans-serif',
                            fontWeight: 700,
                            fontSize: '13px',
                            cursor: jaAprovou ? 'default' : 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '6px',
                          }}
                        >
                          <Check size={16} />
                          {jaAprovou ? 'Aprovado por você' : 'Aprovar'}
                        </button>
                        <button
                          onClick={() => rejeitar(s)}
                          style={{
                            flex: 1,
                            padding: '10px',
                            borderRadius: '8px',
                            border: 'none',
                            background: '#FFE3E3',
                            color: '#FA5252',
                            fontFamily: 'Nunito, sans-serif',
                            fontWeight: 700,
                            fontSize: '13px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '6px',
                          }}
                        >
                          <X size={16} />
                          Rejeitar
                        </button>
                        <button
                          onClick={() => deletar(s)}
                          style={{
                            padding: '10px',
                            borderRadius: '8px',
                            border: 'none',
                            background: 'var(--bg)',
                            color: 'var(--text-soft)',
                            cursor: 'pointer',
                          }}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {/* Histórico */}
        {aba === 'historico' && (
          <div>
            {todas.length === 0 && (
              <p style={{ textAlign: 'center', color: 'var(--text-soft)', marginTop: '40px' }}>
                Nenhum histórico ainda.
              </p>
            )}
            {todas.map(s => (
              <div key={s.id} style={{
                background: 'var(--bg)',
                borderRadius: '14px',
                padding: '14px 16px',
                marginBottom: '10px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}>
                <div>
                  <p style={{ fontWeight: 700, color: 'var(--text)' }}>{s.nome}</p>
                  <p style={{ fontSize: '12px', color: 'var(--text-soft)' }}>{s.categoria}</p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{
                    fontSize: '12px',
                    fontWeight: 700,
                    padding: '4px 10px',
                    borderRadius: '20px',
                    background: s.status === 'aprovado' ? '#EBFBEE' : '#FFE3E3',
                    color: s.status === 'aprovado' ? '#2F9E44' : '#FA5252',
                  }}>
                    {s.status === 'aprovado' ? '✓ Aprovado' : '✗ Rejeitado'}
                  </span>
                  <Trash2
                    size={16}
                    color="var(--text-soft)"
                    style={{ cursor: 'pointer' }}
                    onClick={() => deletar(s)}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default AdminPanel