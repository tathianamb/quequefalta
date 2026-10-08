import { useState, useRef, useEffect } from 'react'
import { httpsCallable } from 'firebase/functions'
import { ArrowLeft, Send, Trash2 } from 'lucide-react'
import { functions } from '../config/firebase'
import { TextoDica } from './dicas/DicaDetalhe'
import { FONTE, RAIO, TIPOGRAFIA, COR } from '../utils/estilos'

const perguntarChat = httpsCallable(functions, 'perguntarChat')

const SUGESTOES = [
  'Sobremesa rápida com o que tenho em casa',
  'Sugira um jantar leve para hoje',
  'O que posso fazer com o que está na despensa?',
]

const MSG_ERRO_PADRAO = 'Não consegui responder agora. Tente de novo em instantes.'

// Erros do servidor vêm como HttpsError com a mensagem já em português;
// falhas de rede/permissão caem no texto padrão.
function mensagemDoErro(erro) {
  if (erro?.code === 'functions/internal' || erro?.code === 'functions/invalid-argument') {
    return erro.message || MSG_ERRO_PADRAO
  }
  return MSG_ERRO_PADRAO
}

export default function Chat({ onFechar }) {
  const [mensagens, setMensagens] = useState([]) // { papel: 'usuario'|'assistente', texto, erro? }
  const [texto, setTexto] = useState('')
  const [enviando, setEnviando] = useState(false)
  const fimRef = useRef(null)

  useEffect(() => {
    fimRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [mensagens, enviando])

  const enviar = async (conteudo) => {
    const mensagem = conteudo.trim()
    if (!mensagem || enviando) return

    // Mensagens de erro não entram no contexto enviado ao modelo.
    const historico = mensagens
      .filter((m) => !m.erro)
      .map(({ papel, texto }) => ({ papel, texto }))

    setMensagens((atual) => [...atual, { papel: 'usuario', texto: mensagem }])
    setTexto('')
    setEnviando(true)

    try {
      const { data } = await perguntarChat({ mensagem, historico })
      setMensagens((atual) => [...atual, { papel: 'assistente', texto: data.resposta }])
    } catch (erro) {
      console.error('Erro no chat:', erro)
      setMensagens((atual) => [...atual, { papel: 'assistente', texto: mensagemDoErro(erro), erro: true }])
    } finally {
      setEnviando(false)
    }
  }

  const onSubmit = (e) => {
    e.preventDefault()
    enviar(texto)
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
            onClick={() => setMensagens([])}
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
              <div key={i} style={{ display: 'flex', justifyContent: doUsuario ? 'flex-end' : 'flex-start' }}>
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

        {/* Entrada */}
        <form
          onSubmit={onSubmit}
          style={{
            display: 'flex',
            gap: '10px',
            padding: '12px 16px calc(12px + env(safe-area-inset-bottom))',
            background: 'var(--card)',
            borderTop: `1px solid ${COR.divisoria}`,
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
            disabled={!texto.trim() || enviando}
            aria-label="Enviar"
            style={{
              width: '42px',
              height: '42px',
              borderRadius: RAIO.full,
              border: 'none',
              background: 'linear-gradient(135deg, var(--amarelo), var(--laranja))',
              opacity: !texto.trim() || enviando ? 0.5 : 1,
              cursor: !texto.trim() || enviando ? 'default' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Send size={18} color="#212529" />
          </button>
        </form>
      </div>
    </div>
  )
}
