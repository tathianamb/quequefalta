# Modelo do `/nota` (bot do Telegram)

O comando `/nota` registra no catálogo os preços de uma compra. Mande tudo **numa mensagem só**: o comando, o cabeçalho e um item por linha.

```
/nota
Mercado: Max
Data: 21/11/2026
Total: 77,23
item; qtd; un; unit; desc; pago; marca; tam
INSET RAID MAT B 6UN; 1; un; 27,59; 0; 27,59; Raid; 6 un
ENERG BALY 473ML; 2; un; 5,99; 1,20; 10,78; Baly; 473 ml
FILEZINHO AURORA KG; 1,946; kg; 19,97; ; 38,86; Aurora;
```

## Cabeçalho

Cada linha do cabeçalho tem a forma `Chave: valor`. A ordem não importa, nem maiúsculas e minúsculas.

| Chave | Obrigatória | Formato |
|---|---|---|
| `Mercado` | sim | Nome como você quer ver no app (ex.: `Max`, `Atacadão`). Use sempre o mesmo nome para o mesmo mercado. |
| `Data` | sim | `dd/mm/aaaa` (também aceita `dd/mm/aa` e `aaaa-mm-dd`). |
| `Total` | não, mas recomendado | Valor total pago na nota. Serve para conferir a transcrição. |

## Itens

Cada item vai numa linha, com os campos separados por `;`. Também vale tab, que é o que sai ao colar do Google Sheets ou do Excel. Os espaços em volta dos campos são ignorados. A linha de títulos (`item; qtd; un; unit; desc; pago; marca; tam`) é opcional, e as duas últimas colunas também.

| Campo | Obrigatório | O que é |
|---|---|---|
| `item` | sim | Nome como está na nota. O bot procura o produto no catálogo e lembra as correções que você já fez. |
| `qtd` | sim | Quantidade (`2`) ou peso em kg (`1,946`). |
| `un` | sim | `kg` ou `un`. Qualquer outra sigla (`FR`, `CX`, `PCT`…) conta como `un`. |
| `unit` | sim, ou `pago` | Preço unitário de tabela (por unidade ou por kg). Se ficar vazio, é calculado como (pago + desc) ÷ qtd. |
| `desc` | não | Desconto do item, em reais. Vazio = 0. |
| `pago` | não | Valor pago pelo item. Se ficar vazio, é calculado como qtd × unit − desc. |
| `marca` | não | Marca do produto (`Baly`, `Dona Benta`). `-` quer dizer sem marca. Vazio: o bot usa a que já aprendeu para aquele nome de nota ou reconhece no nome uma marca já conhecida. |
| `tam` | não | Tamanho da embalagem: `473 ml`, `1,5 L`, `500 g`, `1 kg`, `12 un`, `6x200ml`, `30 m`. Vazio: o bot tira do nome (`473ML`) ou da memória. Item a peso (`kg`) não tem tamanho, porque o preço já é por kg. |

Números usam vírgula decimal (`19,97`). Ponto decimal também é aceito (`19.97`). Se o mesmo item aparecer em duas linhas, quantidade, desconto e valor pago são somados.

## O que o bot faz com isso

- **Conferência:** se você informou `Total`, o resumo avisa quando a soma dos itens difere do total da nota em mais de R$ 0,05 (`⚠️ Soma dos itens R$ X ≠ total da nota R$ Y`). Também lista as linhas que o bot não conseguiu ler.
- **Preço gravado:** o histórico guarda o preço unitário de tabela, a quantidade, a unidade, a marca e o tamanho. Quando o item teve desconto, guarda também o preço efetivo (pago ÷ qtd). O "onde comprar" do app usa o preço de tabela e compara por kg ou litro quando sabe o tamanho.
- **Marca e tamanho:** o resumo mostra o que o bot entendeu (`· Baly · 473 ml`). Para corrigir ou completar, toque em **🏷️ Marca e tamanho** e responda com uma linha por item: `número; marca; tamanho` (ex.: `3; Baly; 473 ml`, ou `5 -` para sem marca). O bot guarda a correção para a próxima nota com o mesmo nome.
- **Mercado:** nomes da mesma loja são unificados (`Max Muffato` e `Max atacadista` viram `Max`; `Casa Avenida` vira `Avenida`).
- **Tem em casa:** em nota dos últimos 7 dias, os produtos vão para "tem em casa" e a ida entra no planejado × comprado (o que veio da lista, o que veio fora dela e o que ficou na lista).

## Formato antigo

O formato antigo continua aceito, mas não registra total nem desconto. Nele, a primeira linha traz o mercado e a data (`Max 21/11/2026`), e cada linha seguinte traz `nome qtd UN unit total` separados por espaço.
