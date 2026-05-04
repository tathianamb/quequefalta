# 🛒 QueQueFalta — PWA

![Licença](https://img.shields.io/badge/licença-AGPL%20v3-blue)

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

- Catálogo de produtos padronizado (nome único, categoria, subcategoria)
- Lista de compras gerada automaticamente pelos itens em falta
- Visualização da lista agrupada por categoria
- Checkbox rápido para marcar item como comprado
- Registro de preço e mercado no momento da compra (data automática)
- Histórico de preços por produto e por mercado
- Acesso a qualquer item do catálogo, mesmo os que "tem em casa", para registrar preço
- Adição de novos produtos ao catálogo
- Sincronização em tempo real entre dois usuários (grupo familiar)
- Funcionamento offline para visualização e marcação de itens
- Sincronização automática ao reconectar à internet

### Não Funcionais

- Gratuito para hospedar e manter
- PWA instalável no celular (Android e iOS)
- Interface otimizada para uso mobile
- Segurança na autenticação e acesso aos dados

---

## 🗂️ Estrutura de Dados

### Catálogo (importado da planilha existente)

- **137 produtos** pré-cadastrados
- **13 categorias:** Proteínas, Hortifrúti, Carboidratos Secos, Enlatados e Conservas, Produtos Orientais, Confeitaria, Óleos/Azeites/Vinagres, Temperos e Condimentos, Laticínios, Bebidas, Limpeza, Utensílios de Cozinha, Higiene Pessoal
- **32 subcategorias:** Bovino, Suíno, Aves, Pescados, Frutas, Legumes-fruto, Queijos, Massas, Leguminosas, Lavanderia, entre outras

### Produto

```
produto
├── id
├── nome
├── categoria
├── subcategoria
├── temEmCasa (boolean)
└── historico []
    ├── mercado
    ├── preco
    └── data
```

### Mercados cadastrados (fixos)

- Atacadão
- Max
- Avenida
- Superbom

---

## 🖥️ Telas

### 1. Lista de Compras (tela principal)
- Exibe apenas os itens com `temEmCasa = false`
- Agrupados por categoria
- Checkbox grande e acessível para toque
- Ao marcar como comprado: mini-formulário inline com seleção de mercado (4 opções) + campo de preço — data registrada automaticamente
- Opção de abrir qualquer item do catálogo para registrar preço manualmente

### 2. Catálogo Completo
- Lista todos os produtos
- Busca por nome
- Filtro por categoria e subcategoria
- Acesso ao detalhe de qualquer produto
- Botão para adicionar novo produto

### 3. Detalhe do Produto
- Informações completas do produto
- Histórico de preços por mercado com datas
- Comparativo visual de qual mercado é mais barato
- Edição de categoria e subcategoria

---

## 🔄 Fluxo de Uso

```
Ao longo da semana
  └── Desmarcar itens conforme o estoque acaba (temEmCasa = false)

Na hora de ir ao mercado
  └── Abrir a Lista de Compras
      └── Ver apenas os itens que faltam, agrupados por categoria

Durante a compra
  └── Marcar item como comprado
      └── Informar mercado + preço (data automática)

A qualquer momento
  └── Abrir Catálogo para consultar histórico de preços
      ou registrar preço de item que já tinha em casa
```

---

## 🧱 Stack Tecnológica

| Camada | Tecnologia | Justificativa |
|---|---|---|
| Frontend | React + Vite | Leve, moderno, excelente suporte a PWA |
| PWA | vite-plugin-pwa | Gera Service Worker e manifest automaticamente |
| Hospedagem | GitHub Pages | Gratuito, HTTPS nativo, integração com repositório |
| Banco de dados | Firebase Firestore | Gratuito no plano Spark, tempo real, NoSQL flexível |
| Autenticação | Firebase Auth (Google) | Login com Google, sem senha para gerenciar |
| Sync em tempo real | Firebase Realtime (Firestore) | Atualizações instantâneas entre os dois dispositivos |
| Offline | Service Worker + cache local | Visualização e marcação sem internet |

---

## 🔐 Autenticação e Acesso

- Login com conta Google via Firebase Auth
- Conceito de **grupo familiar**: os dois usuários são vinculados ao mesmo grupo e compartilham o mesmo catálogo e lista
- Dados armazenados no Firestore sob o ID do grupo familiar
- Domínio `usuario.github.io/nome-do-repo` cadastrado como domínio autorizado no Firebase

---

## ⚙️ Observações Técnicas

### GitHub Pages + Vite
O GitHub Pages serve o app em uma subpasta (`/nome-do-repo/`), não na raiz. É necessário configurar o campo `base` no `vite.config.js`:

```js
export default defineConfig({
  base: '/nome-do-repo/',
  plugins: [react(), VitePWA({ ... })]
})
```

### Offline
O Service Worker cacheia os dados do Firestore localmente via IndexedDB. Escritas feitas offline ficam em fila e são sincronizadas automaticamente ao reconectar. O Firestore SDK já oferece suporte nativo a isso.

### Importação do Catálogo
Os 137 produtos da planilha existente serão importados via script de seed para o Firestore, preservando categorias e subcategorias já definidas.

---

## 🚀 Próximos Passos

- [ ] Criar projeto no Firebase e configurar Firestore + Auth
- [ ] Inicializar projeto React + Vite + vite-plugin-pwa
- [ ] Configurar deploy automático no GitHub Pages (GitHub Actions)
- [ ] Implementar autenticação e criação de grupo familiar
- [ ] Implementar tela de Lista de Compras
- [ ] Implementar tela de Catálogo
- [ ] Implementar tela de Detalhe do Produto
- [ ] Criar script de importação do catálogo existente
- [ ] Testes em dispositivos reais (Android e iOS)
- [ ] Ajustes de UX mobile

---

## 💡 Decisões de Projeto

**Por que não Google Sheets como banco?**
Exigiria OAuth completo para leitura/escrita em planilha privada — muito mais complexo de implementar com segurança no frontend. O Firebase resolve autenticação, banco e sync de forma integrada e gratuita.

**Por que não P2P/WebRTC?**
Elegante em teoria, mas celulares não têm IP fixo e público. Ainda precisaria de servidor de sinalização (STUN/TURN), aumentando a complexidade sem benefício prático para o uso doméstico proposto.

**Por que Firebase e não Supabase?**
Ambos são gratuitos e adequados. Firebase foi escolhido por pertencer ao ecossistema Google — já familiar pelo uso de APIs Google — e por ter documentação e comunidade mais consolidadas para PWAs.

**Por que AGPL v3?**
O projeto é pessoal e aberto por necessidade técnica (GitHub Pages requer repositório público), mas com potencial de evolução para um produto comercial. A AGPL v3 permite uso pessoal e estudo livre do código, mas exige que qualquer uso comercial ou distribuição — inclusive via web — mantenha o código aberto. Como autora, a licença pode ser renegociada no futuro para uma versão proprietária ou modelo dual-license.

---

## 📄 Licença

Copyright © 2026 — Distribuído sob a licença [GNU Affero General Public License v3.0](https://www.gnu.org/licenses/agpl-3.0.html).

Uso pessoal e estudo são livres. Uso comercial requer autorização da autora.
