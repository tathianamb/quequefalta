import { doc, updateDoc } from 'firebase/firestore'
import { db } from '../config/firebase'
import CategoriaGrupo from '../components/CategoriaGrupo'
import { TIPOGRAFIA } from '../utils/estilos'

function Catalogo({ porCategoria, grupoId, busca }) {
  const handleToggle = async (produto) => {
    const ref = doc(db, 'grupos', grupoId, 'produtos', produto.id)
    await updateDoc(ref, { temEmCasa: !produto.temEmCasa })
  }

  const total = Object.values(porCategoria).flat().length

  return (
    <div style={{ padding: '20px 16px', paddingBottom: '32px' }}>
      {total === 0 && (
        <p style={{ ...TIPOGRAFIA.corpo, textAlign: 'center', color: 'var(--text-soft)', marginTop: '40px' }}>
          Nenhum produto encontrado.
        </p>
      )}
      {Object.entries(porCategoria).map(([categoria, itens]) => (
        <CategoriaGrupo
          key={categoria}
          categoria={categoria}
          itens={itens}
          onToggle={handleToggle}
          busca={busca}
        />
      ))}
    </div>
  )
}

export default Catalogo