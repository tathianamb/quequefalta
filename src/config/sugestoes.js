import { addDoc, collection, getDocs, query, where, serverTimestamp } from 'firebase/firestore'
import { db } from './firebase'
import { normalizar } from '../utils/texto'

// Sugere um produto novo para o catálogo (vai para a fila de aprovação dos
// admins). Não duplica: se já há uma sugestão pendente com o mesmo nome
// (sem acento/caixa, como faz o bot), não cria outra.
//
// Devolve { jaExistia, gravacao }. A busca de duplicadas é esperada aqui; a
// gravação em si NÃO: a promise do addDoc só resolve quando o servidor
// confirma (com sinal fraco demora), mas a escrita local já vale. Quem chama
// mostra o sucesso na hora e trata o erro em `gravacao.catch(...)`, ou dá
// `await gravacao` quando precisa da confirmação.
export async function sugerirProduto({ nome, categoria = '', subcategoria = '', usuario, listaAtiva }) {
  const alvo = normalizar(nome)
  const pendentes = await getDocs(
    query(collection(db, 'sugestoes'), where('status', '==', 'pendente')),
  )
  if (pendentes.docs.some(d => normalizar(d.data().nome) === alvo)) {
    return { jaExistia: true, gravacao: Promise.resolve() }
  }

  const gravacao = addDoc(collection(db, 'sugestoes'), {
    nome,
    categoria,
    subcategoria,
    sugeridoPor: usuario.email,
    listaAtiva,
    criadoEm: serverTimestamp(),
    status: 'pendente',
  }).then(() => undefined)
  return { jaExistia: false, gravacao }
}
