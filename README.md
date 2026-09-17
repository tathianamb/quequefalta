# 🛒 QueQueFalta — PWA

![Licença](https://img.shields.io/badge/licença-AGPL%20v3-blue)
![Stack](https://img.shields.io/badge/React%2019-Vite-blue)
![Firebase](https://img.shields.io/badge/Firebase-Firestore%20%2B%20Auth-orange)

PWA de lista de compras compartilhada para uso doméstico, desenvolvida para substituir o Google Keep e uma planilha Google com limitações de usabilidade mobile.

---

## 🎯 Motivação

O casal utilizava o Google Keep para gerenciar as compras, mas enfrentava problemas recorrentes:

- **Itens duplicados** com nomes levemente diferentes (ex: "arroz", "Arroz tipo 1", "arroz agrobom")
- **Ausência de categorias** — lista plana sem organização por setor do mercado
- **Sem campos estruturados** — impossível registrar preço, data e mercado de forma consistente

Uma planilha Google foi criada como solução intermediária, com estrutura rica e completa, mas com péssima usabilidade mobile — navegação e edição difíceis, e sem suporte a checkbox interativo na tela do celular.

---

## ✅ Requisitos

### Funcionais

- Catálogo de produtos padronizado (nome, categoria, subcategoria, tags)
- Lista de compras montada a partir dos produtos do catálogo
- Visualização da lista agrupada por categoria
- Checkbox rápido para marcar item como comprado ("tem em casa")
- Registro de preço e mercado a partir do detalhe do produto (data automática), com bloqueio de registro duplicado (mesmo mercado e data)
- Histórico de preços por produto e por mercado, com destaque do **melhor preço**
- Acesso a qualquer item do catálogo para registrar preço, mesmo fora da lista
- Sugestão de novos produtos pelos usuários, com fluxo de aprovação por um administrador
- Receitas: cadastro (inclusive colando um texto para preenchimento automático), lista de ingredientes com checklist do que já está em casa, e atalho para adicionar os que faltam à lista
- Grupos de substituição: agrupar produtos intercambiáveis (ex.: leite integral/desnatado/sem lactose) para uso nas receitas
- Registro de preços pelo Telegram: colar a tabela de uma compra no bot para dar entrada nos preços sem abrir o app
- Múltiplas listas por usuário e **compartilhamento por link**
- Sincronização em tempo real entre os participantes de uma lista
- Tema claro/escuro (com opção de seguir o sistema)
- Funcionamento offline para visualização e marcação de itens (cache do Firestore)

### Não Funcionais

- Gratuito para hospedar e manter
- PWA instalável no celular (Android e iOS)
- Interface otimizada para uso mobile
- Segurança na autenticação e acesso aos dados

---

## 🗂️ Estrutura de Dados

### Catálogo (importado da planilha existente)

- **~500 produtos** pré-cadastrados (fonte: `scripts/Lista_Completa_Supermercado.tsv`)
- **19 categorias:** Proteínas, Hortifrúti, Carboidratos Secos, Padaria, Laticínios, Congelados, Enlatados e Conservas, Mercearia Salgada, Temperos e Condimentos, Óleos/Azeites e Vinagres, Produtos Orientais, Confeitaria e Doces, Bebidas, Limpeza, Utensílios de Cozinha, Higiene Pessoal, Farmácia Básica, Pet Shop, Alimentos para Bebê
- **~60 subcategorias:** Bovino, Aves, Frutas, Legumes, Queijos, Massas, Leguminosas, Água, Alcoólicas, Bebida quente, Refrigerantes, Lavanderia, entre muitas outras

### Coleções no Firestore

```
catalogo (coleção global de produtos)
└── {produtoId}
    ├── nome
    ├── categoria
    ├── subcategoria
    ├── grupoSubstituicao []
    ├── historico []        # preços registrados
    │   ├── mercado
    │   ├── preco
    │   ├── data
    │   └── listaAtiva      # lista de onde o preço foi registrado
    ├── receitas []
    └── criadoEm

listas
└── {listaId}              # o id da lista própria é o uid do usuário
    ├── criadaPor / nomeCriador / criadaEm
    ├── participantes []   # uids com acesso
    └── lista (subcoleção) # itens desta lista
        └── {itemId}
            ├── produtoId / nome / categoria / subcategoria
            ├── comprado (boolean)
            ├── compradoEm
            └── adicionadoEm

usuarios
└── {uid}
    ├── nome / email
    ├── listaAtiva         # lista selecionada no momento
    └── listas []          # todas as listas que o usuário acessa

sugestoes                  # novos produtos propostos
└── {sugestaoId}
    ├── nome / categoria / subcategoria / grupoSubstituicao
    ├── status             # pendente | aprovado | rejeitado
    └── aprovadores []     # uid do admin que aprovou

receitas
└── {receitaId}
    ├── nome / foto / tempoPreparo / porcoes / dificuldade
    ├── ingredientes []    # produtoId OU grupoSubstituicaoId OU nomeTemp (não catalogado) + quantidade/unidade
    ├── passos []
    ├── status             # pendente | aprovada | rejeitada
    └── criadaPor/criadaEm, aprovadoPor/aprovadoEm, rejeitadoPor/rejeitadoEm

grupoSubstituicao          # conjuntos de produtos intercambiáveis (ex.: "leite")
└── {grupoId}
    └── nome / nomeNorm / criadoEm

codigosVinculo             # código de 6 dígitos gerado no app para vincular o Telegram (expira em 10 min)
telegramVinculos           # chatId ↔ conta vinculada

lotesNotaFiscal            # lote de nota fiscal em processamento pelo bot do Telegram
filaRevisaoNotas           # fila global de itens sem match aguardando revisão (bot do Telegram)
```

### Mercados cadastrados (fixos)

- Atacadão
- Max
- Avenida
- Superbom

---

## 🖥️ Telas

A interface usa navegação por **três abas** (barra inferior) e um **menu lateral**.

### 1. Lista de Compras (aba principal)
- Exibe os itens com `comprado = false`, agrupados por categoria
- Itens já comprados ficam numa seção recolhível "Tem em casa"
- Checkbox grande e acessível para toque
- Busca e filtro por categoria
- Atalho para o Catálogo quando o item buscado não está na lista

### 2. Catálogo Completo
- Lista todos os produtos do catálogo, agrupados por categoria
- Busca por nome e filtro por categoria
- Expandir/recolher todas as categorias
- Toque adiciona o produto à lista ativa
- Atalho para **sugerir produto** quando algo não existe no catálogo

### 3. Receitas
- Lista de receitas aprovadas, com foto, tempo de preparo e porções
- Detalhe: checklist de ingredientes (o que já está em casa) e passo a passo, com atalho para adicionar os que faltam à lista
- Cadastro manual ou colando um texto de receita para preenchimento automático
- Ingredientes podem referenciar um produto do catálogo, um grupo de substituição, ou um nome ainda não catalogado (aguarda aprovação)

### 4. Detalhe do Produto (bottom sheet)
- Informações completas do produto
- Registro de preço: seleção de mercado (4 opções) + campo de preço (data automática), com aviso se já houver um preço registrado no mesmo mercado e data
- Destaque do **melhor preço registrado** e em qual mercado
- Histórico de preços com datas

### 5. Menu lateral
- Alternância de tema claro/escuro
- Troca entre listas e **compartilhamento da lista por link** (Web Share API)
- Vínculo com o bot do Telegram (gera um código de 6 dígitos para linkar a conta)
- Acesso ao **Painel de Administração** (apenas admins)

### 6. Painel de Administração (admins)
- Revisão das sugestões de produtos e de receitas
- Aprovação de um administrador já é suficiente para entrar no catálogo
- Edição e remoção de sugestões

---

## 🔄 Fluxo de Uso

```
Ao longo da semana
  └── Marcar itens como "tem em casa" conforme repõe o estoque

Na hora de ir ao mercado
  └── Abrir a Lista de Compras
      └── Ver apenas os itens que faltam, agrupados por categoria

Durante a compra
  └── Abrir o item → informar mercado + preço (data automática)
      ou colar a tabela da compra no bot do Telegram (mercado + itens
      de uma vez), sem precisar abrir o app

A qualquer momento
  └── Abrir o Catálogo para consultar histórico, registrar preço
      ou sugerir um produto novo
  └── Abrir Receitas para ver o que dá pra fazer com o que já tem em casa

Para compartilhar
  └── Menu → compartilhar link da lista → o convidado confirma o acesso
```

---

## 🧱 Stack Tecnológica

| Camada | Tecnologia | Justificativa |
|---|---|---|
| Frontend | React 19 + Vite | Leve, moderno, excelente suporte a PWA |
| Ícones | lucide-react | Conjunto de ícones consistente e leve |
| PWA | vite-plugin-pwa | Gera Service Worker e manifest automaticamente |
| Hospedagem | GitHub Pages | Gratuito, HTTPS nativo, integração com repositório |
| Banco de dados | Firebase Firestore | Gratuito no plano Spark, tempo real, NoSQL flexível |
| Autenticação | Firebase Auth (Google) | Login com Google, sem senha para gerenciar |
| Sync em tempo real | Firestore (`onSnapshot`) | Atualizações instantâneas entre dispositivos |
| Offline | Service Worker + cache local | Visualização e marcação sem internet |
| CI/CD | GitHub Actions | Build e deploy automáticos no push para `main` |
| Bot do Telegram | Firebase Cloud Functions (Node 20) + Telegram Bot API | Registro de preços por texto, sem custo de IA/OCR |
| Assistente de cardápio | Firebase Cloud Functions (agendada) + Gemini API (tier gratuito) | Sugestão diária de cardápio via Telegram, com refinamento por feedback |

---

## 🔐 Autenticação e Acesso

- Login com conta Google via Firebase Auth (`signInWithPopup`)
- Cada usuário tem uma **lista própria** (cujo id é o seu `uid`) criada no primeiro login
- **Compartilhamento por link**: ao abrir um link `?lista=<id>`, o usuário confirma o acesso e passa a participar da lista
- Um usuário pode ter várias listas e alternar entre elas (`listaAtiva`)
- O catálogo e as sugestões são **globais** (compartilhados por todos)
- Administradores definidos em `src/config/admins.js` por e-mail
- Domínio `usuario.github.io/quequefalta` cadastrado como domínio autorizado no Firebase
- O bot do Telegram é vinculado à conta via código de 6 dígitos gerado no Menu (expira em 10 minutos); o chat do Telegram fica associado ao `uid` do usuário

---

## ⚙️ Configuração e Execução

### Pré-requisitos
- Node.js 20+
- Um projeto Firebase com Firestore e Authentication (Google) habilitados

### Variáveis de ambiente
Crie um arquivo `.env` na raiz com as credenciais do Firebase:

```
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
```

### Scripts

```bash
npm install            # instalar dependências
npm run dev            # ambiente de desenvolvimento
npm run build          # build de produção (gera ./dist)
npm run preview        # pré-visualizar o build
npm run lint           # ESLint
```

### Importar o catálogo
Os produtos da planilha (`scripts/Lista_Completa_Supermercado.tsv`) são importados para o Firestore via:

```bash
node scripts/importar-catalogo.mjs
```

### Bot do Telegram (`functions/`)
Codebase separada (Firebase Cloud Functions, Node 20, ESM), sem `lint`/`test`/`build` configurados. Antes de publicar uma mudança:

```bash
cd functions
node --check src/caminho/do/arquivo.js                          # checagem de sintaxe
node -e "import('./index.js').then(()=>console.log('OK'))"      # confirma que os módulos carregam
firebase deploy --only functions:telegramWebhook                # deploy (única função exportada)
```

Depende de dois secrets do Firebase (`TELEGRAM_BOT_TOKEN`, `TELEGRAM_WEBHOOK_SECRET`), provisionados via `firebase functions:secrets:set`.

---

## 🛠️ Estrutura do Projeto

```
src/
├── App.jsx                  # autenticação, listas e roteamento de telas
├── main.jsx
├── config/
│   ├── firebase.js          # inicialização do Firebase
│   ├── lista.js             # criação, entrada e troca de listas
│   ├── admins.js            # e-mails com acesso de admin
│   └── telegram.js          # geração/remoção do código de vínculo do Telegram
├── hooks/
│   ├── useLista.js          # itens da lista ativa (tempo real)
│   ├── useCatalogo.js       # catálogo global (tempo real)
│   ├── useSugestoes.js      # sugestões de produto + aprovação por um admin
│   ├── useReceitas.js       # receitas + aprovação por um admin
│   ├── useGrupoSubstituicao.js  # grupos de produtos intercambiáveis
│   ├── useTelegramVinculo.js    # estado do vínculo com o bot do Telegram
│   ├── useBackStack.js      # navegação por "voltar" sem router
│   └── useTema.js           # tema claro/escuro
├── pages/
│   ├── Login.jsx
│   ├── Home.jsx             # abas Lista, Catálogo e Receitas
│   └── Catalogo.jsx         # stub/não utilizado
├── components/
│   ├── Menu.jsx             # menu lateral, troca/compartilhamento de listas, vínculo Telegram
│   ├── CategoriaGrupo.jsx
│   ├── ProdutoItem.jsx
│   ├── DetalhesProduto.jsx  # preços e histórico
│   ├── FiltroCategoria.jsx
│   ├── AdminPanel.jsx       # revisão de sugestões
│   └── receitas/
│       ├── ReceitaLista.jsx
│       ├── ReceitaDetalhe.jsx
│       ├── ReceitaFormulario.jsx
│       └── ReceitaTexto.jsx # colar texto de receita para preenchimento automático
└── utils/
    ├── categorias.js        # cores e ordem das categorias
    ├── estilos.js           # tokens de tipografia, raio e botões
    └── parseReceita.js      # extrai ingredientes/passos de um texto colado

functions/                    # Cloud Functions do bot do Telegram (codebase separada)
├── index.js                  # exporta telegramWebhook
└── src/
    ├── telegramWebhook.js    # handler HTTP, roteamento dos updates
    ├── comandos/              # handlers de comando e callback
    ├── firestore/             # acesso a lotesNotaFiscal, filaRevisaoNotas etc.
    ├── matching/              # fuzzy match do item da nota contra o catálogo
    ├── parser/                # interpretação da tabela colada
    └── telegram/              # cliente da Bot API e teclados inline
```

---

## ⚙️ Observações Técnicas

### GitHub Pages + Vite
O GitHub Pages serve o app na subpasta `/quequefalta/`. O campo `base` está configurado no `vite.config.js`, assim como o `start_url` do manifest PWA.

### Deploy automático
O workflow `.github/workflows/deploy.yml` faz build e publica em GitHub Pages a cada push na branch `main`, injetando as credenciais do Firebase a partir dos *secrets* do repositório.

### Offline
O Service Worker (gerado pelo `vite-plugin-pwa`, `registerType: 'autoUpdate'`) cacheia os assets, e o Firestore mantém os dados localmente. O SDK enfileira as escritas feitas offline e sincroniza ao reconectar.

### Sugestões de produtos
Quando um usuário sugere um produto, ele entra como `pendente`. Com a aprovação de um admin, o produto é criado no catálogo e a sugestão fica `aprovado`.

### Bot do Telegram
Cloud Function única (`telegramWebhook`), que recebe os updates do Telegram, valida um secret de webhook e sempre responde `200 ok` ao final — evita que a conexão fique pendurada até o timeout do Cloud Run. Ao colar a tabela de uma compra, o bot guia o usuário por 4 etapas fixas (resumo, revisão dos itens com match, revisão dos sem match, finalizar), sempre editando a mesma mensagem em vez de enviar novas. Antes de gravar um preço, verifica se já existe um registro igual (mesmo produto, mercado e data) para não duplicar o histórico.

---

## 💡 Decisões de Projeto

**Por que não Google Sheets como banco?**
Exigiria OAuth completo para leitura/escrita em planilha privada — muito mais complexo de implementar com segurança no frontend. O Firebase resolve autenticação, banco e sync de forma integrada e gratuita.

**Por que não P2P/WebRTC?**
Elegante em teoria, mas celulares não têm IP fixo e público. Ainda precisaria de servidor de sinalização (STUN/TURN), aumentando a complexidade sem benefício prático para o uso doméstico proposto.

**Por que Firebase e não Supabase?**
Ambos são gratuitos e adequados. Firebase foi escolhido por pertencer ao ecossistema Google — já familiar pelo uso de APIs Google — e por ter documentação e comunidade mais consolidadas para PWAs.

**Por que compartilhamento por link em vez de "grupo familiar" fixo?**
O modelo evoluiu de um grupo familiar fixo para listas compartilháveis por link: mais flexível, permite múltiplas listas por usuário e convidar qualquer pessoa, mantendo a lista própria sempre preservada.

**Por que AGPL v3?**
O projeto é pessoal e aberto por necessidade técnica (GitHub Pages requer repositório público), mas com potencial de evolução para um produto comercial. A AGPL v3 permite uso pessoal e estudo livre do código, mas exige que qualquer uso comercial ou distribuição — inclusive via web — mantenha o código aberto. Como autora, a licença pode ser renegociada no futuro para uma versão proprietária ou modelo dual-license.

---

## 📄 Licença

Copyright © 2026 — Distribuído sob a licença [GNU Affero General Public License v3.0](https://www.gnu.org/licenses/agpl-3.0.html).

Uso pessoal e estudo são livres. Uso comercial requer autorização da autora.
