import { useState } from "react";
import { X } from "lucide-react";
import BotaoIcone from "../BotaoIcone";
import { TIPOGRAFIA, RAIO, BOTAO_PRIMARIO, BOTAO_SECUNDARIO, BOTAO_DESABILITADO, COR } from "../../utils/estilos";

const TELEGRAM_BOT_USERNAME = "quequefalta_bot";

// Tela interna "Vincular Telegram". O estado do vínculo (`vinculado`,
// `gerarCodigo`, `desvincular`) vem do Menu, que já o usa no selo da linha;
// o código gerado e os erros ficam aqui.
function VincularTelegram({ voltarTela, vinculado, gerarCodigo, desvincular }) {
  const [codigoVinculo, setCodigoVinculo] = useState(null);
  const [gerandoCodigo, setGerandoCodigo] = useState(false);
  const [erroTelegram, setErroTelegram] = useState(false);

  const handleGerarCodigo = async () => {
    setGerandoCodigo(true);
    setErroTelegram(false);
    try {
      const { codigo } = await gerarCodigo();
      setCodigoVinculo({ codigo });
    } catch (e) {
      console.error("Erro ao gerar código de vínculo:", e);
      setErroTelegram(true);
    } finally {
      setGerandoCodigo(false);
    }
  };

  const handleDesvincular = () => {
    setErroTelegram(false);
    desvincular().catch((e) => {
      console.error("Erro ao desvincular o Telegram:", e);
      setErroTelegram(true);
    });
  };

  return (
    <div
      style={{ display: "flex", flexDirection: "column", gap: "12px" }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "4px",
        }}
      >
        <p style={{ ...TIPOGRAFIA.h2, color: "var(--text)" }}>
          Vincular Telegram
        </p>
        <BotaoIcone
          icone={X}
          tamanho={22}
          rotulo="Fechar"
          onClick={() => {
            voltarTela();
            setCodigoVinculo(null);
            setErroTelegram(false);
          }}
          style={{ margin: "-6px -10px -6px 0" }}
        />
      </div>

      {vinculado ? (
        <>
          <p
            style={{
              color: "var(--text-soft)",
              ...TIPOGRAFIA.corpo,
              marginBottom: "4px",
            }}
          >
            Seu Telegram está vinculado. Cole a nota fiscal no bot (/nota)
            para registrar os preços automaticamente.
          </p>
          <button
            onClick={handleDesvincular}
            style={{
              padding: "14px",
              ...BOTAO_SECUNDARIO,
              cursor: "pointer",
            }}
          >
            Desvincular
          </button>
        </>
      ) : codigoVinculo ? (
        <>
          <p
            style={{
              color: "var(--text-soft)",
              ...TIPOGRAFIA.corpo,
              marginBottom: "4px",
            }}
          >
            Abra o bot no Telegram e envie o comando abaixo:
          </p>
          <div
            style={{
              padding: "20px",
              background: "var(--bg)",
              borderRadius: RAIO.md,
              textAlign: "center",
            }}
          >
            <p
              style={{
                ...TIPOGRAFIA.display,
                color: "var(--text)",
                letterSpacing: "4px",
                marginBottom: "8px",
              }}
            >
              {codigoVinculo.codigo}
            </p>
            <p style={{ ...TIPOGRAFIA.subcategoria, color: "var(--text-soft)" }}>
              /vincular {codigoVinculo.codigo}
            </p>
          </div>
          <p style={{ ...TIPOGRAFIA.subcategoria, color: "var(--text-soft)" }}>
            Válido por 10 minutos.
          </p>
          <a
            href={`https://t.me/${TELEGRAM_BOT_USERNAME}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              padding: "14px",
              ...BOTAO_PRIMARIO,
              textAlign: "center",
              textDecoration: "none",
              display: "block",
            }}
          >
            Abrir bot no Telegram
          </a>
        </>
      ) : (
        <>
          <p
            style={{
              color: "var(--text-soft)",
              ...TIPOGRAFIA.corpo,
              marginBottom: "4px",
            }}
          >
            Vincule sua conta ao bot do Telegram para registrar preços
            colando notas fiscais no bot.
          </p>
          <button
            onClick={handleGerarCodigo}
            disabled={gerandoCodigo}
            style={{
              padding: "14px",
              ...BOTAO_PRIMARIO,
              cursor: gerandoCodigo ? "default" : "pointer",
              ...(gerandoCodigo && BOTAO_DESABILITADO),
            }}
          >
            {gerandoCodigo ? "Gerando..." : "Gerar código"}
          </button>
        </>
      )}
      {erroTelegram && (
        <p style={{ ...TIPOGRAFIA.subcategoria, color: COR.erro, margin: 0 }}>
          Não foi possível concluir. Verifique a conexão e tente de novo.
        </p>
      )}
    </div>
  );
}

export default VincularTelegram;
