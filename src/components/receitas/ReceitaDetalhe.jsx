import { ArrowLeft, Clock, Users, ShoppingCart, Check } from 'lucide-react'
import { TIPOGRAFIA, RAIO, BOTAO_PRIMARIO } from '../../utils/estilos'

export function ReceitaDetalhe({ receita, itensEmCasa, catalogo, onVoltar, onAdicionarFaltantes, onToggleEmCasa }) {
  const idsEmCasa = new Set(itensEmCasa.map(i => i.produtoId))

  const ingredientesComStatus = receita.ingredientes.map(ing => {
    const produto = catalogo.find(p => p.id === ing.produtoId)

    let temEmCasa = false
    if (ing.nomeTemp) {
      temEmCasa = false
    } else if (ing.grupoSubstituicaoId) {
      temEmCasa = itensEmCasa.some(item =>
        Array.isArray(item.grupoSubstituicao) && item.grupoSubstituicao.includes(ing.nome)
      )
    } else if (ing.produtoId) {
      temEmCasa = idsEmCasa.has(ing.produtoId)
    }

    return {
      ...ing,
      nome: produto?.nome ?? ing.nome ?? 'Produto desconhecido',
      temEmCasa,
    }
  })

  const faltantes = ingredientesComStatus.filter(i => !i.temEmCasa && !i.nomeTemp)
  const temTudo = faltantes.length === 0

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100%' }}>
      {/* Botão voltar */}
      <button
        onClick={onVoltar}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          padding: '0 0 16px 0',
          color: 'var(--text-soft)',
          fontFamily: 'Nunito, sans-serif',
          fontWeight: 600,
          fontSize: '14px',
        }}
      >
        <ArrowLeft size={16} /> Receitas
      </button>

      {/* Foto */}
      {receita.foto && (
        <img
          src={receita.foto}
          alt={receita.nome}
          style={{
            width: '100%',
            height: '200px',
            objectFit: 'cover',
            borderRadius: RAIO.lg,
            marginBottom: '20px',
            display: 'block',
          }}
        />
      )}

      {/* Cabeçalho */}
      <h1 style={{ ...TIPOGRAFIA.titulo, color: 'var(--text)', lineHeight: 1.3, marginBottom: '8px' }}>
        {receita.nome}
      </h1>

      {/* Meta: tempo, porções */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '24px', alignItems: 'center' }}>
        {receita.tempoPreparo && (
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px', ...TIPOGRAFIA.corpo, color: 'var(--text-soft)' }}>
            <Clock size={14} /> {receita.tempoPreparo} min
          </span>
        )}
        {receita.porcoes && (
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px', ...TIPOGRAFIA.corpo, color: 'var(--text-soft)' }}>
            <Users size={14} /> {receita.porcoes} porções
          </span>
        )}
      </div>

      <hr style={{ border: 'none', borderTop: '1px solid var(--borda, #DEE2E6)', marginBottom: '24px' }} />

      {/* Ingredientes */}
      <h2 style={{ ...TIPOGRAFIA.h3, color: 'var(--text)', marginBottom: '12px' }}>Ingredientes</h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '20px' }}>
        {ingredientesComStatus.map((ing, i) => {
          const isNaoVerificado = !!ing.nomeTemp
          return (
            <div
              key={i}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '10px 12px',
                borderRadius: RAIO.md,
                background: isNaoVerificado
                  ? 'var(--card)'
                  : ing.temEmCasa ? 'var(--verde-bg, #EBFBEE)' : 'var(--card)',
                border: `1.5px solid ${isNaoVerificado
                  ? 'var(--borda, #DEE2E6)'
                  : ing.temEmCasa ? 'var(--verde-borda, #69DB7C)' : 'var(--borda, #DEE2E6)'}`,
              }}
            >
              {isNaoVerificado ? (
                /* Ícone ? para ingrediente não verificado */
                <div style={{
                  width: '20px',
                  height: '20px',
                  borderRadius: '50%',
                  background: 'transparent',
                  border: '2px solid var(--laranja)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  color: 'var(--laranja)',
                  fontWeight: 700,
                  fontSize: '12px',
                  lineHeight: 1,
                }}>
                  ?
                </div>
              ) : (
                <div
                  onClick={() => onToggleEmCasa && ing.produtoId && onToggleEmCasa(ing)}
                  style={{
                    width: '20px',
                    height: '20px',
                    borderRadius: '50%',
                    background: ing.temEmCasa ? 'var(--verde, #2F9E44)' : 'transparent',
                    border: `2px solid ${ing.temEmCasa ? 'var(--verde, #2F9E44)' : 'var(--borda, #DEE2E6)'}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    cursor: ing.produtoId ? 'pointer' : 'default',
                  }}
                >
                  {ing.temEmCasa && <Check size={12} color="white" strokeWidth={3} />}
                </div>
              )}
              <span style={{ flex: 1 }}>
                <span style={{
                  ...TIPOGRAFIA.corpo,
                  color: isNaoVerificado ? 'var(--text-soft)' : 'var(--text)',
                  textDecoration: 'none',
                }}>
                  {ing.nome}
                </span>
                {ing.observacao && (
                  <span style={{ ...TIPOGRAFIA.subcategoria, color: 'var(--text-soft)', marginLeft: '6px' }}>
                    {ing.observacao}
                  </span>
                )}
              </span>
              {isNaoVerificado && (
                <span style={{ ...TIPOGRAFIA.label, color: 'var(--laranja)' }}>não verificado</span>
              )}
              {!isNaoVerificado && ing.temEmCasa && (
                <span style={{ ...TIPOGRAFIA.label, color: 'var(--verde, #2F9E44)' }}>em casa</span>
              )}
            </div>
          )
        })}
      </div>

      {/* CTA adicionar faltantes */}
      {!temTudo && faltantes.length > 0 && (
        <button
          onClick={() => onAdicionarFaltantes(faltantes)}
          style={{
            ...BOTAO_PRIMARIO,
            padding: '14px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            marginBottom: '24px',
          }}
        >
          <ShoppingCart size={18} />
          Adicionar {faltantes.length === 1 ? '1 item' : `${faltantes.length} itens`} à lista
        </button>
      )}
      {temTudo && (
        <div style={{
          padding: '14px',
          borderRadius: RAIO.md,
          background: 'var(--verde-bg, #EBFBEE)',
          border: '1.5px solid var(--verde-borda, #69DB7C)',
          textAlign: 'center',
          ...TIPOGRAFIA.corpo,
          color: 'var(--verde, #2F9E44)',
          fontWeight: 600,
          marginBottom: '24px',
        }}>
          Você tem todos os ingredientes em casa!
        </div>
      )}

      <hr style={{ border: 'none', borderTop: '1px solid var(--borda, #DEE2E6)', marginBottom: '24px' }} />

      {/* Modo de preparo */}
      {receita.passos?.length > 0 && (
        <>
          <h2 style={{ ...TIPOGRAFIA.h3, color: 'var(--text)', marginBottom: '16px' }}>Modo de preparo</h2>
          <ol style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {receita.passos.map((passo, i) => (
              <li key={i} style={{ display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
                <span style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  background: 'var(--laranja)',
                  color: '#212529',
                  fontWeight: 800,
                  fontSize: '13px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  marginTop: '1px',
                }}>
                  {i + 1}
                </span>
                <p style={{ ...TIPOGRAFIA.corpo, color: 'var(--text)', lineHeight: 1.6, margin: 0, paddingTop: '4px' }}>
                  {passo}
                </p>
              </li>
            ))}
          </ol>
        </>
      )}
    </div>
  )
}
