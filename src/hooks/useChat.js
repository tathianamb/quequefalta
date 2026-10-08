import { useSyncExternalStore } from 'react'
import { httpsCallable } from 'firebase/functions'
import { auth, functions } from '../config/firebase'

// O estado do chat vive neste módulo, fora do componente: se a tela do chat
// for fechada enquanto a resposta ainda está a caminho, a requisição segue e a
// resposta é gravada do mesmo jeito (antes ela se perdia, porque o componente
// já tinha sido desmontado).

const perguntarChat = httpsCallable(functions, 'perguntarChat')

const MAX_SALVAS = 40
const MSG_ERRO_PADRAO = 'Não consegui responder agora. Tente de novo em instantes.'

const uidAtual = () => auth.currentUser?.uid || 'anon'
const chaveSalva = (uid) => `quequefalta.chat.${uid}`

// Só a última conversa, por usuário, neste aparelho. localStorage pode lançar
// (janela privada, dados bloqueados), então a conversa segue sem ele.
function lerConversa(uid) {
  try {
    const salvas = JSON.parse(localStorage.getItem(chaveSalva(uid)))
    return Array.isArray(salvas)
      ? salvas.filter((m) => (m?.papel === 'usuario' || m?.papel === 'assistente') && typeof m.texto === 'string')
      : []
  } catch {
    return []
  }
}

function gravarConversa(uid, mensagens) {
  try {
    if (mensagens.length) localStorage.setItem(chaveSalva(uid), JSON.stringify(mensagens.slice(-MAX_SALVAS)))
    else localStorage.removeItem(chaveSalva(uid))
  } catch {
    // sem armazenamento: a conversa vale só enquanto o app está aberto
  }
}

// Erros do servidor vêm como HttpsError com a mensagem já em português;
// falhas de rede/permissão (e o "internal" cru) caem no texto padrão.
function mensagemDoErro(erro) {
  const temMensagemDoServidor =
    ['functions/internal', 'functions/invalid-argument', 'functions/resource-exhausted'].includes(erro?.code) &&
    erro.message && erro.message.toLowerCase() !== 'internal'
  return temMensagemDoServidor ? erro.message : MSG_ERRO_PADRAO
}

let uid = null
let estado = { mensagens: [], enviando: false, naoLida: false }
const ouvintes = new Set()

function atualizar(parcial) {
  estado = { ...estado, ...parcial }
  if ('mensagens' in parcial) gravarConversa(uid, estado.mensagens)
  ouvintes.forEach((fn) => fn())
}

// Troca de usuário (logout/login) recarrega a conversa daquele usuário.
function sincronizarUsuario() {
  const atual = uidAtual()
  if (atual !== uid) {
    uid = atual
    estado = { mensagens: lerConversa(uid), enviando: false, naoLida: false }
  }
}

function assinar(fn) {
  ouvintes.add(fn)
  return () => ouvintes.delete(fn)
}

function obterEstado() {
  sincronizarUsuario()
  return estado
}

async function enviar(conteudo) {
  sincronizarUsuario()
  const mensagem = conteudo.trim()
  if (!mensagem || estado.enviando) return

  const uidDoEnvio = uid
  // Mensagens de erro não entram no contexto enviado ao modelo.
  const historico = estado.mensagens
    .filter((m) => !m.erro)
    .map(({ papel, texto }) => ({ papel, texto }))

  atualizar({ mensagens: [...estado.mensagens, { papel: 'usuario', texto: mensagem }], enviando: true })

  let resposta
  try {
    const { data } = await perguntarChat({ mensagem, historico })
    resposta = { papel: 'assistente', texto: data.resposta }
  } catch (erro) {
    console.error('Erro no chat:', erro)
    resposta = { papel: 'assistente', texto: mensagemDoErro(erro), erro: true }
  }

  // Se o usuário trocou de conta no meio do caminho, a resposta não é dele.
  if (uid !== uidDoEnvio) return
  atualizar({ mensagens: [...estado.mensagens, resposta], enviando: false, naoLida: true })
}

function limpar() {
  if (estado.enviando) return
  atualizar({ mensagens: [], naoLida: false })
}

function marcarLida() {
  if (estado.naoLida) atualizar({ naoLida: false })
}

export function useChat() {
  const { mensagens, enviando, naoLida } = useSyncExternalStore(assinar, obterEstado)
  return { mensagens, enviando, naoLida, enviar, limpar, marcarLida }
}
