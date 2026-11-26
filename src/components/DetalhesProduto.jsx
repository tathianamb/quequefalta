import { useEffect, useMemo, useRef, useState } from "react";
import { doc, updateDoc, arrayUnion, arrayRemove } from "firebase/firestore";
import { db } from "../config/firebase";
import { ORDEM_CATEGORIAS } from "../utils/categorias";
import { normalizar } from "../utils/texto";
import {
  ondeComprar,
  precosAtuaisOrdenados,
  formatarPreco,
  descreverPreco,
  dataDoRegistro,
  mercadoCanonico,
  jaRegistrado,
  lerTamanho,
  limparMarca,
  camposDaVariacao,
} from "../utils/precos";
import { X, Plus, Edit2, Trash2 } from "lucide-react";
import Folha from "./Folha";
import BotaoIcone from "./BotaoIcone";
import Confirmacao from "./Confirmacao";
import { TIPOGRAFIA, FONTE, RAIO, BORDA, COR, BOTAO_DESABILITADO } from "../utils/estilos";

const MERCADOS_BASE = ["Atacadão", "Max", "Avenida", "Superbom"];

function hojeISO() {
  const d = new Date();
  const off = d.getTimezoneOffset();
  return new Date(d.getTime() - off * 60000).toISOString().slice(0, 10);
}

function DetalhesProduto({ produto, onFechar, listaAtiva, catalogo = [], isAdmin = false, origemLista = false, onDeletar }) {
  const [mercado, setMercado] = useState("");
  const [preco, setPreco] = useState("");
  const [data, setData] = useState(hojeISO());
  const [observacao, setObservacao] = useState("");
  // Marca e tamanho da embalagem (opcionais): o "onde comprar" compara por
  // kg/L quando sabe o tamanho. "A peso" = preço por kg, sem tamanho.
  const [marca, setMarca] = useState("");
  const [tamanhoTexto, setTamanhoTexto] = useState("");
  const [aPeso, setAPeso] = useState(false);
  const [erroTamanho, setErroTamanho] = useState(false);
  const [sucesso, setSucesso] = useState(false);
  const [erroDuplicado, setErroDuplicado] = useState(false);
  const [erroGravacao, setErroGravacao] = useState(null);
  // Confirmação pendente: { tipo: "registro", h } ou { tipo: "produto" }.
  const [confirmacao, setConfirmacao] = useState(null);
  const timerSucessoRef = useRef(null);

  // Não deixa o timer do "Registrado!" disparar depois que o modal fechou.
  useEffect(() => () => clearTimeout(timerSucessoRef.current), []);

  // As gravações abaixo não esperam o servidor (com sinal fraco a promise
  // demora): a escrita local já vale e atualiza a tela. O erro, se vier, é
  // avisado aqui.
  const avisarErroGravacao = (mensagem) => (e) => {
    console.error(mensagem, e);
    setErroGravacao(mensagem);
  };

  const [editandoAdmin, setEditandoAdmin] = useState(false);
  const [adminNome, setAdminNome] = useState(produto.nome || "");
  const [adminCategoria, setAdminCategoria] = useState(produto.categoria || "");
  const [adminSubcategoria, setAdminSubcategoria] = useState(produto.subcategoria || "");
  const [adminGrupoSubstituicao, setAdminGrupoSubstituicao] = useState(produto.grupoSubstituicao || []);
  const [adminNovoGrupoSubstituicao, setAdminNovoGrupoSubstituicao] = useState("");
  const [adminGenerico, setAdminGenerico] = useState(!!produto.generico);
  const [adminMarcaPreferida, setAdminMarcaPreferida] = useState(produto.marcaPreferida || "");

  const handleSalvarAdmin = () => {
    setErroGravacao(null);
    updateDoc(doc(db, "catalogo", produto.id), {
      nome: adminNome.trim(),
      categoria: adminCategoria,
      subcategoria: adminSubcategoria.trim(),
      grupoSubstituicao: adminGrupoSubstituicao,
      generico: adminGenerico,
      marcaPreferida: limparMarca(adminMarcaPreferida),
    }).catch(avisarErroGravacao("Não foi possível salvar as alterações do produto."));
    setEditandoAdmin(false);
  };

  const adicionarGrupoSubstituicao = () => {
    const valor = adminNovoGrupoSubstituicao.trim();
    if (!valor || adminGrupoSubstituicao.includes(valor)) return;
    setAdminGrupoSubstituicao([...adminGrupoSubstituicao, valor]);
    setAdminNovoGrupoSubstituicao("");
  };

  const removerGrupoSubstituicao = (grupo) => {
    setAdminGrupoSubstituicao(adminGrupoSubstituicao.filter((g) => g !== grupo));
  };

  const subcategoriasDaCategoria = useMemo(() => {
    return [...new Set(
      catalogo
        .filter((p) => p.categoria === adminCategoria && p.subcategoria)
        .map((p) => p.subcategoria)
    )].sort((a, b) => a.localeCompare(b, "pt-BR"));
  }, [catalogo, adminCategoria]);

  const mercadosConhecidos = useMemo(() => {
    const set = new Set(MERCADOS_BASE);
    catalogo.forEach((p) =>
      (p.historico || []).forEach((h) => {
        if (h.mercado) set.add(mercadoCanonico(h.mercado));
      })
    );
    return Array.from(set).sort((a, b) => a.localeCompare(b, "pt-BR"));
  }, [catalogo]);

  // Marcas já vistas: as deste produto primeiro, depois as do catálogo todo.
  const marcasConhecidas = useMemo(() => {
    const doProduto = new Set((produto.historico || []).map((h) => h.marca).filter(Boolean));
    if (produto.marcaPreferida) doProduto.add(produto.marcaPreferida);
    const outras = new Set();
    catalogo.forEach((p) => {
      if (p.marcaPreferida) outras.add(p.marcaPreferida);
      (p.historico || []).forEach((h) => h.marca && outras.add(h.marca));
    });
    const ordenar = (s) => [...s].sort((a, b) => a.localeCompare(b, "pt-BR"));
    return [...ordenar(doProduto), ...ordenar(outras).filter((m) => !doProduto.has(m))];
  }, [produto, catalogo]);

  const sugestoesMercado = useMemo(() => {
    const termo = normalizar(mercado);
    if (!termo) return mercadosConhecidos;
    return mercadosConhecidos.filter(
      (m) => normalizar(m).includes(termo) && normalizar(m) !== termo
    );
  }, [mercado, mercadosConhecidos]);

  const historico = (produto.historico || [])
    .slice()
    .sort((a, b) => (dataDoRegistro(b) ?? 0) - (dataDoRegistro(a) ?? 0));

  const handleRegistrar = () => {
    if (!mercado.trim() || !preco) return;
    setErroDuplicado(false);
    setErroTamanho(false);
    setErroGravacao(null);

    const tamanho = aPeso || !tamanhoTexto.trim() ? null : lerTamanho(tamanhoTexto);
    if (!aPeso && tamanhoTexto.trim() && !tamanho) {
      setErroTamanho(true);
      return;
    }
    const mercadoFinal = mercadoCanonico(mercado);
    const precoNumero = parseFloat(preco.replace(",", "."));
    const variacao = {
      marca: limparMarca(marca),
      tamanho: tamanho?.tamanho ?? null,
      medida: tamanho?.medida ?? null,
      unidade: aPeso ? "kg" : null,
    };
    // Mesmo mercado e dia, sem marca ou tamanho que diferencie: já existe
    // (regra em functions/src/precos/variacao.js, a mesma do bot).
    if (jaRegistrado(historico, { mercado: mercadoFinal, dia: data, preco: precoNumero, ...variacao }, { porPreco: false })) {
      setErroDuplicado(true);
      return;
    }

    const dataRegistro = data
      ? new Date(`${data}T12:00:00`)
      : new Date();
    const ref = doc(db, "catalogo", produto.id);
    // Sem await: o registro já aparece no histórico (escrita local), então a
    // checagem de duplicata acima vale para um novo toque mesmo antes de o
    // servidor confirmar.
    updateDoc(ref, {
      historico: arrayUnion({
        mercado: mercadoFinal,
        preco: precoNumero,
        data: dataRegistro,
        observacao: observacao.trim() || null,
        listaAtiva: listaAtiva,
        ...(aPeso ? { unidade: "kg" } : {}),
        ...camposDaVariacao(variacao),
      }),
    }).catch((e) => {
      setSucesso(false);
      avisarErroGravacao("Não foi possível registrar o preço. Tente de novo.")(e);
    });
    setSucesso(true);
    setMercado("");
    setPreco("");
    setData(hojeISO());
    setObservacao("");
    setMarca("");
    setTamanhoTexto("");
    setAPeso(false);
    clearTimeout(timerSucessoRef.current);
    timerSucessoRef.current = setTimeout(() => setSucesso(false), 2000);
  };

  // arrayRemove compara o objeto inteiro — `h` vem direto do snapshot (mesmos
  // campos e Timestamp), então remove exatamente esse registro e nenhum outro.
  const apagarRegistro = (h) => {
    setErroGravacao(null);
    updateDoc(doc(db, "catalogo", produto.id), { historico: arrayRemove(h) })
      .catch(avisarErroGravacao("Não foi possível apagar o registro."));
  };

  // Mesma regra de "Onde comprar" da lista: preço mais recente por mercado e
  // variação (marca + tamanho), comparado por kg/L quando dá.
  const melhor = ondeComprar(produto);
  const outrosPrecos = precosAtuaisOrdenados(produto).filter(
    (p) => !(melhor && p.chave === melhor.chave && p.preco === melhor.preco && p.data.getTime() === melhor.data.getTime()),
  );

  const textoConfirmacao = () => {
    if (confirmacao?.tipo === "registro") {
      const h = confirmacao.h;
      const dia = h.data?.toDate ? h.data.toDate().toLocaleDateString("pt-BR") : "";
      const precoTexto = `R$ ${h.preco.toFixed(2).replace(".", ",")}`;
      return { titulo: "Apagar este registro?", texto: `${precoTexto} no ${h.mercado} (${dia}).`, confirmar: "Apagar" };
    }
    return { titulo: "Excluir produto?", texto: `"${produto.nome}" sai do catálogo.`, confirmar: "Excluir" };
  };

  return (
    <>
      <Folha
        onFechar={onFechar}
        rotulo={produto.nome}
        corpoStyle={{ padding: "24px 20px calc(32px + env(safe-area-inset-bottom))" }}
      >
        {erroGravacao && (
          <p
            role="alert"
            style={{
              ...TIPOGRAFIA.subcategoria,
              position: "sticky",
              top: 0,
              zIndex: 1,
              color: COR.erro,
              background: COR.erroBg,
              padding: "8px 12px",
              borderRadius: RAIO.sm,
              margin: "0 0 12px",
            }}
          >
            {erroGravacao}
          </p>
        )}

        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            marginBottom: "20px",
          }}
        >
          {editandoAdmin ? (
            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "8px", marginRight: "12px" }}>
              <input
                value={adminNome}
                onChange={(e) => setAdminNome(e.target.value)}
                placeholder="Nome"
                style={{ padding: "10px", borderRadius: RAIO.sm, border: BORDA, background: "var(--bg)", fontFamily: "Nunito, sans-serif", fontSize: FONTE.campo, color: "var(--text)" }}
              />
              <select
                value={adminCategoria}
                onChange={(e) => { setAdminCategoria(e.target.value); setAdminSubcategoria(""); }}
                style={{ padding: "10px", borderRadius: RAIO.sm, border: BORDA, background: "var(--bg)", fontFamily: "Nunito, sans-serif", fontSize: FONTE.campo, color: "var(--text)" }}
              >
                {[...ORDEM_CATEGORIAS].sort((a, b) => a.localeCompare(b, "pt-BR")).map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
              <select
                value={adminSubcategoria}
                onChange={(e) => setAdminSubcategoria(e.target.value)}
                style={{ padding: "10px", borderRadius: RAIO.sm, border: BORDA, background: "var(--bg)", fontFamily: "Nunito, sans-serif", fontSize: FONTE.campo, color: adminSubcategoria ? "var(--text)" : "var(--text-soft)" }}
              >
                <option value="">Subcategoria</option>
                {adminSubcategoria && !subcategoriasDaCategoria.includes(adminSubcategoria) && (
                  <option value={adminSubcategoria}>{adminSubcategoria}</option>
                )}
                {subcategoriasDaCategoria.map((sc) => (
                  <option key={sc} value={sc}>{sc}</option>
                ))}
              </select>
              <input
                value={adminMarcaPreferida}
                onChange={(e) => setAdminMarcaPreferida(e.target.value)}
                list="marcas-conhecidas"
                placeholder="Marca preferida (opcional)"
                aria-label="Marca preferida"
                style={{ padding: "10px", borderRadius: RAIO.sm, border: BORDA, background: "var(--bg)", fontFamily: "Nunito, sans-serif", fontSize: FONTE.campo, color: "var(--text)" }}
              />
              <div>
                <p style={{ ...TIPOGRAFIA.label, color: "var(--text-soft)", marginBottom: "6px" }}>Grupo de Substituição</p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginBottom: "8px" }}>
                  {adminGrupoSubstituicao.map((g) => (
                    <span
                      key={g}
                      style={{ display: "inline-flex", alignItems: "center", gap: "4px", background: "var(--bg)", border: BORDA, color: "var(--text-soft)", ...TIPOGRAFIA.subcategoria, fontWeight: 600, padding: "2px 8px", borderRadius: RAIO.pill }}
                    >
                      {g}
                      <BotaoIcone
                        icone={X}
                        tamanho={12}
                        rotulo={`Remover grupo ${g}`}
                        onClick={() => removerGrupoSubstituicao(g)}
                        style={{ margin: "-12px -12px -12px -8px" }}
                      />
                    </span>
                  ))}
                </div>
                <div style={{ display: "flex", gap: "6px" }}>
                  <input
                    value={adminNovoGrupoSubstituicao}
                    onChange={(e) => setAdminNovoGrupoSubstituicao(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && adicionarGrupoSubstituicao()}
                    placeholder="Novo grupo"
                    style={{ flex: 1, padding: "8px 10px", borderRadius: RAIO.sm, border: BORDA, background: "var(--bg)", fontFamily: "Nunito, sans-serif", fontSize: FONTE.campo, color: "var(--text)" }}
                  />
                  <BotaoIcone
                    icone={Plus}
                    tamanho={16}
                    cor={COR.textoSobreDestaque}
                    rotulo="Adicionar grupo de substituição"
                    onClick={adicionarGrupoSubstituicao}
                    style={{ borderRadius: RAIO.sm, background: "var(--amarelo)" }}
                  />
                </div>
              </div>
              <label style={{ display: "flex", alignItems: "flex-start", gap: "8px", cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={adminGenerico}
                  onChange={(e) => setAdminGenerico(e.target.checked)}
                  style={{ marginTop: "3px" }}
                />
                <span style={{ ...TIPOGRAFIA.subcategoria, color: "var(--text-soft)" }}>
                  Genérico — só ingrediente de receita (ex: "Óleo"). Não aparece no
                  catálogo; na lista entra uma variante do mesmo grupo.
                </span>
              </label>
              <div style={{ display: "flex", gap: "8px", marginTop: "4px" }}>
                <button
                  onClick={handleSalvarAdmin}
                  style={{ flex: 1, padding: "10px", borderRadius: RAIO.sm, border: "none", background: COR.sucesso, color: "white", fontFamily: "Nunito, sans-serif", fontWeight: FONTE.bold, cursor: "pointer" }}
                >
                  Salvar
                </button>
                <button
                  onClick={() => { setEditandoAdmin(false); setAdminNome(produto.nome); setAdminCategoria(produto.categoria); setAdminSubcategoria(produto.subcategoria || ""); setAdminGrupoSubstituicao(produto.grupoSubstituicao || []); setAdminGenerico(!!produto.generico); setAdminMarcaPreferida(produto.marcaPreferida || ""); }}
                  style={{ flex: 1, padding: "10px", borderRadius: RAIO.sm, border: "none", background: "var(--bg)", color: "var(--text-soft)", fontFamily: "Nunito, sans-serif", fontWeight: FONTE.bold, cursor: "pointer" }}
                >
                  Cancelar
                </button>
                {onDeletar && (
                  <BotaoIcone
                    icone={Trash2}
                    tamanho={16}
                    cor={COR.erro}
                    rotulo="Excluir produto"
                    onClick={() => setConfirmacao({ tipo: "produto" })}
                    style={{ borderRadius: RAIO.sm, background: COR.erroBg }}
                  />
                )}
              </div>
            </div>
          ) : (
            <div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginBottom: "8px" }}>
                {[
                  produto.generico ? "Genérico · só receitas" : null,
                  produto.categoria,
                  produto.subcategoria !== "-" ? produto.subcategoria : null,
                  ...(produto.grupoSubstituicao || []),
                ].filter(Boolean).map((label) => (
                  <span
                    key={label}
                    style={{
                      display: "inline-block",
                      background: "var(--bg)",
                      border: BORDA,
                      color: "var(--text-soft)",
                      ...TIPOGRAFIA.subcategoria,
                      fontWeight: 600,
                      padding: "2px 8px",
                      borderRadius: RAIO.pill,
                    }}
                  >
                    {label}
                  </span>
                ))}
              </div>
              <h2 style={{ ...TIPOGRAFIA.titulo, lineHeight: 1.2 }}>
                {produto.nome}
              </h2>
              {produto.marcaPreferida && (
                <p style={{ ...TIPOGRAFIA.subcategoria, color: "var(--text-soft)", marginTop: "4px" }}>
                  Marca preferida: {produto.marcaPreferida}
                </p>
              )}
            </div>
          )}
          <div style={{ display: "flex", alignItems: "center", flexShrink: 0 }}>
            {isAdmin && !editandoAdmin && !origemLista && (
              <BotaoIcone
                icone={Edit2}
                tamanho={18}
                rotulo="Editar produto"
                onClick={() => setEditandoAdmin(true)}
                style={{ margin: "-8px 0" }}
              />
            )}
            <BotaoIcone
              icone={X}
              tamanho={22}
              rotulo="Fechar"
              onClick={onFechar}
              style={{ margin: "-8px -10px -8px 0" }}
            />
          </div>
        </div>

        {/* Melhor preço */}
        {melhor && (
          <div
            style={{
              background: COR.sucessoBg,
              border: `1px solid ${COR.sucessoBorda}`,
              borderRadius: RAIO.md,
              padding: "12px 16px",
              marginBottom: "20px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <div style={{ minWidth: 0 }}>
              <p
                style={{
                  fontSize: FONTE.sm,
                  color: COR.sucesso,
                  fontWeight: FONTE.bold,
                }}
              >
                Menor preço atual
              </p>
              <p
                style={{
                  fontWeight: FONTE.black,
                  fontSize: FONTE.xxl,
                  color: COR.sucesso,
                }}
              >
                {formatarPreco(melhor.preco)}
              </p>
            </div>
            <div style={{ textAlign: "right", minWidth: 0, marginLeft: "12px" }}>
              <p
                style={{
                  fontWeight: FONTE.bold,
                  color: COR.sucesso,
                  fontSize: FONTE.base,
                  overflowWrap: "anywhere",
                }}
              >
                {melhor.mercado}
              </p>
              <p style={{ fontSize: FONTE.sm, color: COR.sucesso }}>
                preço de {melhor.data.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}
              </p>
            </div>
          </div>
        )}
        {melhor && descreverPreco(melhor) !== formatarPreco(melhor.preco) && (
          <p style={{ ...TIPOGRAFIA.subcategoria, color: COR.sucesso, margin: "-14px 4px 20px" }}>
            {descreverPreco(melhor)}
          </p>
        )}

        {/* Outros preços atuais (outros mercados, marcas ou tamanhos) */}
        {melhor && outrosPrecos.length > 0 && (
          <div style={{ marginBottom: "24px" }}>
            <p style={{ ...TIPOGRAFIA.label, color: "var(--text-soft)", marginBottom: "6px" }}>
              Outros preços atuais
            </p>
            {outrosPrecos.map((p) => (
              <div
                key={`${p.chave}-${p.marca}-${p.tamanho}-${p.data.getTime()}`}
                style={{ display: "flex", justifyContent: "space-between", gap: "12px", padding: "6px 0", borderBottom: `1px solid ${COR.divisoria}` }}
              >
                <span style={{ ...TIPOGRAFIA.corpo, minWidth: 0, overflowWrap: "anywhere" }}>
                  <strong>{p.mercado}</strong>
                  <span style={{ color: "var(--text-soft)" }}> · {p.data.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}</span>
                </span>
                <span style={{ ...TIPOGRAFIA.corpo, textAlign: "right", overflowWrap: "anywhere" }}>{descreverPreco(p)}</span>
              </div>
            ))}
          </div>
        )}

        {/* Registrar preço */}
        {origemLista && <div
          style={{
            background: "var(--bg)",
            borderRadius: RAIO.lg,
            padding: "16px",
            marginBottom: "24px",
          }}
        >
          <p style={{ ...TIPOGRAFIA.h3, marginBottom: "12px" }}>
            Registrar preço
          </p>

          {/* Mercado (digitável com sugestões) */}
          <label htmlFor="preco-mercado" style={{ ...TIPOGRAFIA.label, color: "var(--text-soft)" }}>
            Mercado
          </label>
          <input
            id="preco-mercado"
            type="text"
            list="mercados-catalogo"
            placeholder="Digite ou escolha um mercado"
            value={mercado}
            onChange={(e) => { setMercado(e.target.value); setErroDuplicado(false); }}
            autoComplete="off"
            style={{
              width: "100%",
              boxSizing: "border-box",
              background: "var(--card)",
              borderRadius: RAIO.sm,
              border: BORDA,
              padding: "10px 14px",
              margin: "6px 0 12px",
              fontFamily: "Nunito, sans-serif",
              fontSize: FONTE.campo,
              fontWeight: FONTE.bold,
              color: "var(--text)",
            }}
          />
          <datalist id="mercados-catalogo">
            {mercadosConhecidos.map((m) => (
              <option key={m} value={m} />
            ))}
          </datalist>

          {/* Chips de sugestão (atalho para os mercados mais comuns) */}
          {sugestoesMercado.length > 0 && (
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: "6px",
                marginBottom: "12px",
              }}
            >
              {sugestoesMercado.slice(0, 6).map((m) => (
                <button
                  key={m}
                  onClick={() => setMercado(m)}
                  style={{
                    padding: "6px 12px",
                    borderRadius: RAIO.pill,
                    border: BORDA,
                    background: "var(--card)",
                    color: "var(--text)",
                    fontFamily: "Nunito, sans-serif",
                    fontWeight: FONTE.bold,
                    fontSize: FONTE.sm,
                    cursor: "pointer",
                  }}
                >
                  {m}
                </button>
              ))}
            </div>
          )}

          {/* Preço */}
          <label htmlFor="preco-registro" style={{ ...TIPOGRAFIA.label, color: "var(--text-soft)" }}>
            Preço
          </label>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              background: "var(--card)",
              borderRadius: RAIO.sm,
              border: BORDA,
              padding: "10px 14px",
              margin: "6px 0 12px",
              gap: "8px",
            }}
          >
            <span style={{ fontWeight: FONTE.bold, color: "var(--text-soft)" }}>
              R$
            </span>
            <input
              id="preco-registro"
              type="number"
              inputMode="decimal"
              placeholder="0,00"
              value={preco}
              onChange={(e) => setPreco(e.target.value)}
              style={{
                border: "none",
                fontFamily: "Nunito, sans-serif",
                fontSize: FONTE.campo,
                fontWeight: FONTE.bold,
                flex: 1,
                color: "var(--text)",
                background: "transparent",
              }}
            />
          </div>

          {/* Marca e tamanho (opcionais) */}
          <label htmlFor="preco-marca" style={{ ...TIPOGRAFIA.label, color: "var(--text-soft)" }}>
            Marca
          </label>
          <input
            id="preco-marca"
            type="text"
            list="marcas-conhecidas"
            placeholder="Opcional"
            value={marca}
            onChange={(e) => { setMarca(e.target.value); setErroDuplicado(false); }}
            autoComplete="off"
            style={{
              width: "100%",
              boxSizing: "border-box",
              background: "var(--card)",
              borderRadius: RAIO.sm,
              border: BORDA,
              padding: "10px 14px",
              margin: "6px 0 12px",
              fontFamily: "Nunito, sans-serif",
              fontSize: FONTE.campo,
              fontWeight: FONTE.bold,
              color: "var(--text)",
            }}
          />
          <datalist id="marcas-conhecidas">
            {marcasConhecidas.map((m) => (
              <option key={m} value={m} />
            ))}
          </datalist>

          <label htmlFor="preco-tamanho" style={{ ...TIPOGRAFIA.label, color: "var(--text-soft)" }}>
            Tamanho da embalagem
          </label>
          <input
            id="preco-tamanho"
            type="text"
            placeholder={aPeso ? "Preço por kg" : "Ex.: 500 g, 1 L, 12 un"}
            value={aPeso ? "" : tamanhoTexto}
            disabled={aPeso}
            onChange={(e) => { setTamanhoTexto(e.target.value); setErroTamanho(false); setErroDuplicado(false); }}
            autoComplete="off"
            style={{ ...{
              width: "100%",
              boxSizing: "border-box",
              background: "var(--card)",
              borderRadius: RAIO.sm,
              border: BORDA,
              padding: "10px 14px",
              margin: "6px 0 12px",
              fontFamily: "Nunito, sans-serif",
              fontSize: FONTE.campo,
              fontWeight: FONTE.bold,
              color: "var(--text)",
            }, margin: "6px 0 6px", ...(aPeso ? BOTAO_DESABILITADO : {}) }}
          />
          <label style={{ display: "flex", alignItems: "center", gap: "8px", margin: "0 0 12px", cursor: "pointer" }}>
            <input
              type="checkbox"
              checked={aPeso}
              onChange={(e) => { setAPeso(e.target.checked); setErroTamanho(false); setErroDuplicado(false); }}
            />
            <span style={{ ...TIPOGRAFIA.subcategoria, color: "var(--text-soft)" }}>
              Vendido a peso (o preço é por kg)
            </span>
          </label>
          {erroTamanho && (
            <p style={{ ...TIPOGRAFIA.subcategoria, color: COR.erro, margin: "-6px 0 12px" }}>
              Não entendi o tamanho. Use, por exemplo, 500 g, 1,5 L ou 12 un.
            </p>
          )}

          {/* Data (editável, pré-preenchida com hoje) */}
          <label htmlFor="preco-data" style={{ ...TIPOGRAFIA.label, color: "var(--text-soft)" }}>
            Data
          </label>
          <input
            id="preco-data"
            type="date"
            value={data}
            onChange={(e) => { setData(e.target.value); setErroDuplicado(false); }}
            style={{
              width: "100%",
              boxSizing: "border-box",
              background: "var(--card)",
              borderRadius: RAIO.sm,
              border: BORDA,
              padding: "10px 14px",
              margin: "6px 0 12px",
              fontFamily: "Nunito, sans-serif",
              fontSize: FONTE.campo,
              fontWeight: FONTE.bold,
              color: "var(--text)",
            }}
          />

          {/* Observação (texto livre) */}
          <label htmlFor="preco-observacao" style={{ ...TIPOGRAFIA.label, color: "var(--text-soft)" }}>
            Observação
          </label>
          <textarea
            id="preco-observacao"
            placeholder="Ex.: promoção, marca, embalagem..."
            value={observacao}
            onChange={(e) => setObservacao(e.target.value)}
            rows={2}
            style={{
              width: "100%",
              boxSizing: "border-box",
              background: "var(--card)",
              borderRadius: RAIO.sm,
              border: BORDA,
              padding: "10px 14px",
              margin: "6px 0 16px",
              resize: "vertical",
              fontFamily: "Nunito, sans-serif",
              fontSize: FONTE.campo,
              fontWeight: FONTE.medio,
              color: "var(--text)",
            }}
          />

          {erroDuplicado && (
            <p style={{ ...TIPOGRAFIA.subcategoria, color: COR.erro, margin: "0 0 10px" }}>
              ⚠️ Já existe um preço registrado nesse mercado e data. Se for outra marca ou outro tamanho, preencha esses campos.
            </p>
          )}

          <button
            onClick={handleRegistrar}
            disabled={!mercado.trim() || !preco}
            style={{
              width: "100%",
              padding: "14px",
              borderRadius: RAIO.md,
              border: "none",
              background: "var(--amarelo)",
              color: COR.textoSobreDestaque,
              fontFamily: "Nunito, sans-serif",
              fontWeight: FONTE.extrabold,
              fontSize: FONTE.lg,
              cursor: "pointer",
              transition: "all 0.2s",
              ...(!mercado.trim() || !preco ? BOTAO_DESABILITADO : {}),
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
            }}
          >
            <Plus size={18} />
            {sucesso ? "✓ Registrado!" : "Registrar"}
          </button>
        </div>}

        {/* Histórico */}
        {historico.length > 0 && (
          <div>
            <p style={{ ...TIPOGRAFIA.h3, marginBottom: "12px" }}>
              Histórico de preços
            </p>
            {historico.map((h, i) => (
              <div
                key={`${h.mercado}-${h.data?.seconds}-${h.preco}-${h.marca ?? ""}-${h.tamanho ?? ""}`}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "10px 0",
                  borderBottom:
                    i < historico.length - 1 ? `1px solid ${COR.divisoria}` : "none",
                }}
              >
                <div style={{ flex: 1, minWidth: 0, paddingRight: "8px" }}>
                  <p style={{ ...TIPOGRAFIA.nomeProduto }}>{mercadoCanonico(h.mercado)}</p>
                  <p
                    style={{
                      ...TIPOGRAFIA.subcategoria,
                      color: "var(--text-soft)",
                    }}
                  >
                    {dataDoRegistro(h)?.toLocaleDateString("pt-BR")}
                  </p>
                  {descreverPreco(h) !== formatarPreco(h.preco) && (
                    <p style={{ ...TIPOGRAFIA.subcategoria, color: "var(--text)", marginTop: "2px", overflowWrap: "anywhere" }}>
                      {descreverPreco(h)}
                    </p>
                  )}
                  {h.observacao && (
                    <p
                      style={{
                        ...TIPOGRAFIA.corpo,
                        fontSize: FONTE.sm,
                        color: "var(--text-soft)",
                        marginTop: "2px",
                      }}
                    >
                      {h.observacao}
                    </p>
                  )}
                </div>
                <p style={{ fontWeight: FONTE.extrabold, fontSize: FONTE.xl }}>
                  R$ {h.preco.toFixed(2).replace(".", ",")}
                </p>
                {isAdmin && (
                  <BotaoIcone
                    icone={Trash2}
                    tamanho={14}
                    cor={COR.erro}
                    rotulo="Apagar registro"
                    onClick={() => setConfirmacao({ tipo: "registro", h })}
                    style={{ marginLeft: "10px", borderRadius: RAIO.sm, background: COR.erroBg }}
                  />
                )}
              </div>
            ))}
          </div>
        )}

        {historico.length === 0 && (
          <p
            style={{
              ...TIPOGRAFIA.corpo,
              textAlign: "center",
              color: "var(--text-soft)",
            }}
          >
            Nenhum preço registrado ainda.
          </p>
        )}
      </Folha>

      {confirmacao && (
        <Confirmacao
          titulo={textoConfirmacao().titulo}
          confirmar={textoConfirmacao().confirmar}
          destrutiva
          aoCancelar={() => setConfirmacao(null)}
          aoConfirmar={() => {
            const c = confirmacao;
            setConfirmacao(null);
            if (c.tipo === "registro") apagarRegistro(c.h);
            else onDeletar(produto);
          }}
        >
          {textoConfirmacao().texto}
        </Confirmacao>
      )}
    </>
  );
}

export default DetalhesProduto;
