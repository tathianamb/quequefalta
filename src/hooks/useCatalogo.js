import { useEffect, useState } from 'react'
import { collection, onSnapshot } from 'firebase/firestore'
import { db } from '../config/firebase'

export function useCatalogo() {
  const [catalogo, setCatalogo] = useState([])
  const [carregando, setCarregando] = useState(true)

  useEffect(() => {
    const ref = collection(db, 'catalogo')
    const unsub = onSnapshot(ref, (snap) => {
      setCatalogo(snap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))
        )
      setCarregando(false)
    })
    return () => unsub()
  }, [])

  return { catalogo, carregando }
}