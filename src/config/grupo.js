import { doc, getDoc, setDoc, updateDoc, arrayUnion } from 'firebase/firestore'
import { db } from './firebase'

export async function obterOuCriarGrupo(usuario) {
  const userRef = doc(db, 'usuarios', usuario.uid)
  const userSnap = await getDoc(userRef)

  if (userSnap.exists()) {
    return userSnap.data().grupoId
  }

  return null // primeiro acesso, ainda sem grupo
}

export async function criarGrupo(usuario) {
  const grupoId = usuario.uid
  const grupoRef = doc(db, 'grupos', grupoId)
  const userRef = doc(db, 'usuarios', usuario.uid)

  await setDoc(grupoRef, {
    criadoEm: new Date(),
    membros: [usuario.uid],
    codigo: grupoId.slice(0, 6).toUpperCase() // código curto de 6 caracteres
  })

  await setDoc(userRef, {
    nome: usuario.displayName,
    email: usuario.email,
    grupoId
  })

  return grupoId
}

export async function entrarNoGrupo(usuario, codigo) {
  // busca grupo pelo código
  const { collection, query, where, getDocs } = await import('firebase/firestore')
  const q = query(collection(db, 'grupos'), where('codigo', '==', codigo.toUpperCase()))
  const snap = await getDocs(q)

  if (snap.empty) throw new Error('Código inválido')

  const grupoDoc = snap.docs[0]
  const grupoId = grupoDoc.id

  await updateDoc(grupoDoc.ref, {
    membros: arrayUnion(usuario.uid)
  })

  await setDoc(doc(db, 'usuarios', usuario.uid), {
    nome: usuario.displayName,
    email: usuario.email,
    grupoId
  })

  return grupoId
}