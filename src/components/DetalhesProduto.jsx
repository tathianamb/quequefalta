import { useMemo, useState } from "react";
import { doc, updateDoc, arrayUnion } from "firebase/firestore";
import { db } from "../config/firebase";
import { corDaCategoria } from "../utils/categorias";
import { X, Plus } from "lucide-react";
import { TIPOGRAFIA, FONTE, RAIO, BORDA, COR } from "../utils/estilos";

const MERCADOS_BASE = ["Atacadão", "Max", "Avenida", "Superbom"];

function hojeISO() {
  const d = new Date();
  const off = d.getTimezoneOffset();
  return new Date(d.getTime() - off * 60000).toISOString().slice(0, 10);
}

function DetalhesProduto({ produto, onFechar, listaAtiva, itemDaLista, catalogo = [] }) {
  const [mercado, setMercado] = useState("");
  const [preco, setPreco] = useState("");
  const [data, setData] = useState(hojeISO());
  const [observacao, setObservacao] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [sucesso, setSucesso] = useState(false);

  const cor = corDaCategoria(produto.categoria);

  const mercadosConhecidos = useMemo(() => {
    const set = new Set(MERCADOS_BASE);
    catalogo.forEach((p) =>
      (p.historico || []).forEach((h) => {
        if (h.mercado) set.add(h.mercado);
      })
    );
    return Array.from(set).sort((a, b) => a.localeCompare(b, "pt-BR"));
  }, [catalogo]);

  const sugestoesMercado = useMemo(() => {
    const termo = mercado.trim().toLowerCase();
    if (!termo) return mercadosConhecidos;
    return mercadosConhecidos.filter(
      (m) => m.toLowerCase().includes(termo) && m.toLowerCase() !== termo
    );
  }, [mercado, mercadosConhecidos]);

  const historico = (produto.historico || [])
    .slice()
    .sort((a, b) => b.data?.toDate?.() - a.data?.toDate?.());

  const melhorPreco = () => {
    if (!historico.length) return null;
    const porMercado = {};
    historico.forEach((h) => {
      if (!porMercado[h.mercado] || h.preco < porMercado[h.mercado]) {
        porMercado[h.mercado] = h.preco;
      }
    });
    const melhor = Object.entries(porMercado).sort((a, b) => a[1] - b[1])[0];
    return melhor ? { mercado: melhor[0], preco: melhor[1] } : null;
  };

  const handleRegistrar = async () => {
    if (!mercado.trim() || !preco) return;
    setSalvando(true);
    try {
      const dataRegistro = data
        ? new Date(`${data}T12:00:00`)
        : new Date();
      const ref = doc(db, "catalogo", produto.id);
      await updateDoc(ref, {
        historico: arrayUnion({
          mercado: mercado.trim(),
          preco: parseFloat(preco.replace(",", ".")),
          data: dataRegistro,
          observacao: observacao.trim() || null,
          listaAtiva: listaAtiva,
        }),
      });
      setSucesso(true);
      setMercado("");
      setPreco("");
      setData(hojeISO());
      setObservacao("");
      setTimeout(() => setSucesso(false), 2000);
    } finally {
      setSalvando(false);
    }
  };

  const melhor = melhorPreco();

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 100,
        display: "flex",
        flexDirection: "column",
        justifyContent: "flex-end",
        background: "rgba(0,0,0,0.4)",
      }}
      onClick={onFechar}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "var(--card)",
          borderRadius: `${RAIO.xxl} ${RAIO.xxl} 0 0`,
          padding: "24px 20px 40px",
          maxHeight: "85vh",
          overflowY: "auto",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            marginBottom: "20px",
          }}
        >
          <div>
            <div
              style={{
                display: "inline-block",
                background: cor + "22",
                color: cor,
                fontSize: FONTE.sm,
                fontWeight: FONTE.bold,
                padding: "3px 10px",
                borderRadius: RAIO.pill,
                marginBottom: "6px",
              }}
            >
              {produto.categoria}
            </div>
            <h2 style={{ ...TIPOGRAFIA.titulo, lineHeight: 1.2 }}>
              {produto.nome}
            </h2>
            {produto.subcategoria && (
              <p
                style={{
                  ...TIPOGRAFIA.subcategoria,
                  color: "var(--text-soft)",
                  marginTop: "2px",
                }}
              >
                {produto.subcategoria}
              </p>
            )}
          </div>
          <X
            size={22}
            color="var(--text-soft)"
            style={{ cursor: "pointer", flexShrink: 0 }}
            onClick={onFechar}
          />
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
            <div>
              <p
                style={{
                  fontSize: FONTE.sm,
                  color: COR.sucesso,
                  fontWeight: FONTE.bold,
                }}
              >
                Melhor preço registrado
              </p>
              <p
                style={{
                  fontWeight: FONTE.black,
                  fontSize: FONTE.xxl,
                  color: COR.sucesso,
                }}
              >
                R$ {melhor.preco.toFixed(2).replace(".", ",")}
              </p>
            </div>
            <p
              style={{
                fontWeight: FONTE.bold,
                color: COR.sucesso,
                fontSize: FONTE.base,
              }}
            >
              {melhor.mercado}
            </p>
          </div>
        )}

        {/* Registrar preço */}
        <div
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
          <label style={{ ...TIPOGRAFIA.label, color: "var(--text-soft)" }}>
            Mercado
          </label>
          <input
            type="text"
            list="mercados-catalogo"
            placeholder="Digite ou escolha um mercado"
            value={mercado}
            onChange={(e) => setMercado(e.target.value)}
            autoComplete="off"
            style={{
              width: "100%",
              boxSizing: "border-box",
              background: "var(--card)",
              borderRadius: RAIO.sm,
              border: BORDA,
              padding: "10px 14px",
              margin: "6px 0 12px",
              outline: "none",
              fontFamily: "Nunito, sans-serif",
              fontSize: FONTE.lg,
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
          <label style={{ ...TIPOGRAFIA.label, color: "var(--text-soft)" }}>
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
              type="number"
              inputMode="decimal"
              placeholder="0,00"
              value={preco}
              onChange={(e) => setPreco(e.target.value)}
              style={{
                border: "none",
                outline: "none",
                fontFamily: "Nunito, sans-serif",
                fontSize: FONTE.lg,
                fontWeight: FONTE.bold,
                flex: 1,
                color: "var(--text)",
                background: "transparent",
              }}
            />
          </div>

          {/* Data (editável, pré-preenchida com hoje) */}
          <label style={{ ...TIPOGRAFIA.label, color: "var(--text-soft)" }}>
            Data
          </label>
          <input
            type="date"
            value={data}
            onChange={(e) => setData(e.target.value)}
            style={{
              width: "100%",
              boxSizing: "border-box",
              background: "var(--card)",
              borderRadius: RAIO.sm,
              border: BORDA,
              padding: "10px 14px",
              margin: "6px 0 12px",
              outline: "none",
              fontFamily: "Nunito, sans-serif",
              fontSize: FONTE.lg,
              fontWeight: FONTE.bold,
              color: "var(--text)",
            }}
          />

          {/* Observação (texto livre) */}
          <label style={{ ...TIPOGRAFIA.label, color: "var(--text-soft)" }}>
            Observação
          </label>
          <textarea
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
              outline: "none",
              resize: "vertical",
              fontFamily: "Nunito, sans-serif",
              fontSize: FONTE.md,
              fontWeight: FONTE.medio,
              color: "var(--text)",
            }}
          />

          <button
            onClick={handleRegistrar}
            disabled={!mercado.trim() || !preco || salvando}
            style={{
              width: "100%",
              padding: "14px",
              borderRadius: RAIO.md,
              border: "none",
              background: !mercado.trim() || !preco ? COR.borda : "var(--laranja)",
              color: !mercado.trim() || !preco ? "var(--text-soft)" : "white",
              fontFamily: "Nunito, sans-serif",
              fontWeight: FONTE.extrabold,
              fontSize: FONTE.lg,
              cursor: !mercado.trim() || !preco ? "default" : "pointer",
              transition: "all 0.2s",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
            }}
          >
            <Plus size={18} />
            {sucesso ? "Registrado! ✓" : salvando ? "Salvando..." : "Registrar"}
          </button>
        </div>

        {/* Histórico */}
        {historico.length > 0 && (
          <div>
            <p style={{ ...TIPOGRAFIA.h3, marginBottom: "12px" }}>
              Histórico de preços
            </p>
            {historico.map((h, i) => (
              <div
                key={i}
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
                  <p style={{ ...TIPOGRAFIA.nomeProduto }}>{h.mercado}</p>
                  <p
                    style={{
                      ...TIPOGRAFIA.subcategoria,
                      color: "var(--text-soft)",
                    }}
                  >
                    {h.data?.toDate
                      ? h.data.toDate().toLocaleDateString("pt-BR")
                      : new Date(h.data).toLocaleDateString("pt-BR")}
                  </p>
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
      </div>
    </div>
  );
}

export default DetalhesProduto;
