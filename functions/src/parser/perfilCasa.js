const REGEX_HORARIO = /^([01]\d|2[0-3]):00$/;

// Formato aceito, uma linha por pessoa (Nome: item1; item2; ...), mais duas
// linhas especiais (Observações:/Horário:) em qualquer posição do texto:
//
//   Tathiana: sem lactose; gosta de apimentado
//   Marido: não gosta de peixe
//   Observações: evitar carne vermelha mais de 2x por semana
//   Horário: 20:00
//
// Não diferenciamos restrição de preferência na entrada — cada item da lista
// separada por ";" vira preferência/restrição igualmente; quem lê o texto
// completo é o próprio Gemini, então a distinção estrutural não agrega nada
// ao prompt e só complicaria o parsing.
export function parsearPerfilCasa(texto, perfilAnterior = null) {
  const linhas = texto
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  const pessoas = [];
  let observacoesGerais = perfilAnterior?.observacoesGerais || "";
  let horarioEnvio = perfilAnterior?.horarioEnvio || "20:00";
  const erros = [];

  for (const linha of linhas) {
    const separador = linha.indexOf(":");
    if (separador === -1) continue;

    const chave = linha.slice(0, separador).trim();
    const valor = linha.slice(separador + 1).trim();

    if (/^observa[cç][oõ]es$/i.test(chave)) {
      observacoesGerais = valor;
      continue;
    }

    if (/^hor[aá]rio$/i.test(chave)) {
      if (REGEX_HORARIO.test(valor)) {
        horarioEnvio = valor;
      } else {
        erros.push(`Horário "${valor}" inválido — mantendo o horário anterior (${horarioEnvio}). Use o formato HH:00, ex: 20:00.`);
      }
      continue;
    }

    if (!chave || !valor) continue;

    const itens = valor
      .split(";")
      .map((i) => i.trim())
      .filter(Boolean);

    pessoas.push({ nome: chave, restricoes: itens, preferencias: [] });
  }

  return { pessoas, observacoesGerais, horarioEnvio, erros };
}

export function formatarPerfilCasa(perfil) {
  if (!perfil?.pessoas?.length) {
    return "Nenhum perfil configurado ainda. Mande /casa seguido do perfil, por exemplo:\n\n/casa\nTathiana: sem lactose; gosta de apimentado\nMarido: não gosta de peixe\nObservações: evitar carne vermelha mais de 2x por semana\nHorário: 20:00";
  }

  const linhasPessoas = perfil.pessoas
    .map((p) => `${p.nome}: ${[...(p.restricoes || []), ...(p.preferencias || [])].join("; ") || "sem observações"}`)
    .join("\n");

  return [
    "Perfil da casa:",
    linhasPessoas,
    perfil.observacoesGerais ? `Observações: ${perfil.observacoesGerais}` : null,
    `Horário de envio: ${perfil.horarioEnvio} (aproximado, na hora cheia)`,
  ]
    .filter((linha) => linha !== null)
    .join("\n");
}
