import { useState } from 'react'
import { ArrowLeft, X } from 'lucide-react'
import { TIPOGRAFIA, RAIO, BOTAO_PRIMARIO, COR } from '../../utils/estilos'

const CATEGORIAS = ['Café da manhã', 'Almoço', 'Lanche', 'Jantar', 'Sobremesa']

const UNIDADES = ['unid.', 'g', 'kg', 'mL', 'L', 'xíc.', 'col. sopa', 'col. chá', 'col. café', 'pitada', 'a gosto']

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
}

const labelStyle = {
  ...TIPOGRAFIA.label,
  color: 'var(--text-soft)',
  display: 'block',
  marginBottom: '6px',
}

function buscaCorresponde(produto, termo) {
  const t = termo.toLowerCase()
  if (produto.nome.toLowerCase().includes(t)) return true
  return (produto.atributos || []).some(a => a.toLowerCase().includes(t))
}

function labelSugestao(produto, termo) {
  const t = termo.toLowerCase()
  const atributoMatch = (produto.atributos || []).find(a => a.toLowerCase().includes(t))
  if (atributoMatch && !produto.nome.toLowerCase().includes(t)) {
    return `${produto.nome} · ${atributoMatch}`
  }
  return produto.nome
}

function temMatchExato(resultadosProduto, resultadosAtributo, termo) {
  const t = termo.toLowerCase().trim()
  const matchProduto = resultadosProduto.some(p => p.nome.toLowerCase() === t)
  const matchAtributo = resultadosAtributo.some(a => a.nome.toLowerCase() === t)
  return matchProduto || matchAtributo
}

export function ReceitaFormulario({ catalogo, atributos = [], isAdmin, onVoltar, onEnviar }) {
  const [nome, setNome] = useState('')
  const [categoria, setCategoria] = useState('')
  const [foto, setFoto] = useState('')
  const [tempoPreparo, setTempoPreparo] = useState('')
  const [porcoes, setPorcoes] = useState('')
  const [ingredientes, setIngredientes] = useState([])
  const [buscaIngrediente, setBuscaIngrediente] = useState('')
  const [modoPreparo, setModoPreparo] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [enviado, setEnviado] = useState(false)

  const [pendente, setPendente] = useState(null)
  const [qtdPendente, setQtdPendente] = useState('')
  const [unidPendente, setUnidPendente] = useState('unid.')

  const buscaAtiva = buscaIngrediente.length >= 2

  const resultadosProduto = buscaAtiva
    ? catalogo
        .filter(p =>
          buscaCorresponde(p, buscaIngrediente) &&
          !ingredientes.some(i => i.produtoId === p.id)
        )
        .slice(0, 8)
    : []

  const resultadosAtributo = buscaAtiva
    ? atributos
        .filter(a =>
          a.nome.toLowerCase().includes(buscaIngrediente.toLowerCase()) &&
          !ingredientes.some(i => i.atributoId === a.id)
        )
        .slice(0, 4)
    : []

  const temResultados = resultadosProduto.length > 0 || resultadosAtributo.length > 0

  const mostrarSugestaoNomeTemp = buscaAtiva && (
    !temResultados ||
    !temMatchExato(resultadosProduto, resultadosAtributo, buscaIngrediente)
  )

  const mostrarDropdown = buscaAtiva && (temResultados || mostrarSugestaoNomeTemp)

  const selecionarProduto = (produto) => {
    const t = buscaIngrediente.toLowerCase()
    const atributoMatch = (produto.atributos || []).find(a => a.toLowerCase().includes(t))
    const nomeDisplay = atributoMatch && !produto.nome.toLowerCase().includes(t)
      ? `${produto.nome} (${atributoMatch})`
      : produto.nome
    setPendente({ produtoId: produto.id, nome: nomeDisplay })
    setQtdPendente('')
    setUnidPendente('unid.')
    setBuscaIngrediente('')
  }

  const selecionarAtributo = (atributo) => {
    setPendente({ atributoId: atributo.id, nome: atributo.nome })
    setQtdPendente('')
    setUnidPendente('unid.')
    setBuscaIngrediente('')
  }

  const selecionarNomeTemp = () => {
    const termo = buscaIngrediente.trim()
    setPendente({ nomeTemp: termo, nome: termo })
    setQtdPendente('')
    setUnidPendente('unid.')
    setBuscaIngrediente('')
  }

  const confirmarIngrediente = () => {
    if (!pendente) return
    const novoIngrediente = {
      nome: pendente.nome,
      quantidade: qtdPendente || null,
      unidade: qtdPendente ? unidPendente : null,
    }
    if (pendente.produtoId) novoIngrediente.produtoId = pendente.produtoId
    if (pendente.atributoId) novoIngrediente.atributoId = pendente.atributoId
    if (pendente.nomeTemp) novoIngrediente.nomeTemp = pendente.nomeTemp

    setIngredientes(prev => [...prev, novoIngrediente])
    setPendente(null)
    setQtdPendente('')
    setUnidPendente('unid.')
  }

  const removerIngrediente = (idx) => {
    setIngredientes(prev => prev.filter((_, i) => i !== idx))
  }

  const temIngredienteNaoVerificado = ingredientes.some(i => i.nomeTemp)
  const podeSalvar = nome.trim() && categoria && ingredientes.length > 0

  const handleEnviar = async () => {
    if (!podeSalvar || enviando) return
    setEnviando(true)
    const passosValidos = modoPreparo.trim()
      ? modoPreparo.split('\n').map(l => l.trim()).filter(Boolean)
      : []
    await onEnviar({
      nome: nome.trim(),
      categoria,
      foto: foto.trim() || null,
      tempoPreparo: tempoPreparo ? Number(tempoPreparo) : null,
      porcoes: porcoes ? Number(porcoes) : null,
      ingredientes,
      passos: passosValidos,
    })
    setEnviando(false)
    setEnviado(true)
  }

  if (enviado) {
    return (
      <div style={{ textAlign: 'center', padding: '48px 0' }}>
        <p style={{ fontSize: '48px' }}>🎉</p>
        <p style={{ ...TIPOGRAFIA.titulo, color: 'var(--text)', marginTop: '16px' }}>
          {temIngredienteNaoVerificado ? 'Sugestão enviada!' : isAdmin ? 'Receita cadastrada!' : 'Sugestão enviada!'}
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Voltar */}
      <button
        onClick={onVoltar}
        style={{
          display: 'flex', alignItems: 'center', gap: '6px',
          background: 'none', border: 'none', cursor: 'pointer',
          padding: 0, color: 'var(--text-soft)',
          fontFamily: 'Nunito, sans-serif', fontWeight: 600, fontSize: '14px',
        }}
      >
        <ArrowLeft size={16} /> Receitas
      </button>

      <h2 style={{ ...TIPOGRAFIA.h2, color: 'var(--text)', margin: 0 }}>
        {isAdmin ? 'Nova receita' : 'Sugerir receita'}
      </h2>

      {/* Nome */}
      <div>
        <label style={labelStyle}>Nome da receita *</label>
        <input
          value={nome}
          onChange={e => setNome(e.target.value)}
          placeholder="Ex: Macarrão ao molho vermelho"
          style={inputStyle}
        />
      </div>

      {/* Categoria */}
      <div>
        <label style={labelStyle}>Refeição *</label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
          {CATEGORIAS.map(cat => (
            <button
              key={cat}
              onClick={() => setCategoria(cat)}
              style={{
                ...TIPOGRAFIA.label,
                padding: '8px 14px',
                borderRadius: RAIO.pill,
                border: '1.5px solid',
                borderColor: categoria === cat ? 'var(--laranja)' : 'var(--borda, #DEE2E6)',
                background: categoria === cat ? 'var(--laranja)' : 'transparent',
                color: categoria === cat ? '#212529' : 'var(--text-soft)',
                cursor: 'pointer',
              }}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Ingredientes */}
      <div>
        <label style={labelStyle}>Ingredientes *</label>

        {/* Lista de ingredientes já adicionados */}
        {ingredientes.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '10px' }}>
            {ingredientes.map((ing, idx) => (
              <div key={idx} style={{
                display: 'flex', alignItems: 'center', gap: '8px',
                padding: '8px 12px', borderRadius: RAIO.md,
                background: 'var(--card)',
                border: `1.5px solid ${ing.nomeTemp ? 'var(--laranja)' : 'var(--borda, #DEE2E6)'}`,
              }}>
                {ing.nomeTemp && (
                  <span style={{ color: 'var(--laranja)', fontSize: '14px', flexShrink: 0 }}>⚠</span>
                )}
                <span style={{ ...TIPOGRAFIA.corpo, color: 'var(--text)', flex: 1 }}>
                  {ing.quantidade ? `${ing.quantidade} ${ing.unidade} ` : ''}{ing.nome}
                </span>
                <button
                  onClick={() => removerIngrediente(idx)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px', color: COR.neutro }}
                >
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Aviso geral quando há ingredientes nomeTemp */}
        {temIngredienteNaoVerificado && (
          <div style={{
            ...TIPOGRAFIA.subcategoria,
            color: 'var(--laranja)',
            background: 'rgba(255,152,0,0.08)',
            border: '1px solid var(--laranja)',
            borderRadius: RAIO.md,
            padding: '8px 12px',
            marginBottom: '10px',
          }}>
            Esta receita ficará pendente até que um admin resolva os ingredientes não catalogados.
          </div>
        )}

        {/* Ingrediente pendente: quantidade + unidade + confirmar */}
        {pendente && (
          <div style={{
            display: 'flex', flexDirection: 'column', gap: '8px',
            padding: '12px', borderRadius: RAIO.md,
            background: 'var(--card)', border: '1.5px solid var(--laranja)',
            marginBottom: '10px',
          }}>
            <span style={{ ...TIPOGRAFIA.nomeProduto, color: 'var(--text)' }}>{pendente.nome}</span>
            {pendente.nomeTemp && (
              <span style={{ ...TIPOGRAFIA.subcategoria, color: 'var(--laranja)' }}>
                ⚠️ Ingrediente não catalogado — a receita ficará pendente de aprovação
              </span>
            )}
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                type="number"
                min="0"
                value={qtdPendente}
                onChange={e => setQtdPendente(e.target.value)}
                placeholder="Qtd"
                style={{ ...inputStyle, width: '90px', flex: 'none' }}
                autoFocus
              />
              <select
                value={unidPendente}
                onChange={e => setUnidPendente(e.target.value)}
                style={{ ...inputStyle, flex: 1, cursor: 'pointer' }}
              >
                {UNIDADES.map(u => <option key={u} value={u}>{u}</option>)}
              </select>
              <button
                onClick={confirmarIngrediente}
                style={{
                  ...BOTAO_PRIMARIO, padding: '0 16px', borderRadius: RAIO.md,
                  flexShrink: 0, fontSize: '13px',
                }}
              >
                OK
              </button>
            </div>
          </div>
        )}

        {/* Busca */}
        {!pendente && (
          <div style={{ position: 'relative' }}>
            <input
              value={buscaIngrediente}
              onChange={e => setBuscaIngrediente(e.target.value)}
              placeholder="Buscar ingrediente ou atributo..."
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
                    {resultadosAtributo.length > 0 && (
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

                {/* Seção de atributos */}
                {resultadosAtributo.length > 0 && (
                  <>
                    {resultadosProduto.length > 0 && (
                      <div style={{
                        ...TIPOGRAFIA.label,
                        color: 'var(--text-soft)',
                        padding: '6px 14px 4px',
                        borderBottom: '1px solid var(--borda, #DEE2E6)',
                      }}>
                        ATRIBUTOS
                      </div>
                    )}
                    {resultadosAtributo.map(a => (
                      <div
                        key={a.id}
                        onClick={() => selecionarAtributo(a)}
                        style={{
                          padding: '10px 14px', cursor: 'pointer',
                          borderBottom: '1px solid var(--borda, #DEE2E6)',
                          ...TIPOGRAFIA.corpo, color: 'var(--text)',
                        }}
                      >
                        {a.nome}
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
                      ...TIPOGRAFIA.corpo, color: 'var(--laranja)',
                    }}
                  >
                    Sugerir inclusão de "{buscaIngrediente.trim()}"
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modo de preparo */}
      <div>
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
      <div style={{ display: 'flex', gap: '12px' }}>
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
      </div>

      {/* Foto (opcional) */}
      <div>
        <label style={labelStyle}>Foto (URL, opcional)</label>
        <input
          value={foto}
          onChange={e => setFoto(e.target.value)}
          placeholder="https://..."
          style={inputStyle}
        />
      </div>

      {/* Enviar */}
      <button
        onClick={handleEnviar}
        disabled={!podeSalvar || enviando}
        style={{
          ...BOTAO_PRIMARIO,
          padding: '14px',
          opacity: !podeSalvar || enviando ? 0.5 : 1,
          cursor: !podeSalvar || enviando ? 'not-allowed' : 'pointer',
        }}
      >
        {enviando ? 'Enviando...' : isAdmin ? 'Publicar receita' : 'Enviar sugestão'}
      </button>
    </div>
  )
}
