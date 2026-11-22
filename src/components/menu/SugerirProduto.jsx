import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import BotaoIcone from "../BotaoIcone";
import { ORDEM_CATEGORIAS } from "../../utils/categorias";
import { sugerirProduto } from "../../config/sugestoes";
import { TIPOGRAFIA, FONTE, RAIO, BOTAO_PRIMARIO, BOTAO_DESABILITADO, BORDA, COR } from "../../utils/estilos";

// Tela interna "Sugerir produto". Os campos e o timer do "Sugestão enviada"
// moram aqui: sair da tela desmonta o componente e cancela o timer, então o
// voltar automático só acontece se a pessoa ainda estiver nesta tela.
function SugerirProduto({ voltarTela, usuario, listaAtiva, catalogo }) {
  const [nome, setNome] = useState("");
  const [categoria, setCategoria] = useState("");
  const [subcategoria, setSubcategoria] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [sucesso, setSucesso] = useState(false);
  const [erroSugestao, setErroSugestao] = useState(false);
  const timerSugestaoRef = useRef(null);

  // Não deixa o timer do "Sugestão enviada" disparar depois de sair da tela.
  useEffect(() => () => clearTimeout(timerSugestaoRef.current), []);

  const handleSugestao = async () => {
    if (!nome || !categoria || enviando) return;
    setEnviando(true);
    setErroSugestao(false);
    try {
      // Só a checagem de duplicada espera o servidor; a gravação vale na hora
      // (local) e o erro, se vier, aparece no formulário.
      const { gravacao } = await sugerirProduto({ nome, categoria, subcategoria, usuario, listaAtiva });
      gravacao.catch((e) => {
        console.error("Erro ao enviar sugestão:", e);
        setSucesso(false);
        setErroSugestao(true);
      });
      setSucesso(true);
      setNome("");
      setCategoria("");
      setSubcategoria("");
      clearTimeout(timerSugestaoRef.current);
      timerSugestaoRef.current = setTimeout(() => {
        setSucesso(false);
        voltarTela();
      }, 2000);
    } catch (e) {
      console.error("Erro ao enviar sugestão:", e);
      setErroSugestao(true);
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div
      style={{ display: "flex", flexDirection: "column", gap: "12px" }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "4px",
        }}
      >
        <p style={{ ...TIPOGRAFIA.h2, color: "var(--text)" }}>
          Sugerir produto
        </p>
        <BotaoIcone
          icone={X}
          tamanho={22}
          rotulo="Fechar"
          onClick={voltarTela}
          style={{ margin: "-6px -10px -6px 0" }}
        />
      </div>

      <p
        style={{
          color: "var(--text-soft)",
          ...TIPOGRAFIA.corpo,
          marginBottom: "4px",
        }}
      >
        Encontrou um produto que não está no catálogo? Sugira e
        avaliaremos a inclusão!
      </p>

      <input
        value={nome}
        onChange={(e) => setNome(e.target.value)}
        placeholder="Nome do produto *"
        style={{
          padding: "14px",
          borderRadius: RAIO.md,
          border: BORDA,
          background: "var(--bg)",
          fontFamily: "Nunito, sans-serif",
          ...TIPOGRAFIA.corpo,
          fontSize: FONTE.campo,
          color: "var(--text)",
        }}
      />

      <select
        value={categoria}
        onChange={(e) => { setCategoria(e.target.value); setSubcategoria(""); }}
        style={{
          padding: "14px",
          borderRadius: RAIO.md,
          border: BORDA,
          background: "var(--bg)",
          fontFamily: "Nunito, sans-serif",
          ...TIPOGRAFIA.corpo,
          fontSize: FONTE.campo,
          color: categoria ? "var(--text)" : "var(--text-soft)",
        }}
      >
        <option value="">Categoria *</option>
        {[...ORDEM_CATEGORIAS]
          .sort((a, b) => a.localeCompare(b, "pt-BR"))
          .map((cat) => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}
        <option value="Outro">Outro</option>
      </select>

      <select
        value={subcategoria}
        onChange={(e) => setSubcategoria(e.target.value)}
        disabled={!categoria}
        style={{
          padding: "14px",
          borderRadius: RAIO.md,
          border: BORDA,
          background: "var(--bg)",
          fontFamily: "Nunito, sans-serif",
          ...TIPOGRAFIA.corpo,
          fontSize: FONTE.campo,
          color: subcategoria ? "var(--text)" : "var(--text-soft)",
          opacity: !categoria ? 0.5 : 1,
        }}
      >
        <option value="">Subcategoria (opcional)</option>
        {[...new Set(
          catalogo
            .filter((p) => p.categoria === categoria && p.subcategoria)
            .map((p) => p.subcategoria)
        )]
          .sort((a, b) => a.localeCompare(b, "pt-BR"))
          .map((sc) => (
            <option key={sc} value={sc}>
              {sc}
            </option>
          ))}
      </select>

      <button
        onClick={handleSugestao}
        disabled={!nome || !categoria || enviando}
        style={{
          padding: "14px",
          ...BOTAO_PRIMARIO,
          cursor: !nome || !categoria ? "default" : "pointer",
          marginTop: "4px",
          ...(!nome || !categoria || enviando ? BOTAO_DESABILITADO : {}),
        }}
      >
        {sucesso
          ? "✓ Sugestão enviada!"
          : enviando
            ? "Enviando..."
            : "Enviar sugestão"}
      </button>
      {erroSugestao && (
        <p style={{ ...TIPOGRAFIA.subcategoria, color: COR.erro, margin: 0 }}>
          Não foi possível enviar a sugestão. Tente de novo.
        </p>
      )}
    </div>
  );
}

export default SugerirProduto;
