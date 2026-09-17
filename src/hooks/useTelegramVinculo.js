import { useEffect, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "../config/firebase";
import { gerarCodigoVinculo, desvincularTelegram } from "../config/telegram";

export function useTelegramVinculo(usuario) {
  const [telegramChatId, setTelegramChatId] = useState(null);

  useEffect(() => {
    if (!usuario) return;
    const ref = doc(db, "usuarios", usuario.uid);
    const unsub = onSnapshot(ref, (snap) => {
      setTelegramChatId(snap.data()?.telegramChatId || null);
    });
    return () => unsub();
  }, [usuario]);

  const gerarCodigo = () => gerarCodigoVinculo(usuario);
  const desvincular = () => desvincularTelegram(usuario, telegramChatId);

  return {
    vinculado: !!telegramChatId,
    telegramChatId,
    gerarCodigo,
    desvincular,
  };
}
