import { ChefHat, Clock, Users } from 'lucide-react'
import { TIPOGRAFIA, RAIO } from '../../utils/estilos'

function contarFaltantes(receita, itensEmCasa) {
  const idsEmCasa = new Set(itensEmCasa.map(i => i.produtoId))
  return receita.ingredientes.filter(ing => !idsEmCasa.has(ing.produtoId)).length
}

function CardReceita({ receita, itensEmCasa, onClick }) {
  const faltam = contarFaltantes(receita, itensEmCasa)
  const total = receita.ingredientes.length
  const temTudo = faltam === 0
  return (
    <div
      onClick={() => onClick(receita)}
      style={{
        background: 'var(--card)',
        borderRadius: RAIO.lg,
        overflow: 'hidden',
        cursor: 'pointer',
        border: `1.5px solid var(--borda, #DEE2E6)`,
      }}
    >
      {receita.foto ? (
        <img
          src={receita.foto}
          alt={receita.nome}
          style={{ width: '100%', height: '160px', objectFit: 'cover', display: 'block' }}
        />
      ) : (
        <div style={{
          width: '100%',
          height: '100px',
          background: 'var(--bg)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <ChefHat size={36} color="var(--text-soft)" />
        </div>
      )}

      <div style={{ padding: '14px 16px 16px' }}>
        <p style={{ ...TIPOGRAFIA.nomeProduto, color: 'var(--text)', lineHeight: 1.3 }}>
          {receita.nome}
        </p>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '10px' }}>
          {receita.tempoPreparo && (
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px', ...TIPOGRAFIA.subcategoria, color: 'var(--text-soft)' }}>
              <Clock size={12} /> {receita.tempoPreparo} min
            </span>
          )}
          {receita.porcoes && (
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px', ...TIPOGRAFIA.subcategoria, color: 'var(--text-soft)' }}>
              <Users size={12} /> {receita.porcoes} porções
            </span>
          )}
          <span style={{
            ...TIPOGRAFIA.subcategoria,
            color: temTudo ? 'var(--verde, #2F9E44)' : 'var(--laranja)',
            fontWeight: 600,
            marginLeft: 'auto',
          }}>
            {temTudo
              ? `${total} ingredientes em casa`
              : `faltam ${faltam} de ${total}`}
          </span>
        </div>
      </div>
    </div>
  )
}

export function ReceitaLista({ receitas, itensEmCasa, onVerReceita }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Lista de cards */}
      {receitas.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px 0' }}>
          <p style={{ fontSize: '40px' }}>🍽️</p>
          <p style={{ ...TIPOGRAFIA.corpo, color: 'var(--text-soft)', marginTop: '12px' }}>
            Nenhuma receita encontrada
          </p>
        </div>
      ) : (
        receitas.map(r => (
          <CardReceita
            key={r.id}
            receita={r}
            itensEmCasa={itensEmCasa}
            onClick={onVerReceita}
          />
        ))
      )}

    </div>
  )
}
