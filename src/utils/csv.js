function escapar(valor) {
  if (valor == null) return "";
  const s = String(valor);
  return s.includes(",") || s.includes('"') || s.includes("\n")
    ? '"' + s.replace(/"/g, '""') + '"'
    : s;
}

// Baixa um CSV no navegador. O BOM faz o Excel reconhecer o UTF-8.
export function baixarCsv(nomeArquivo, cabecalho, linhas) {
  const conteudo = [cabecalho, ...linhas].map((l) => l.map(escapar).join(",")).join("\n");
  const blob = new Blob(["﻿" + conteudo], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = nomeArquivo;
  a.click();
  URL.revokeObjectURL(url);
}
