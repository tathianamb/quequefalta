import { useState } from "react";
import { baixarCsv } from "../utils/csv";
import Folha from "./Folha";
import BotaoIcone from "./BotaoIcone";
import Confirmacao from "./Confirmacao";
import ItemMenu from "./menu/ItemMenu";
import SeletorTema from "./menu/SeletorTema";
import GruposFamiliares from "./menu/GruposFamiliares";
import SugerirProduto from "./menu/SugerirProduto";
import VincularTelegram from "./menu/VincularTelegram";
import ExportarEmCasa from "./menu/ExportarEmCasa";
import {
  Lightbulb,
  Link,
  Shield,
  LogOut,
  X,
  Download,
  Home as HomeIcon,
} from "lucide-react";
import { signOut } from "firebase/auth";
import { auth } from "../config/firebase";
import { sairDaLista } from "../config/lista";
import { useTelegramVinculo } from "../hooks/useTelegramVinculo";
import { TIPOGRAFIA, RAIO, COR } from "../utils/estilos";

function Menu({
  onFechar,
  pushBack, // opcionais (useBackStack da Home): voltar das telas internas
  voltar,
  escuro,
  temaPreferencia,
  toggleTema,
  seguirSistema,
  listaAtiva,
  todasListas,
  setListaAtiva,
  setTodasListas,
  usuario,
  isAdmin,
  modoAdmin,
  setModoAdmin,
  telaInicial,
  catalogo,
  itensEmCasa = [],
}) {
  const [tela, setTela] = useState(telaInicial || "menu");
  const [confirmandoSaida, setConfirmandoSaida] = useState(false);
  const [saindoDoGrupo, setSaindoDoGrupo] = useState(null); // lista que a pessoa vai deixar

  const { vinculado, gerarCodigo, desvincular } = useTelegramVinculo(usuario);

  const confirmarSaidaDoGrupo = async () => {
    const lista = saindoDoGrupo;
    setSaindoDoGrupo(null);
    await sairDaLista(usuario, lista.id);
    setTodasListas((prev) => prev.filter((l) => l.id !== lista.id));
    if (lista.id === listaAtiva) setListaAtiva(usuario.uid);
    onFechar();
  };

  // Telas internas: abrir registra o voltar do aparelho, e os botões "←" usam
  // esse mesmo voltar. Aberto direto numa tela interna (atalhos da Home), o
  // voltar fecha o menu, porque a entrada no topo é a do próprio menu.
  const abertoDiretoNaTela = !!telaInicial && telaInicial !== "menu";
  const abrirTela = (t) => {
    setTela(t);
    pushBack?.(() => setTela("menu"));
  };
  const voltarTela = () => {
    const semPilha = () => (abertoDiretoNaTela ? onFechar() : setTela("menu"));
    if (voltar) voltar(semPilha);
    else semPilha();
  };

  const exportarCatalogo = () => {
    baixarCsv(
      "catalogo.csv",
      ["nome", "categoria", "subcategoria", "grupoSubstituicao"],
      [...catalogo]
        .sort((a, b) => (a.nome ?? "").localeCompare(b.nome ?? "", "pt-BR"))
        .map((p) => [p.nome, p.categoria, p.subcategoria, (p.grupoSubstituicao ?? []).join("; ")]),
    );
  };

  return (
    <>
      {/* Nas telas internas o Esc volta uma tela; o fundo e o X continuam fechando/voltando como antes. */}
      <Folha
        onFechar={onFechar}
        onEsc={tela === "menu" ? onFechar : voltarTela}
        rotulo="Menu"
        corpoStyle={{ padding: "24px 20px calc(32px + env(safe-area-inset-bottom))", ...TIPOGRAFIA.corpo }}
      >
        {/* Header */}
        {tela === "menu" && (
          <div
            style={{ display: "flex", flexDirection: "column", gap: "24px" }}
          >
            {/* Perfil */}
            <div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: "8px",
                  paddingLeft: "4px",
                }}
              >
                <p
                  style={{
                    ...TIPOGRAFIA.label,
                    color: "var(--text-soft)",
                  }}
                >
                  Perfil
                </p>
                <BotaoIcone
                  icone={X}
                  tamanho={22}
                  rotulo="Fechar"
                  onClick={onFechar}
                  style={{ margin: "-8px -10px -8px 0" }}
                />
              </div>
              <div
                style={{
                  padding: "14px 16px",
                  background: "var(--bg)",
                  borderRadius: RAIO.md,
                }}
              >
                <p style={{ ...TIPOGRAFIA.titulo, color: "var(--text)" }}>
                  {usuario.displayName}
                </p>
                <p style={{ ...TIPOGRAFIA.corpo, color: "var(--text-soft)" }}>
                  {usuario.email}
                </p>
              </div>
            </div>

            {/* Configurações */}
            <div>
              <p
                style={{
                  ...TIPOGRAFIA.label,
                  color: "var(--text-soft)",
                  marginBottom: "8px",
                  paddingLeft: "4px",
                }}
              >
                Configurações
              </p>
              <div
                style={{ display: "flex", flexDirection: "column", gap: "8px" }}
              >
                <SeletorTema
                  escuro={escuro}
                  temaPreferencia={temaPreferencia}
                  toggleTema={toggleTema}
                  seguirSistema={seguirSistema}
                />
              </div>
            </div>

            {/* Grupo familiar */}
            <GruposFamiliares
              todasListas={todasListas}
              listaAtiva={listaAtiva}
              usuario={usuario}
              setListaAtiva={setListaAtiva}
              onFechar={onFechar}
              aoSair={setSaindoDoGrupo}
            />

            {/* Ações */}
            <div>
              <p
                style={{
                  ...TIPOGRAFIA.label,
                  color: "var(--text-soft)",
                  marginBottom: "8px",
                  paddingLeft: "4px",
                }}
              >
                Ações
              </p>
              <div
                style={{ display: "flex", flexDirection: "column", gap: "8px" }}
              >
                <ItemMenu icone={Lightbulb} onClick={() => abrirTela("sugestao")} seta>
                  Sugerir produto
                </ItemMenu>

                <ItemMenu
                  icone={Link}
                  onClick={() => abrirTela("telegram")}
                  seta
                  extra={
                    vinculado && (
                      <span style={{ ...TIPOGRAFIA.subcategoria, color: "var(--verde-texto)" }}>
                        vinculado
                      </span>
                    )
                  }
                >
                  Vincular Telegram
                </ItemMenu>

                {isAdmin && (
                  <ItemMenu
                    icone={Shield}
                    corIcone={COR.erro}
                    corTexto={COR.erro}
                    extra={
                      <div
                        onClick={() => setModoAdmin(v => !v)}
                        style={{
                          width: "48px",
                          height: "28px",
                          borderRadius: RAIO.pill,
                          background: modoAdmin ? "var(--laranja)" : "var(--text-soft)",
                          position: "relative",
                          cursor: "pointer",
                          transition: "background 0.2s",
                          flexShrink: 0,
                        }}
                      >
                        <div style={{
                          position: "absolute",
                          top: "3px",
                          left: modoAdmin ? "23px" : "3px",
                          width: "22px",
                          height: "22px",
                          borderRadius: "50%",
                          background: "white",
                          transition: "left 0.2s",
                          boxShadow: "0 1px 4px rgba(0,0,0,0.2)",
                        }} />
                      </div>
                    }
                  >
                    Modo admin
                  </ItemMenu>
                )}

                <ItemMenu icone={HomeIcon} onClick={() => abrirTela("exportar-casa")} seta>
                  Exportar o que tem em casa
                </ItemMenu>

                {isAdmin && (
                  <ItemMenu icone={Download} onClick={exportarCatalogo}>
                    Exportar catálogo CSV
                  </ItemMenu>
                )}

                <ItemMenu
                  icone={LogOut}
                  corTexto="var(--text-soft)"
                  onClick={() => setConfirmandoSaida(true)}
                  style={{ marginTop: "4px" }}
                >
                  Sair da conta
                </ItemMenu>
              </div>
            </div>
          </div>
        )}

        {tela === "sugestao" && (
          <SugerirProduto
            voltarTela={voltarTela}
            usuario={usuario}
            listaAtiva={listaAtiva}
            catalogo={catalogo}
          />
        )}

        {tela === "telegram" && (
          <VincularTelegram
            voltarTela={voltarTela}
            vinculado={vinculado}
            gerarCodigo={gerarCodigo}
            desvincular={desvincular}
          />
        )}

        {tela === "exportar-casa" && (
          <ExportarEmCasa voltarTela={voltarTela} itensEmCasa={itensEmCasa} />
        )}

      </Folha>

      {confirmandoSaida && (
        <Confirmacao
          icone="👋"
          titulo="Sair da conta?"
          confirmar="Sair"
          aoCancelar={() => setConfirmandoSaida(false)}
          aoConfirmar={() => signOut(auth)}
        >
          Você precisará fazer login novamente para acessar sua lista.
        </Confirmacao>
      )}

      {saindoDoGrupo && (
        <Confirmacao
          titulo={`Sair do grupo de ${saindoDoGrupo.criadaPor}?`}
          confirmar="Sair do grupo"
          destrutiva
          aoCancelar={() => setSaindoDoGrupo(null)}
          aoConfirmar={confirmarSaidaDoGrupo}
        >
          Você deixa de ver a lista e o que tem em casa desse grupo.
        </Confirmacao>
      )}
    </>
  );
}

export default Menu;
