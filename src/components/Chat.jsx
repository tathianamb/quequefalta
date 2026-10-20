import { useState, useRef, useEffect } from 'react'
import { ArrowLeft, Send, Trash2, Copy, Check, Loader2, ExternalLink } from 'lucide-react'
import { httpsCallable } from 'firebase/functions'
import { functions } from '../config/firebase'
import { useChat } from '../hooks/useChat'
import { TextoDica } from './dicas/DicaDetalhe'
import { FONTE, RAIO, TIPOGRAFIA, COR } from '../utils/estilos'

const SUGESTOES = [
  'Sobremesa rápida com o que tenho em casa',
  'Sugira um jantar leve para hoje',
  'O que posso fazer com o que está na despensa?',
]

// Clipboard API exige contexto seguro; o fallback com textarea cobre o resto.
async function copiarTexto(texto) {
  try {
    await navigator.clipboard.writeText(texto)
    return true
  } catch {
    try {
      const area = document.createElement('textarea')
      area.value = texto
      area.style.position = 'fixed'
      area.style.opacity = '0'
      document.body.appendChild(area)
      area.select()
      const ok = document.execCommand('copy')
      document.body.removeChild(area)
      return ok
    } catch {
      return false
    }
  }
}

const contextoParaClaude = httpsCallable(functions, 'contextoParaClaude')

// Texto final levado ao Claude: contexto da casa (montado no servidor, igual
// ao do Gemini) + a pergunta digitada, se houver.
function montarTextoClaude(contexto, pergunta) {
  const fim = pergunta
    ? `Minha pergunta: ${pergunta}`
    : 'Use esse contexto para me ajudar com o que eu perguntar a seguir.'
  return `${contexto}\n\n${fim}\n\nResponda em português, de forma direta.`
}

export default function Chat({ onFechar }) {
  const { mensagens, enviando, bloqueadoAte, enviar, limpar, marcarLida } = useChat()
  const [agora, setAgora] = useState(() => Date.now())
  const [texto, setTexto] = useState('')
  const [copiada, setCopiada] = useState(null) // índice da mensagem recém-copiada
  // undefined = carregando, null = falhou, string = pronto
  const [contextoClaude, setContextoClaude] = useState(undefined)
  const [avisoClaude, setAvisoClaude] = useState(false)
  const fimRef = useRef(null)

  // Busca o contexto ao abrir o chat, e não no toque do botão: copiar e abrir
  // outra aba só são permitidos durante o próprio toque, e esperar a resposta
  // do servidor antes disso faria o navegador bloquear os dois.
  useEffect(() => {
    let ativo = true
    contextoParaClaude()
      .then(({ data }) => { if (ativo) setContextoClaude(data.contexto) })
      .catch((erro) => {
        console.error('Erro ao montar contexto para o Claude:', erro)
        if (ativo) setContextoClaude(null)
      })
    return () => { ativo = false }
  }, [])

  // Copia (garantia, caso o preenchimento automático não funcione) e abre o
  // claude.ai com o texto no campo de mensagem.
  const perguntarAoClaude = () => {
    if (!contextoClaude) return
    const textoFinal = montarTextoClaude(contextoClaude, texto.trim())
    copiarTexto(textoFinal)
    window.open(`https://claude.ai/new?q=${encodeURIComponent(textoFinal)}`, '_blank', 'noopener')
    setAvisoClaude(true)
    setTimeout(() => setAvisoClaude(false), 6000)
  }

  const copiar = async (indice, conteudo) => {
    if (!(await copiarTexto(conteudo))) return
    setCopiada(indice)
    setTimeout(() => setCopiada((atual) => (atual === indice ? null : atual)), 1800)
  }

  useEffect(() => {
    fimRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
    marcarLida() // resposta que chega com o chat aberto já nasce lida
  }, [mensagens, enviando, marcarLida])

  // Reavalia o bloqueio quando a espera termina (não há outro evento que
  // force um novo render nesse momento).
  useEffect(() => {
    const restante = bloqueadoAte - Date.now()
    if (restante <= 0) return
    const t = setTimeout(() => setAgora(Date.now()), restante + 50)
    return () => clearTimeout(t)
  }, [bloqueadoAte])

  const aguardando = enviando || agora < bloqueadoAte

  const onSubmit = async (e) => {
    e.preventDefault()
    if (aguardando || !texto.trim()) return
    const conteudo = texto
    setTexto('')
    if (!(await enviar(conteudo))) setTexto(conteudo)
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 150,
        display: 'flex',
        justifyContent: 'center',
        background: 'var(--bg)',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '480px',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          background: 'var(--bg)',
        }}
      >
        {/* Cabeçalho */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '16px 20px 12px',
            background: 'var(--card)',
            borderBottom: `1px solid ${COR.divisoria}`,
          }}
        >
          <button
            onClick={onFechar}
            style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              background: 'none', border: 'none', cursor: 'pointer', padding: 0,
              color: 'var(--text-soft)', fontFamily: 'Nunito, sans-serif', fontWeight: 600, fontSize: '14px',
            }}
          >
            <ArrowLeft size={16} /> Voltar
          </button>
          <h2 style={{ ...TIPOGRAFIA.h3, color: 'var(--text)' }}>Chat</h2>
          <button
            onClick={limpar}
            disabled={!mensagens.length || enviando}
            aria-label="Limpar conversa"
            style={{
              background: 'none', border: 'none', padding: 0,
              cursor: mensagens.length && !enviando ? 'pointer' : 'default',
              opacity: mensagens.length && !enviando ? 1 : 0.3,
              display: 'flex',
            }}
          >
            <Trash2 size={18} color="var(--text-soft)" />
          </button>
        </div>

        {/* Conversa */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {mensagens.length === 0 && (
            <div style={{ margin: 'auto 0', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <p style={{ ...TIPOGRAFIA.corpo, color: 'var(--text-soft)', textAlign: 'center', marginBottom: '6px' }}>
                Pergunte sobre receitas, cardápio ou o que fazer com o que tem em casa.
              </p>
              {SUGESTOES.map((s) => (
                <button
                  key={s}
                  onClick={() => enviar(s)}
                  disabled={aguardando}
                  style={{
                    textAlign: 'left',
                    padding: '12px 14px',
                    borderRadius: RAIO.md,
                    border: `1.5px solid ${COR.borda}`,
                    background: 'var(--card)',
                    color: 'var(--text)',
                    fontFamily: 'Nunito, sans-serif',
                    fontSize: FONTE.md,
                    cursor: 'pointer',
                  }}
                >
                  {s}
                </button>
              ))}
            </div>
          )}

          {mensagens.map((m, i) => {
            const doUsuario = m.papel === 'usuario'
            return (
              <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: doUsuario ? 'flex-end' : 'flex-start', gap: '4px' }}>
                <div
                  style={{
                    maxWidth: '88%',
                    padding: '10px 14px',
                    borderRadius: RAIO.lg,
                    background: doUsuario ? 'var(--amarelo)' : m.erro ? COR.erroBg : 'var(--card)',
                    color: doUsuario ? '#212529' : m.erro ? COR.erro : 'var(--text)',
                    border: doUsuario ? 'none' : `1px solid ${COR.divisoria}`,
                    fontSize: FONTE.md,
                    lineHeight: 1.5,
                    wordBreak: 'break-word',
                    whiteSpace: doUsuario || m.erro ? 'pre-wrap' : 'normal',
                  }}
                >
                  {doUsuario || m.erro ? m.texto : <TextoDica texto={m.texto} />}
                </div>
                {!doUsuario && !m.erro && (
                  <button
                    onClick={() => copiar(i, m.texto)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '5px',
                      background: 'none', border: 'none', cursor: 'pointer', padding: '2px 6px',
                      color: copiada === i ? COR.sucesso : 'var(--text-soft)',
                      fontFamily: 'Nunito, sans-serif', fontSize: FONTE.sm, fontWeight: FONTE.semibold,
                    }}
                  >
                    {copiada === i ? <Check size={14} /> : <Copy size={14} />}
                    {copiada === i ? 'Copiado' : 'Copiar'}
                  </button>
                )}
              </div>
            )
          })}

          {enviando && (
            <div style={{ display: 'flex' }}>
              <div
                style={{
                  padding: '10px 14px',
                  borderRadius: RAIO.lg,
                  background: 'var(--card)',
                  border: `1px solid ${COR.divisoria}`,
                  color: 'var(--text-soft)',
                  fontSize: FONTE.md,
                }}
              >
                Pensando...
              </div>
            </div>
          )}
          <div ref={fimRef} />
        </div>

        {/* Levar a pergunta ao Claude (conta do próprio usuário no claude.ai) */}
        <div
          style={{
            padding: '10px 16px 0',
            background: 'var(--card)',
            borderTop: `1px solid ${COR.divisoria}`,
          }}
        >
          <button
            type="button"
            onClick={perguntarAoClaude}
            disabled={!contextoClaude}
            style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              padding: '6px 12px',
              borderRadius: RAIO.pill,
              border: `1.5px solid ${COR.borda}`,
              background: 'var(--bg)',
              color: 'var(--text)',
              opacity: contextoClaude ? 1 : 0.5,
              cursor: contextoClaude ? 'pointer' : 'default',
              fontFamily: 'Nunito, sans-serif', fontSize: FONTE.sm, fontWeight: FONTE.bold,
            }}
          >
            <ExternalLink size={14} />
            {contextoClaude === undefined
              ? 'Preparando contexto...'
              : contextoClaude === null
                ? 'Claude indisponível agora'
                : texto.trim() ? 'Perguntar isso ao Claude' : 'Perguntar ao Claude'}
          </button>
          {avisoClaude && (
            <p style={{ ...TIPOGRAFIA.subcategoria, color: 'var(--text-soft)', marginTop: '6px' }}>
              Texto copiado com o contexto da casa. Se não aparecer no Claude, é só colar.
            </p>
          )}
        </div>

        {/* Entrada */}
        <form
          onSubmit={onSubmit}
          style={{
            display: 'flex',
            gap: '10px',
            padding: '10px 16px calc(12px + env(safe-area-inset-bottom))',
            background: 'var(--card)',
          }}
        >
          <input
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            maxLength={1000}
            placeholder="Escreva sua pergunta..."
            style={{
              flex: 1,
              padding: '10px 14px',
              borderRadius: RAIO.pill,
              border: 'none',
              outline: 'none',
              background: 'var(--bg)',
              color: 'var(--text)',
              fontFamily: 'Nunito, sans-serif',
              fontSize: FONTE.lg,
            }}
          />
          <button
            type="submit"
            disabled={!texto.trim() || aguardando}
            aria-label="Enviar"
            style={{
              width: '42px',
              height: '42px',
              borderRadius: RAIO.full,
              border: 'none',
              background: 'linear-gradient(135deg, var(--amarelo), var(--laranja))',
              opacity: !texto.trim() || aguardando ? 0.5 : 1,
              cursor: !texto.trim() || aguardando ? 'default' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {aguardando
              ? <Loader2 size={18} color="#212529" style={{ animation: 'girar 1s linear infinite' }} />
              : <Send size={18} color="#212529" />}
          </button>
        </form>
      </div>
    </div>
  )
}
