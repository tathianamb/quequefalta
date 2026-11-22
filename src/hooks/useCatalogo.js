import { useEffect, useState } from 'react'
import { collection, onSnapshot } from 'firebase/firestore'
import { db } from '../config/firebase'

export function useCatalogo() {
  const [catalogo, setCatalogo] = useState([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState(false)

  useEffect(() => {
    const ref = collection(db, 'catalogo')
    // Só os documentos que mudaram viram objetos novos: os demais mantêm a
    // identidade, para os cartões de produto (React.memo) não re-renderizarem.
    const porId = new Map()
    const unsub = onSnapshot(ref, (snap) => {
      setErro(false)
      for (const mudanca of snap.docChanges()) {
        if (mudanca.type === 'removed') porId.delete(mudanca.doc.id)
        else porId.set(mudanca.doc.id, { id: mudanca.doc.id, ...mudanca.doc.data() })
      }
      setCatalogo([...porId.values()]
        .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))
        )
      setCarregando(false)
    }, (e) => {
      // Sem isso, um erro de permissão/rede deixava o app em "Carregando...".
      console.error('Erro ao carregar o catálogo:', e)
      setErro(true)
      setCarregando(false)
    })
    return () => unsub()
  }, [])

  return { catalogo, carregando, erro }
}