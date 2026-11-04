// O Firebase CLI grava secrets via stdin no Windows sempre com \r\n ao final,
// então todo secret lido precisa ser saneado antes de usar.
export const limpar = (valor) => valor.trim();
