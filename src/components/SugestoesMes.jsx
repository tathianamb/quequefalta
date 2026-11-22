import { useMemo, useState } from "react";
import { X, Check, ChevronDown, ChevronUp } from "lucide-react";
import { montarSugestoesDoMes, JANELA_DIAS, IDA_GRANDE_ITENS } from "../utils/sugestoesMes";
import { formatarPreco } from "../utils/precos";
import { corDaCategoria } from "../utils/categorias";
import { TIPOGRAFIA, FONTE, RAIO, COR, BOTAO_PRIMARIO, BOTAO_SECUNDARIO } from "../utils/estilos";

// Bottom sheet "Sugestões do mês": o que a casa comprou nos últimos
// JANELA_DIAS, com os recorrentes já marcados e os avulsos (comprados uma vez
// numa ida pequena) à parte e desmarcados. Regras em utils/sugestoesMes.js.
function SugestoesMes({ catalogo, listaAtiva, lista, adicionarItem, toggleComprado, onFechar }) {
  const { recorrentes, avulsos, idas } = useMemo(
    () => montarSugestoesDoMes({ catalogo, listaAtiva, lista }),
    [catalogo, listaAtiva, lista],
  );
  // Recorrentes que não estão em casa começam marcados; o resto, desmarcado.
  const [selecao, setSelecao] = useState(
    () => new Set(recorrentes.filter((s) => !s.emCasa).map((s) => s.produto.id)),
  );
  const [avulsosAbertos, setAvulsosAbertos] = useState(false);

  const alternar = (id) =>
    setSelecao((atual) => {
      const nova = new Set(atual);
      if (nova.has(id)) nova.delete(id);
      else nova.add(id);
      return nova;
    });

  // As escritas do useLista são síncronas para quem chama (a gravação segue em
  // segundo plano, e o erro é avisado pelo próprio hook), então o laço não trava
  // sem sinal e a folha fecha na hora. A checagem de duplicata é do hook.
  const adicionar = () => {
    for (const s of [...recorrentes, ...avulsos]) {
      if (!selecao.has(s.produto.id)) continue;
      // Em casa = item já existe na lista como comprado: volta a "comprar".
      if (s.itemLista?.comprado) toggleComprado(s.itemLista);
      else adicionarItem(s.produto);
    }
    onFechar();
  };

  const descrever = (s) => {
    const partes = [s.idas > 1 ? `${s.idas} idas` : s.idaGrande ? "compra grande" : "1 ida"];
    if (s.onde) partes.push(`${formatarPreco(s.onde.preco)} no ${s.onde.mercado}`);
    if (s.emCasa) partes.push("tem em casa");
    return partes.join(" · ");
  };

  const renderizar = (s) => {
    const marcado = selecao.has(s.produto.id);
    const cor = corDaCategoria(s.produto.categoria);
    return (
      <div
        key={s.produto.id}
        onClick={() => alternar(s.produto.id)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: "12px",
          padding: "10px 12px",
          marginBottom: "6px",
          borderRadius: RAIO.md,
          background: "var(--bg)",
          borderLeft: `4px solid ${cor}`,
          cursor: "pointer",
        }}
      >
        <div
          style={{
            width: "24px",
            height: "24px",
            flexShrink: 0,
            borderRadius: RAIO.sm,
            border: `1.5px solid ${marcado ? "var(--laranja)" : COR.borda}`,
            background: marcado ? "var(--laranja)" : "transparent",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {marcado && <Check size={14} color="white" strokeWidth={3} />}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ ...TIPOGRAFIA.nomeProduto, color: "var(--text)" }}>{s.produto.nome}</p>
          <p style={{ ...TIPOGRAFIA.subcategoria, color: "var(--text-soft)", marginTop: "2px" }}>
            {descrever(s)}
          </p>
        </div>
      </div>
    );
  };

  const vazio = !recorrentes.length && !avulsos.length;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 200,
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
          maxHeight: "85vh",
          display: "flex",
          flexDirection: "column",
          width: "100%",
          maxWidth: "480px",
          margin: "0 auto",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "16px 20px",
            flexShrink: 0,
            borderBottom: `1px solid ${COR.divisoria}`,
          }}
        >
          <div>
            <h2 style={{ ...TIPOGRAFIA.h2, color: "var(--text)" }}>Sugestões do mês</h2>
            <p style={{ ...TIPOGRAFIA.subcategoria, color: "var(--text-soft)", marginTop: "2px" }}>
              {idas} ida{idas === 1 ? "" : "s"} ao mercado nos últimos {JANELA_DIAS} dias
            </p>
          </div>
          <X size={20} color="var(--text-soft)" style={{ cursor: "pointer" }} onClick={onFechar} />
        </div>

        <div style={{ padding: "16px 20px", overflowY: "auto", flex: 1 }}>
          {vazio && (
            <p style={{ ...TIPOGRAFIA.corpo, color: "var(--text-soft)", textAlign: "center", padding: "24px 0" }}>
              Ainda não há compras registradas nos últimos {JANELA_DIAS} dias. Registre as notas pelo bot do
              Telegram para as sugestões aparecerem aqui.
            </p>
          )}

          {recorrentes.length > 0 && (
            <>
              <p style={{ ...TIPOGRAFIA.label, color: "var(--text-soft)", marginBottom: "8px" }}>
                Compras recorrentes ({recorrentes.length})
              </p>
              {recorrentes.map(renderizar)}
            </>
          )}

          {avulsos.length > 0 && (
            <div style={{ marginTop: recorrentes.length ? "20px" : 0 }}>
              <div
                onClick={() => setAvulsosAbertos((v) => !v)}
                style={{ display: "flex", alignItems: "center", gap: "6px", cursor: "pointer", marginBottom: "4px" }}
              >
                <p style={{ ...TIPOGRAFIA.label, color: "var(--text-soft)", flex: 1 }}>
                  Avulsos de idas pequenas ({avulsos.length})
                </p>
                {avulsosAbertos ? <ChevronUp size={16} color="var(--text-soft)" /> : <ChevronDown size={16} color="var(--text-soft)" />}
              </div>
              <p style={{ ...TIPOGRAFIA.subcategoria, color: "var(--text-soft)", marginBottom: "8px" }}>
                Comprados uma vez só, numa ida com menos de {IDA_GRANDE_ITENS} itens.
              </p>
              {avulsosAbertos && avulsos.map(renderizar)}
            </div>
          )}
        </div>

        <div
          style={{
            display: "flex",
            gap: "12px",
            padding: "16px 20px 80px",
            borderTop: `1px solid ${COR.divisoria}`,
            flexShrink: 0,
          }}
        >
          <button
            onClick={onFechar}
            style={{ flex: 1, padding: "14px", ...BOTAO_SECUNDARIO, fontSize: FONTE.base }}
          >
            Fechar
          </button>
          <button
            onClick={adicionar}
            disabled={!selecao.size}
            style={{
              flex: 2,
              padding: "14px",
              ...BOTAO_PRIMARIO,
              opacity: !selecao.size ? 0.5 : 1,
            }}
          >
            {`Adicionar ${selecao.size} à lista`}
          </button>
        </div>
      </div>
    </div>
  );
}

export default SugestoesMes;
