import { useState, useRef } from 'react'
import { ArrowLeft, X } from 'lucide-react'
import { TIPOGRAFIA, RAIO, BOTAO_PRIMARIO, COR } from '../../utils/estilos'

const UNIDADES = [
  { valor: '',          label: '—',          plural: null         },
  { valor: 'un.',       label: 'un.',         plural: null         }, // abreviação, sem plural
  { valor: 'g',         label: 'g',           plural: null         },
  { valor: 'kg',        label: 'kg',          plural: null         },
  { valor: 'mL',        label: 'mL',          plural: null         },
  { valor: 'L',         label: 'L',           plural: null         },
  { valor: 'xíc.',      label: 'xíc.',        plural: null         }, // abreviação
  { valor: 'cl. sopa',  label: 'cl. sopa',    plural: null         }, // abreviação
  { valor: 'cl. chá',   label: 'cl. chá',     plural: null         },
  { valor: 'cl. café',  label: 'cl. café',    plural: null         },
  { valor: 'pitada',    label: 'pitada',      plural: 'pitadas'    },
  { valor: 'lata',      label: 'lata',        plural: 'latas'      },
  { valor: 'pacote',    label: 'pacote',      plural: 'pacotes'    },
  { valor: 'dente',     label: 'dente',       plural: 'dentes'     },
  { valor: 'fatia',     label: 'fatia',       plural: 'fatias'     },
  { valor: 'ramo',      label: 'ramo',        plural: 'ramos'      },
]

// Normaliza o que o parser retorna para o valor canônico de UNIDADES
const ALIAS_UNIDADE = {
  'xicara': 'xíc.', 'xicaras': 'xíc.', 'xícara': 'xíc.', 'xícaras': 'xíc.',
  'xic': 'xíc.', 'xíc': 'xíc.',
  'ml': 'mL', 'mililitro': 'mL', 'mililitros': 'mL',
  'l': 'L', 'litro': 'L', 'litros': 'L',
  'grama': 'g', 'gramas': 'g',
  'quilo': 'kg', 'quilos': 'kg', 'quilograma': 'kg',
  'colher de sopa': 'cl. sopa', 'colheres de sopa': 'cl. sopa',
  'colher de chá': 'cl. chá', 'colheres de chá': 'cl. chá',
  'colher de café': 'cl. café', 'colheres de café': 'cl. café',
  'unidade': 'un.', 'unidades': 'un.', 'und': 'un.', 'un': 'un.',
  'pitadas': 'pitada',
  'latas': 'lata',
  'pacotes': 'pacote',
  'dentes': 'dente',
  'fatias': 'fatia',
  'ramos': 'ramo',
}

function normalizarUnidade(valor) {
  if (!valor) return ''
  const v = valor.toLowerCase().trim()
  return ALIAS_UNIDADE[v] ?? (UNIDADES.find(u => u.valor === valor) ? valor : '')
}

const FRACOES_CHARS = '¼½¾⅓⅔⅛⅜⅝⅞'
const FRACOES_MAP = { '¼':'1/4','½':'1/2','¾':'3/4','⅓':'1/3','⅔':'2/3','⅛':'1/8','⅜':'3/8','⅝':'5/8','⅞':'7/8' }

const RE_QTD_VALIDA = new RegExp(
  `^(\\d+\\s+\\d+\\/\\d+|\\d+\\s*[${FRACOES_CHARS}]|\\d+\\/\\d+|[${FRACOES_CHARS}]|\\d+(?:[.,]\\d+)?)$`
)

function validarQuantidade(v) {
  return RE_QTD_VALIDA.test(v.trim())
}

function normalizarQuantidade(v) {
  // substitui frações unicode → textual, normaliza vírgula → ponto, remove espaços extras
  let s = v.trim()
  for (const [f, r] of Object.entries(FRACOES_MAP)) s = s.split(f).join(r)
  return s.replace(/\s+/g, ' ').replace(/,/g, '.')
}

function labelUnidade(valor, quantidade) {
  const u = UNIDADES.find(u => u.valor === valor)
  if (!u || !u.plural) return valor
  const num = parseFloat(String(quantidade).replace(',', '.'))
  return !isNaN(num) && num > 1 ? u.plural : u.label
}

const inputStyle = {
  width: '100%',
  padding: '12px',
  borderRadius: RAIO.md,
  border: '1.5px solid var(--borda, #DEE2E6)',
  background: 'var(--bg)',
  color: 'var(--text)',
  fontFamily: 'Nunito, sans-serif',
  fontSize: '14px',
  boxSizing: 'border-box',
  outline: 'none',
}

const labelStyle = {
  ...TIPOGRAFIA.label,
  color: 'var(--text-soft)',
  display: 'block',
  marginBottom: '6px',
}

function buscaCorresponde(produto, termo) {
  const t = termo.toLowerCase()
  if (produto.nome.toLowerCase().includes(t)) return true;
  return (produto.grupoSubstituicao || []).some(g => g.toLowerCase().includes(t));
}

function labelSugestao(produto, termo) {
  const t = termo.toLowerCase()
  const grupoMatch = (produto.grupoSubstituicao || []).find(g => g.toLowerCase().includes(t))
  if (grupoMatch && !produto.nome.toLowerCase().includes(t)) {
    return `${produto.nome} · ${grupoMatch}`
  }
  return produto.nome
}

function temMatchExato(resultadosProduto, resultadosGrupo, termo) {
  const t = termo.toLowerCase().trim()
  const matchProduto = resultadosProduto.some(p => p.nome.toLowerCase() === t)
  const matchGrupo = resultadosGrupo.some(g => g.nome.toLowerCase() === t)
  return matchProduto || matchGrupo
}

export function ReceitaFormulario({
  catalogo, // produtos
  grupoSubstituicao = [],
  isAdmin,
  onVoltar,
  onEnviar,
  onSugerirIngrediente = null,
  dadosIniciais = null,
  textoOriginal = '',
  onVoltarTexto = null,
}) {
  const [nome, setNome] = useState(dadosIniciais?.nome ?? '')
  const [foto, setFoto] = useState('')
  const [tempoPreparo, setTempoPreparo] = useState(dadosIniciais?.tempoPreparo ?? '')
  const [porcoes, setPorcoes] = useState(dadosIniciais?.porcoes ?? '')
  const [dificuldade, setDificuldade] = useState(dadosIniciais?.dificuldade ?? '')
  const [ingredientes, setIngredientes] = useState(
    (dadosIniciais?.ingredientes ?? []).map(ing => ({
      ...ing,
      unidade: normalizarUnidade(ing.unidade),
      _parsedUnidade: normalizarUnidade(ing._parsedUnidade),
    }))
  )
  const [buscaIngrediente, setBuscaIngrediente] = useState('')
  const [editandoIdx, setEditandoIdx] = useState(null) // índice do ingrediente sendo editado pelo nome
  const [editandoQtdIdx, setEditandoQtdIdx] = useState(null) // índice com campos qtd/unidade expandidos
  const [modoPreparo, setModoPreparo] = useState(
    dadosIniciais?.passos?.length > 0 ? dadosIniciais.passos.join('\n') : ''
  )
  const [enviando, setEnviando] = useState(false)
  const [enviado, setEnviado] = useState(false)
  const [erroEnvio, setErroEnvio] = useState(null)
  const jasSugeridos = useRef(new Set())


  // termoAtivo: busca do campo "adicionar" ou do campo de edição inline
  const termoAtivo = editandoIdx !== null
    ? (ingredientes[editandoIdx]?.nome ?? '')
    : buscaIngrediente

  const buscaAtiva = termoAtivo.length >= 2

  const resultadosProduto = buscaAtiva
    ? catalogo
        .filter(p =>
          buscaCorresponde(p, termoAtivo) &&
          (editandoIdx !== null
            ? ingredientes[editandoIdx]?.produtoId !== p.id
            : !ingredientes.some(i => i.produtoId === p.id))
        )
        .slice(0, 8)
    : []

  const resultadosGrupo = buscaAtiva
    ? grupoSubstituicao
        .filter(g =>
          g.nome.toLowerCase().includes(termoAtivo.toLowerCase()) &&
          (editandoIdx !== null
            ? ingredientes[editandoIdx]?.grupoSubstituicaoId !== g.id
            : !ingredientes.some(i => i.grupoSubstituicaoId === g.id))
        )
        .slice(0, 4)
    : []

  const temResultados = resultadosProduto.length > 0 || resultadosGrupo.length > 0

  const mostrarSugestaoNomeTemp = buscaAtiva && (
    !temResultados ||
    !temMatchExato(resultadosProduto, resultadosGrupo, termoAtivo)
  )

  const mostrarDropdown = buscaAtiva && (temResultados || mostrarSugestaoNomeTemp)

  const aplicarSelecao = (dados) => {
    if (editandoIdx !== null) {
      // Substituir o ingrediente existente, preservando quantidade e unidade
      setIngredientes(prev => prev.map((item, i) =>
        i === editandoIdx
          ? { quantidade: item.quantidade, unidade: item.unidade, ...dados }
          : item
      ))
      setEditandoIdx(null)
    } else {
      setIngredientes(prev => [...prev, { quantidade: null, unidade: null, ...dados }])
      setBuscaIngrediente('')
    }
  }

  const selecionarProduto = (produto) => {
    const t = termoAtivo.toLowerCase()
    const grupoMatch = (produto.grupoSubstituicao || []).find(g => g.toLowerCase().includes(t))
    const nomeDisplay = grupoMatch && !produto.nome.toLowerCase().includes(t)
      ? `${produto.nome} (${grupoMatch})`
      : produto.nome
    aplicarSelecao({ produtoId: produto.id, nome: nomeDisplay })
  }

  const selecionarGrupoSubstituicao = (grupo) => {
    aplicarSelecao({ grupoSubstituicaoId: grupo.id, nome: grupo.nome })
  }

  const selecionarNomeTemp = () => {
    const termo = termoAtivo.trim()
    aplicarSelecao({ nomeTemp: termo, nome: termo })
    if (onSugerirIngrediente) {
      onSugerirIngrediente(termo)
      jasSugeridos.current.add(termo)
    }
  }

  const [toastRemovido, setToastRemovido] = useState(null) // { nome, ingrediente, idx }
  const toastTimerRef = useRef(null)

  const removerIngrediente = (idx) => {
    const removido = ingredientes[idx]
    setIngredientes(prev => prev.filter((_, i) => i !== idx))
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current)
    setToastRemovido({ nome: removido.nome, ingrediente: removido, idx })
    toastTimerRef.current = setTimeout(() => setToastRemovido(null), 4000)
  }

  const desfazerRemocao = () => {
    if (!toastRemovido) return
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current)
    setIngredientes(prev => {
      const novo = [...prev]
      novo.splice(toastRemovido.idx, 0, toastRemovido.ingrediente)
      return novo
    })
    setToastRemovido(null)
  }

  const temIngredienteNaoVerificado = ingredientes.some(i => i.nomeTemp || i._qtdErro)
  const nomeValido = nome.trim().replace(/\d/g, '').length >= 4
  const temIngredientes = ingredientes.length > 0
  const modoPreparoValido = modoPreparo.trim().length >= 20
  const podeSalvar = nomeValido && temIngredientes && modoPreparoValido &&
    !(isAdmin && temIngredienteNaoVerificado)
  const podeSalvarRascunho = isAdmin && temIngredienteNaoVerificado &&
    nomeValido && temIngredientes && modoPreparoValido

  const montarDados = () => ({
    nome: nome.trim(),
    foto: foto.trim() || null,
    tempoPreparo: tempoPreparo ? Number(tempoPreparo) : null,
    porcoes: porcoes ? Number(porcoes) : null,
    dificuldade: dificuldade || null,
    ingredientes,
    passos: modoPreparo.trim()
      ? modoPreparo.split('\n').map(l => l.trim()).filter(Boolean)
      : [],
    _textoOriginal: textoOriginal || null,
  })

  const handleEnviar = async () => {
    if (!podeSalvar || enviando) return
    setEnviando(true)
    setErroEnvio(null)
    try {
      if (onSugerirIngrediente) {
        for (const ing of ingredientes) {
          if (ing.nomeTemp && !jasSugeridos.current.has(ing.nomeTemp)) {
            await onSugerirIngrediente(ing.nomeTemp)
          }
        }
      }
      await onEnviar(montarDados())
      setEnviado(true)
    } catch (e) {
      setErroEnvio(e?.message ?? 'Erro ao enviar. Tente novamente.')
    } finally {
      setEnviando(false)
    }
  }

  const handleSalvarRascunho = async () => {
    if (!podeSalvarRascunho || enviando) return
    setEnviando(true)
    setErroEnvio(null)
    try {
      await onEnviar({ ...montarDados(), status: 'pendente' })
      setEnviado(true)
    } catch (e) {
      setErroEnvio(e?.message ?? 'Erro ao salvar. Tente novamente.')
    } finally {
      setEnviando(false)
    }
  }

  if (enviado) {
    return (
      <div style={{ textAlign: 'center', padding: '48px 0' }}>
        <p style={{ fontSize: '48px' }}>🎉</p>
        <p style={{ ...TIPOGRAFIA.titulo, color: 'var(--text)', marginTop: '16px' }}>
          {temIngredienteNaoVerificado ? 'Receita enviada!' : 'Receita publicada!'}
        </p>
        <p style={{ ...TIPOGRAFIA.corpo, color: 'var(--text-soft)', marginTop: '8px', lineHeight: 1.5 }}>
          {temIngredienteNaoVerificado
            ? 'A receita ficará pendente até um admin resolver os ingredientes não catalogados.'
            : isAdmin ? 'A receita já está disponível.' : 'Um admin irá revisar em breve.'}
        </p>
        <button onClick={onVoltar} style={{ ...BOTAO_PRIMARIO, padding: '14px 32px', marginTop: '24px' }}>
          Voltar
        </button>
      </div>
    )
  }

  return (
    <div>
      {/* Navegação de volta */}
      {onVoltarTexto ? (
        <button
          onClick={() => onVoltarTexto(textoOriginal)}
          style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            background: 'none', border: 'none', cursor: 'pointer',
            padding: 0, color: 'var(--text-soft)',
            fontFamily: 'Nunito, sans-serif', fontWeight: 600, fontSize: '14px',
            marginBottom: '20px',
          }}
        >
          <ArrowLeft size={16} /> Editar texto
        </button>
      ) : (
        <button
          onClick={onVoltar}
          style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            background: 'none', border: 'none', cursor: 'pointer',
            padding: 0, color: 'var(--text-soft)',
            fontFamily: 'Nunito, sans-serif', fontWeight: 600, fontSize: '14px',
            marginBottom: '20px',
          }}
        >
          <ArrowLeft size={16} /> Voltar
        </button>
      )}

      {/* Nome */}
      <div style={{ marginBottom: '20px' }}>
        <label style={{ ...labelStyle, fontSize: '16px' }}>Nome da receita *</label>
        <input
          value={nome}
          onChange={e => setNome(e.target.value)}
          placeholder="Ex: Macarrão ao molho vermelho"
          style={{ ...inputStyle, fontSize: '16px' }}
        />
      </div>

      {/* Ingredientes */}
      <div style={{ marginBottom: '20px' }}>
        <label style={labelStyle}>Ingredientes *</label>

        {/* Tabela de ingredientes */}
        {ingredientes.length > 0 && (
          <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '0 2px', marginBottom: '10px', tableLayout: 'fixed' }}>
            <colgroup>
              <col style={{ width: '12%' }} />
              <col style={{ width: '18%' }} />
              <col style={{ width: '35%' }} />
              <col style={{ width: '30%' }} />
              <col style={{ width: '5%' }} />
            </colgroup>
            <tbody>
              {ingredientes.map((ing, idx) => (
                <tr key={idx}>
                  {/* Quantidade + Unidade: mostrar "a gosto" quando ambos null, ou campos ao clicar */}
                  {editandoQtdIdx === idx ? (
                    <>
                      <td style={{ padding: '1px 1px' }}>
                        <input
                          type="text"
                          inputMode="decimal"
                          autoFocus
                          value={ing.quantidade ?? ''}
                          onChange={e => {
                            const v = e.target.value
                            // filtra caracteres: só dígitos, espaço, / , . e frações unicode
                            if (new RegExp(`^[\\d\\s/,.${FRACOES_CHARS}]*$`).test(v)) {
                              setIngredientes(prev => prev.map((item, i) =>
                                i === idx ? { ...item, quantidade: v || null, _qtdErro: false } : item
                              ))
                            }
                          }}
                          onBlur={e => {
                            const v = e.target.value.trim()
                            if (!v) {
                              setIngredientes(prev => prev.map((item, i) =>
                                i === idx ? { ...item, quantidade: null, _qtdErro: false } : item
                              ))
                              return
                            }
                            if (!validarQuantidade(v)) {
                              setIngredientes(prev => prev.map((item, i) =>
                                i === idx ? { ...item, _qtdErro: true } : item
                              ))
                            } else {
                              setIngredientes(prev => prev.map((item, i) =>
                                i === idx ? { ...item, quantidade: normalizarQuantidade(v), _qtdErro: false } : item
                              ))
                            }
                          }}
                          placeholder="Qtd"
                          title="Use número, fração (1/2) ou misto (1 1/2)"
                          style={{
                            ...inputStyle, width: '100%', padding: '6px 4px', fontSize: '13px',
                            borderColor: ing._qtdErro ? 'var(--amarelo-validacao)' : 'var(--borda, #DEE2E6)',
                          }}
                        />
                      </td>
                      <td style={{ padding: '1px 1px' }}>
                        <select
                          value={ing.unidade ?? ''}
                          onChange={e => {
                            setIngredientes(prev => prev.map((item, i) =>
                              i === idx ? { ...item, unidade: e.target.value || null } : item
                            ))
                            setEditandoQtdIdx(null)
                          }}
                          onBlur={() => setTimeout(() => setEditandoQtdIdx(null), 150)}
                          style={{ ...inputStyle, width: '100%', padding: '6px 2px', fontSize: '13px', cursor: 'pointer' }}
                        >
                          {UNIDADES.map(u => <option key={u.valor} value={u.valor}>{u.label}</option>)}
                        </select>
                      </td>
                    </>
                  ) : (
                    <td colSpan={2} style={{ padding: '1px 1px' }}>
                      <div
                        onClick={() => setEditandoQtdIdx(idx)}
                        style={{
                          ...inputStyle,
                          padding: '6px 8px',
                          fontSize: '13px',
                          cursor: 'text',
                          color: ing.quantidade ? 'var(--text)' : 'var(--text-soft)',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          borderColor: ing._qtdErro ? 'var(--amarelo-validacao)' : 'var(--borda, #DEE2E6)',
                        }}
                      >
                        {ing.quantidade
                          ? `${ing.quantidade}${ing.unidade ? ' ' + labelUnidade(ing.unidade, ing.quantidade) : ''}`
                          : 'a gosto'}
                      </div>
                    </td>
                  )}
                  {/* Ingrediente com busca live */}
                  <td style={{ padding: '1px 1px', position: 'relative' }}>
                    <input
                      value={ing.nome}
                      onFocus={() => setEditandoIdx(idx)}
                      onBlur={() => setTimeout(() => setEditandoIdx(null), 150)}
                      onChange={e => setIngredientes(prev => prev.map((item, i) =>
                        i === idx ? { ...item, nome: e.target.value, produtoId: undefined, grupoSubstituicaoId: undefined, nomeTemp: e.target.value } : item
                      ))}
                      style={{ ...inputStyle, width: '100%', padding: '6px 8px', fontSize: '13px', borderColor: ing.nomeTemp ? 'var(--amarelo-validacao)' : editandoIdx === idx ? 'var(--laranja)' : 'var(--borda, #DEE2E6)' }}
                    />
                    {editandoIdx === idx && mostrarDropdown && (
                      <div style={{
                        position: 'absolute', top: '100%', left: 4, right: 4, zIndex: 20,
                        background: 'var(--card)', borderRadius: RAIO.md,
                        border: '1.5px solid var(--borda, #DEE2E6)',
                        boxShadow: '0 4px 16px rgba(0,0,0,0.1)',
                        marginTop: '2px', overflow: 'hidden',
                      }}>
                        {resultadosProduto.length > 0 && (
                          <>
                            {resultadosGrupo.length > 0 && (
                              <div style={{ ...TIPOGRAFIA.label, color: 'var(--text-soft)', padding: '6px 14px 4px', borderBottom: '1px solid var(--borda, #DEE2E6)' }}>PRODUTOS</div>
                            )}
                            {resultadosProduto.map(p => (
                              <div key={p.id} onMouseDown={() => selecionarProduto(p)} style={{ padding: '10px 14px', cursor: 'pointer', borderBottom: '1px solid var(--borda, #DEE2E6)', ...TIPOGRAFIA.corpo, color: 'var(--text)' }}>
                                {labelSugestao(p, termoAtivo)}
                              </div>
                            ))}
                          </>
                        )}
                        {resultadosGrupo.length > 0 && (
                          <>
                            {resultadosProduto.length > 0 && (
                              <div style={{ ...TIPOGRAFIA.label, color: 'var(--text-soft)', padding: '6px 14px 4px', borderBottom: '1px solid var(--borda, #DEE2E6)' }}>GRUPOS</div>
                            )}
                            {resultadosGrupo.map(g => (
                              <div key={g.id} onMouseDown={() => selecionarGrupoSubstituicao(g)} style={{ padding: '10px 14px', cursor: 'pointer', borderBottom: '1px solid var(--borda, #DEE2E6)', ...TIPOGRAFIA.corpo, color: 'var(--text)' }}>
                                {g.nome}
                              </div>
                            ))}
                          </>
                        )}
                        {mostrarSugestaoNomeTemp && (
                          <div onMouseDown={selecionarNomeTemp} style={{ padding: '10px 14px', cursor: 'pointer', ...TIPOGRAFIA.corpo, color: 'var(--amarelo-validacao)' }}>
                            Sugerir inclusão de "{termoAtivo.trim()}"
                          </div>
                        )}
                      </div>
                    )}
                  </td>
                  {/* Observação */}
                  <td style={{ padding: '1px 1px' }}>
                    <input
                      value={ing.observacao ?? ''}
                      onChange={e => setIngredientes(prev => prev.map((item, i) =>
                        i === idx ? { ...item, observacao: e.target.value || null } : item
                      ))}
                      placeholder="picado, cozido..."
                      style={{ ...inputStyle, width: '100%', padding: '6px 6px', fontSize: '12px', color: ing.observacao ? 'var(--text)' : 'var(--text-soft)' }}
                    />
                  </td>
                  {/* Remover */}
                  <td style={{ padding: '2px 2px', textAlign: 'center' }}>
                    <button
                      onClick={() => removerIngrediente(idx)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px', color: COR.neutro }}
                    >
                      <X size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* Aviso geral quando há ingredientes nomeTemp */}
        {temIngredienteNaoVerificado && (
          <div style={{
            ...TIPOGRAFIA.subcategoria,
            color: 'var(--amarelo-validacao)',
            background: 'rgba(var(--amarelo-rgb, 255,193,7),0.08)',
            border: '1px solid var(--amarelo-validacao)',
            borderRadius: RAIO.md,
            padding: '8px 12px',
            marginBottom: '10px',
          }}>
            Esta receita ficará pendente até que um admin resolva os campos destacados.
          </div>
        )}

        {/* Busca */}
        <div style={{ position: 'relative' }}>
            <input
              value={buscaIngrediente}
              onChange={e => setBuscaIngrediente(e.target.value)}
              placeholder="Buscar ingrediente ou grupo..."
              style={inputStyle}
            />
            {mostrarDropdown && (
              <div style={{
                position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 10,
                background: 'var(--card)', borderRadius: RAIO.md,
                border: '1.5px solid var(--borda, #DEE2E6)',
                boxShadow: '0 4px 16px rgba(0,0,0,0.1)',
                marginTop: '4px', overflow: 'hidden',
              }}>
                {/* Seção de produtos */}
                {resultadosProduto.length > 0 && (
                  <>
                    {resultadosGrupo.length > 0 && (
                      <div style={{
                        ...TIPOGRAFIA.label,
                        color: 'var(--text-soft)',
                        padding: '6px 14px 4px',
                        borderBottom: '1px solid var(--borda, #DEE2E6)',
                      }}>
                        PRODUTOS
                      </div>
                    )}
                    {resultadosProduto.map(p => (
                      <div
                        key={p.id}
                        onClick={() => selecionarProduto(p)}
                        style={{
                          padding: '10px 14px', cursor: 'pointer',
                          borderBottom: '1px solid var(--borda, #DEE2E6)',
                          ...TIPOGRAFIA.corpo, color: 'var(--text)',
                        }}
                      >
                        {labelSugestao(p, buscaIngrediente)}
                      </div>
                    ))}
                  </>
                )}

                {/* Seção de grupos de substituição */}
                {resultadosGrupo.length > 0 && (
                  <>
                    {resultadosProduto.length > 0 && (
                      <div style={{
                        ...TIPOGRAFIA.label,
                        color: 'var(--text-soft)',
                        padding: '6px 14px 4px',
                        borderBottom: '1px solid var(--borda, #DEE2E6)',
                      }}>
                        GRUPOS DE SUBSTITUIÇÃO
                      </div>
                    )}
                    {resultadosGrupo.map(g => (
                      <div
                        key={g.id}
                        onClick={() => selecionarGrupoSubstituicao(g)}
                        style={{
                          padding: '10px 14px', cursor: 'pointer',
                          borderBottom: '1px solid var(--borda, #DEE2E6)',
                          ...TIPOGRAFIA.corpo, color: 'var(--text)',
                        }}
                      >
                        {g.nome}
                      </div>
                    ))}
                  </>
                )}

                {/* Sugestão de nomeTemp */}
                {mostrarSugestaoNomeTemp && (
                  <div
                    onClick={selecionarNomeTemp}
                    style={{
                      padding: '10px 14px', cursor: 'pointer',
                      ...TIPOGRAFIA.corpo, color: 'var(--amarelo-validacao)',
                    }}
                  >
                    Sugerir inclusão de "{buscaIngrediente.trim()}"
                  </div>
                )}
              </div>
            )}
          </div>
      </div>

      {/* Modo de preparo */}
      <div style={{ marginBottom: '20px' }}>
        <label style={labelStyle}>Modo de preparo</label>
        <textarea
          value={modoPreparo}
          onChange={e => setModoPreparo(e.target.value)}
          placeholder={'1. Tempere a carne com sal e alho.\n2. Refogue a cebola em azeite.\n3. ...'}
          rows={6}
          style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.6 }}
        />
        <p style={{ ...TIPOGRAFIA.subcategoria, color: 'var(--text-soft)', marginTop: '4px' }}>
          Cada linha vira um passo numerado na receita
        </p>
      </div>

      {/* Opcionais */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '20px' }}>
        <div style={{ flex: 1 }}>
          <label style={labelStyle}>Tempo (min)</label>
          <input
            type="number"
            value={tempoPreparo}
            onChange={e => setTempoPreparo(e.target.value)}
            placeholder="Ex: 30"
            style={inputStyle}
          />
        </div>
        <div style={{ flex: 1 }}>
          <label style={labelStyle}>Porções</label>
          <input
            type="number"
            value={porcoes}
            onChange={e => setPorcoes(e.target.value)}
            placeholder="Ex: 4"
            style={inputStyle}
          />
        </div>
        <div style={{ flex: 1 }}>
          <label style={labelStyle}>Dificuldade</label>
          <select
            value={dificuldade}
            onChange={e => setDificuldade(e.target.value)}
            style={{ ...inputStyle, cursor: 'pointer' }}
          >
            {['', 'Fácil', 'Médio', 'Difícil'].map(op => (
              <option key={op} value={op}>{op || '—'}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Foto (opcional) */}
      <div style={{ marginBottom: '20px' }}>
        <label style={labelStyle}>Foto (URL, opcional)</label>
        <input
          value={foto}
          onChange={e => setFoto(e.target.value)}
          placeholder="https://..."
          style={inputStyle}
        />
      </div>

      {/* Enviar */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
        {podeSalvarRascunho && (
          <button
            onClick={handleSalvarRascunho}
            disabled={enviando}
            style={{
              ...BOTAO_PRIMARIO,
              flex: 1,
              padding: '14px',
              opacity: enviando ? 0.5 : 1,
              cursor: enviando ? 'not-allowed' : 'pointer',
              background: 'var(--bg)',
              color: 'var(--text-soft)',
              border: '1.5px solid var(--borda, #DEE2E6)',
            }}
          >
            Salvar rascunho
          </button>
        )}
        <button
          onClick={handleEnviar}
          disabled={!podeSalvar || enviando}
          style={{
            ...BOTAO_PRIMARIO,
            flex: 1,
            padding: '14px',
            opacity: !podeSalvar || enviando ? 0.5 : 1,
            cursor: !podeSalvar || enviando ? 'not-allowed' : 'pointer',
          }}
        >
          {enviando ? 'Enviando...' : 'Publicar receita'}
        </button>
      </div>

      {erroEnvio && (
        <p style={{ ...TIPOGRAFIA.corpo, color: 'var(--amarelo-validacao)', textAlign: 'center', marginTop: '4px' }}>
          {erroEnvio}
        </p>
      )}

      {/* Toast desfazer remoção */}
      {toastRemovido && (
        <div style={{
          position: 'fixed',
          bottom: '80px',
          left: '50%',
          transform: 'translateX(-50%)',
          background: '#212529',
          color: '#fff',
          borderRadius: RAIO.pill,
          padding: '12px 16px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
          zIndex: 100,
          whiteSpace: 'nowrap',
          ...TIPOGRAFIA.corpo,
        }}>
          <span>"{toastRemovido.nome}" removido</span>
          <button
            onClick={desfazerRemocao}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--amarelo-validacao)',
              fontFamily: 'Nunito, sans-serif',
              fontWeight: 700,
              fontSize: '14px',
              padding: 0,
            }}
          >
            Desfazer
          </button>
        </div>
      )}
    </div>
  )
}
