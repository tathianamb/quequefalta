# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**QueQueFalta** is a shared grocery list PWA for home use, built with React 19 + Vite and Firebase (Firestore + Google Auth). It is hosted on GitHub Pages under the path `/quequefalta/`. Mobile-first (max-width 480px), no automated tests.

A second, separate codebase lives in `functions/`: Firebase Cloud Functions (Node 20, ESM) implementing a Telegram bot that lets a user paste a grocery receipt (as pasted table text) and register prices into the same Firestore catalog without opening the app.

## Commands

### Frontend (repo root)

```bash
npm install --legacy-peer-deps       # install dependencies (legacy flag required)
npm run dev                          # dev server (Vite HMR)
npm run build                        # production build → ./dist
npm run preview                      # preview production build locally
npm run lint                         # ESLint
node scripts/importar-catalogo.mjs   # one-time import of TSV catalog (~500 products) to Firestore
```

### Cloud Functions (`functions/`)

No `lint`/`test`/`build` scripts exist in `functions/package.json`. Validate changes before deploying:

```bash
cd functions
node --check src/path/to/file.js                                       # syntax check a changed file
node -e "import('./index.js').then(()=>console.log('OK'))"              # verify the module graph loads
firebase deploy --only functions:telegramWebhook                        # deploy (only exported function)
```

On Windows, `npm`/`firebase` subprocesses sometimes fail to resolve `node` even when it's on the interactive shell's PATH — prefix commands with `C:\Program Files\nodejs` (PowerShell) or `/c/Program Files/nodejs` (Git Bash) if that happens.

## Environment

Requires a `.env` at the root with Firebase credentials:

```
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
```

In CI/CD (`.github/workflows/deploy.yml`), these are injected from GitHub repository secrets on every push to `main`.

`functions/` uses two Firebase secrets instead (`defineSecret` in `telegramWebhook.js`), provisioned via `firebase functions:secrets:set TELEGRAM_BOT_TOKEN` / `TELEGRAM_WEBHOOK_SECRET`. Values set via the Firebase CLI on Windows can pick up a trailing `\r\n` or BOM; the code strips this at read time via a `limpar()` helper — keep that in mind if secrets ever appear invalid despite being set correctly.

## Architecture — Frontend

### Entry point & routing

`src/App.jsx` is the central coordinator: Firebase auth state, active list selection, URL param `?lista=<id>` for shared list joining, and routing between `Login` and `Home` screens. There is no router library and no global state — everything flows via props.

`src/hooks/useBackStack.js` fakes Android/browser back-button navigation for this router-less SPA: it pushes a single collapsed `history.pushState` entry per "screen," and `pushBack(fn)` registers a closure that reverses the current UI transition (e.g. closing a modal) when the user presses back. Used throughout `Home.jsx` for modals, detail views, and the recipes sub-navigation.

### Real-time data hooks

All Firestore reads use `onSnapshot` listeners inside custom hooks:

- `src/hooks/useLista.js` — items in the active list (`listas/{listaId}/lista/`). Exposes `adicionarItem`, `toggleComprado`, `removerItem`.
- `src/hooks/useCatalogo.js` — global product catalog (`catalogo/`), auto-sorted pt-BR.
- `src/hooks/useSugestoes.js` — product suggestions + one-admin approval flow. Exposes `aprovar`, `rejeitar`, `atualizar`, `deletar`.
- `src/hooks/useReceitas.js` — recipes (`receitas/`) with a similar approval flow. Exposes `receitas`, `aprovadas`, `pendentes`, `sugerir`, `aprovar`, `rejeitar`, `atualizar`, `deletar`. `sugerir()` auto-approves unless an ingredient references an uncatalogued product (`nomeTemp`), in which case it goes to `pendente`.
- `src/hooks/useGrupoSubstituicao.js` — named sets of interchangeable products (e.g. "leite" grouping whole/skim/lactose-free), stored in `grupoSubstituicao/`. Exposes `buscar(termo)` and `criar(nome)` (dedupes before creating).
- `src/hooks/useTelegramVinculo.js` — watches `usuarios/{uid}.telegramChatId` to reflect Telegram account linking in real time. Exposes `vinculado`, `gerarCodigo()`, `desvincular()`.
- `src/hooks/useTema.js` — light/dark/system theme; persists to localStorage and injects CSS variables on `document.root`.

### Firestore schema

```js
catalogo/{produtoId}
  ├── nome, categoria, subcategoria, grupoSubstituicao[], receitas[]
  └── historico[]         # price records: mercado, preco, data, observacao, listaAtiva

listas/{listaId}          # listaId == uid of the list owner
  ├── criadaPor, participantes[]
  └── lista/{itemId}      # subcollection: items on this list
      ├── produtoId        # referência ao catalogo/{produtoId}
      └── comprado, compradoEm, adicionadoEm
      # nome, categoria, subcategoria, grupoSubstituicao são lidos do catálogo em tempo de renderização via produtoId

usuarios/{uid}
  ├── nome, email, listaAtiva
  ├── listas[]            # array of listaIds the user belongs to
  └── telegramChatId       # set once the Telegram bot is linked (see Telegram bot section)

sugestoes/{sugestaoId}
  ├── nome, categoria, subcategoria, sugeridoPor, listaAtiva
  ├── status: 'pendente' → 'aprovado'
  └── aprovadores[]       # uid of the admin who approved

receitas/{receitaId}
  ├── nome, foto, tempoPreparo, porcoes, dificuldade
  ├── ingredientes[]      # each: produtoId OR grupoSubstituicaoId OR nomeTemp, + nome, quantidade, unidade, observacao
  ├── passos[]
  ├── status: 'pendente' | 'aprovada' | 'rejeitada'
  └── criadaPor/criadaEm, aprovadoPor/aprovadoEm, rejeitadoPor/rejeitadoEm  # single admin uid, not an array

grupoSubstituicao/{grupoId}
  └── nome, nomeNorm (accent/case-normalized), criadoEm

codigosVinculo/{codigo}   # 6-digit code generated in-app to link a Telegram chat, 10-min expiry
telegramVinculos/{chatId} # ativo boolean, set by desvincularTelegram

lotesNotaFiscal/{loteId}       # in-progress receipt batch (bot-only, see Telegram bot section)
filaRevisaoNotas/{itemId}      # global queue of unmatched receipt items awaiting review (bot-only)
```

### Firestore operations outside hooks

`src/config/lista.js` contains non-realtime list operations (create, join, switch active list, leave) used by `Menu.jsx` and `App.jsx`.

`src/config/telegram.js` contains the app-side half of Telegram account linking: `gerarCodigoVinculo(usuario)` creates the 6-digit code doc; `desvincularTelegram(usuario, chatId)` clears the link on both `usuarios/{uid}` and `telegramVinculos/{chatId}`.

### Pages

- `src/pages/Home.jsx` — main screen after login. **Three-tab** bottom nav (`lista` / `catalogo` / `receitas`), search, category filter (`FiltroCategoria`), product detail modal (`DetalhesProduto`), admin suggestions panel, and `Menu` bottom sheet. The recipes tab has its own internal sub-navigation (`telaReceita`: lista/detalhe/texto/formulario) driven by `useBackStack`.
- `src/pages/Login.jsx` — Google sign-in via `signInWithPopup`.
- `src/pages/Catalogo.jsx` — stub/unused.

### Key components

- `Menu.jsx` — bottom-sheet with profile, theme toggle, list management (share/switch/leave), suggestion form, Telegram account linking, admin access, and sign-out.
- `ProdutoItem.jsx` — single product card. Behavior differs by `contexto` prop: `'lista'` toggles `comprado`; `'catalogo'` adds/removes from active list.
- `CategoriaGrupo.jsx` — collapsible category section; auto-expands when `busca` is non-empty.
- `DetalhesProduto.jsx` — product detail modal with price history, price registration form (list context only, blocks duplicate mercado+data registration), and admin attribute/name/category editing.
- `FiltroCategoria.jsx` — multi-select category filter modal with optional `botoesExtras` slot.
- `AdminPanel.jsx` — toggle for admin edit mode.
- `receitas/ReceitaLista.jsx`, `ReceitaDetalhe.jsx`, `ReceitaFormulario.jsx`, `ReceitaTexto.jsx` — recipe browsing, detail (ingredient checklist with substitution-group support, "add missing to list"), creation/edit form, and a paste-to-parse screen (`src/utils/parseReceita.js` pre-fills the form from free text).

### Design tokens & styling

All components use **inline styles only** — no CSS modules, no Tailwind. Constants come from:

- `src/utils/estilos.js` — `FONTE`, `RAIO`, `COR`, `TIPOGRAFIA`, `BOTAO_PRIMARIO`, `BOTAO_SECUNDARIO`
- `src/utils/categorias.js` — `COR_CATEGORIA` (19 categories with hex colors), `ORDEM_CATEGORIAS`, `corDaCategoria()`, `textoParaCor()`
- `src/index.css` — CSS custom properties (`--text`, `--bg`, `--card`, `--amarelo`, `--laranja`, `--verde`, etc.); dark mode overrides these at runtime via `useTema`.

### Admins

Defined by email in `src/config/admins.js` (`isAdmin(email)` helper). One admin approval is enough for a suggestion to enter the catalog.

### Key behaviors

- **List sharing**: `?lista=<id>` adds that list to the user's `listas[]` after an in-app confirmation.
- **Offline**: Firestore SDK caches locally; the Service Worker (via `vite-plugin-pwa`, `registerType: 'autoUpdate'`) caches assets. Writes made offline are queued and synced on reconnect.
- **Base path**: `vite.config.js` sets `base: '/quequefalta/'` — required for GitHub Pages and the PWA manifest's `start_url`.

## Architecture — Telegram bot (`functions/`)

Single Cloud Function `telegramWebhook` (`functions/src/telegramWebhook.js`, region `southamerica-east1`) receives Telegram updates via webhook, validates the `X-Telegram-Bot-Api-Secret-Token` header, and **always** responds `200 ok` at the end regardless of outcome — a past bug had an early `return` inside the handler's `try/catch` skip that response and hang the connection until Cloud Run's 60s timeout, so any change to the routing logic must preserve that invariant (business logic lives in a separate `processarUpdate()` so no code path can bypass the final `res.send`).

### Directory layout

- `comandos/` — Telegram command handlers: `callback.js` (inline-button callback router, largest file), `vincular.js` (`/vincular <code>`), `tabela.js` (handles a pasted price table), `revisar.js` (item-by-item review mechanic, shared by the global queue and the batch flow), `etapasLote.js` (renders the 4 fixed steps of a batch), `resumoLote.js` (line/button text formatting shared across steps).
- `firestore/` — data-access helpers: `vinculos.js` (chatId↔uid links), `lotes.js` (`lotesNotaFiscal` CRUD), `revisao.js` (`filaRevisaoNotas` CRUD), `historico.js` (`registrarPreco`, `produtoJaTemRegistro` duplicate check), `sugestoes.js` (`criarSugestaoDeProduto`, dedupes against pending suggestions by normalized name).
- `matching/fuzzyMatch.js` — fuzzy-matches a parsed item name against the catalog (token-based scoring, excludes function words like "de/do/da", weighted substring matching). Two thresholds: auto-match vs. suggestion.
- `parser/tabela.js` — parses pasted table text (mercado+date header line, then tab/space-delimited item rows) into structured `{ mercado, data, itens[] }`.
- `telegram/` — Bot API client layer: `api.js` (`criarClienteTelegram`: sendMessage/editMessageText/answerCallbackQuery/getFile), `enviarOuEditar.js` (send-or-edit helper — pass a `messageId` to edit an existing message instead of sending a new one), `teclados.js` (inline keyboard builders; `callback_data` values are kept short — see below).

### Batch confirmation flow (4 fixed steps)

Pasting a table creates a `lotesNotaFiscal` document and walks the user through 4 fixed steps via `etapasLote.js`, navigable freely forward/back (`lote_ant`/`lote_prox` callbacks), each step always shown even when empty:

1. **Resumo** — every item with its match status.
2. **Revisão dos itens com match** — one button per matched item; tapping it removes that match (`lote_rm`), sending it to step 3.
3. **Revisão dos itens sem match** — reuses the same item-by-item mechanic as `/revisar`/`/adiados` (see below), scoped to `lote.itens[]` instead of the global queue.
4. **Finalizar** — preview of how many prices will be recorded vs. sent to the review queue, then `lote_fin` commits.

All button-driven navigation **edits the existing message** (via `enviarOuEditar` + `messageId`) instead of sending a new one, to avoid flooding the chat. One-off confirmations (e.g. "✅ Preço registrado!") are no longer sent as separate messages either — they're passed as a `prefixo` string that gets prepended to the next screen's text in the same edit (`mostrarEtapa`/`mostrarEtapa3`/`mostrarProximoDaMesmaLista` all take an optional trailing `prefixo` arg). The one case that still requires a free-text reply ("✏️ Corrigir nome") necessarily sends the question as a new message (Telegram can't "edit and await a reply"), but once the user answers, `telegramWebhook.js` deletes both the question and the user's answer (`telegram.apagarMensagem`, best-effort) and edits the original screen — so a rename leaves no trace in the chat history, matching every other revision action.

### Duplicate-price protection

Before a batch is created, each matched item is checked against the target product's `historico` for an existing entry with the same `mercado`+`data` (`produtoJaTemRegistro`, `firestore/historico.js`); matches are flagged `jaRegistrado` and shown with a ⚠️ instead of ✅. Advancing past step 2 without manually removing (❌) a flagged item auto-discards it (`statusMatch: "descartado"`) so it's silently skipped at finalize — that's the implicit "yes, this is really a duplicate" confirmation. Clicking ❌ on a flagged item instead routes it into normal step-3 review (it may be a false positive: same mercado/data, different product).

The same check runs again when a product is chosen manually in step 3 or via `/revisar`/`/adiados`; if it would duplicate, the bot offers an explicit "✅ Aceitar (não gravar de novo)" button rather than silently registering — accepting marks the item resolved without writing a new `historico` entry (`revisao.duplicataAceita: true`), which `finalizarLote` and the step-4 preview count both special-case to exclude from "will be recorded."

Every `registrarPreco()` call also takes an optional `nomeNota`, written into the `historico` entry's `observacao` (e.g. `Registrado via Telegram — nota: "Queijo Prato Lanche Frimesa"`) — the catalog product name is often more generic than what's printed on the receipt, so this preserves the exact wording/brand from the note.

### Global review queue (`/revisar`, `/adiados`)

Items with no catalog match that aren't resolved during a batch land in `filaRevisaoNotas` (status `pendente` or `ignorado`) and can be resolved later, independent of the batch that created them. `revisar.js` abstracts the item-by-item mechanic behind a "source" interface (`buscarProximo()`/`contar()`) so the same UI code serves both this global queue and step 3 of the batch flow.

Item-by-item review offers: pick a suggested catalog match, correct the parsed name (free-text reply), suggest it as a brand-new product, or defer it.

**"Suggest new product" timing differs by context.** In the global queue, tapping it creates the `sugestoes` doc immediately (deduped by normalized name against existing pending suggestions). Inside a batch (step 3), it's deferred: the tap only marks `revisao.sugestaoPendente: true` on the lote item (reversible — nothing is written outside the lote yet) and the item drops out of step-3 review. The `sugestoes` doc is only actually created inside `finalizarLote` when the batch is confirmed at step 4, alongside registering the other items' prices. This exists because an accidental tap (e.g. meaning to hit "Corrigir nome") used to leave an orphaned suggestion in Firestore with no easy undo; canceling the whole batch (`/cancelar`) is currently the only way to back out of a pending one before finalizing.

### `callback_data` size constraint

Telegram limits inline-button `callback_data` to 64 bytes. Action names are kept short (`lote_ant`, `rv_res`, `rv_dup`, etc.) and Firestore doc IDs (~20 chars) are the dominant cost — when a callback needs to reference more state than fits, persist it on the Firestore document instead of embedding it in `callback_data` (e.g. `duplicataCandidata` on the item, rather than passing the candidate product ID and origin message ID through the button).
