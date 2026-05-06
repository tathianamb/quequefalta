import { doc, getDoc, setDoc, updateDoc, arrayUnion } from "firebase/firestore";
import { db } from "./firebase";
import { deleteField } from "firebase/firestore";

export async function sairDoGrupo(usuario) {
  const userRef = doc(db, "usuarios", usuario.uid);
  const userSnap = await getDoc(userRef);
  if (!userSnap.exists()) return;

  const { grupoId } = userSnap.data();

  if (grupoId) {
    const grupoRef = doc(db, "grupos", grupoId);
    const grupoSnap = await getDoc(grupoRef);
    if (grupoSnap.exists()) {
      const membros = grupoSnap
        .data()
        .membros.filter((uid) => uid !== usuario.uid);
      await updateDoc(grupoRef, { membros });
    }
  }

  await updateDoc(userRef, { grupoId: deleteField() });
}

export async function obterOuCriarGrupo(usuario) {
  const userRef = doc(db, "usuarios", usuario.uid);
  const userSnap = await getDoc(userRef);

  if (userSnap.exists()) {
    return userSnap.data().grupoId;
  }

  return null; // primeiro acesso, ainda sem grupo
}

function gerarCodigo() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // sem caracteres ambíguos (0,O,1,I)
  let codigo = "";
  for (let i = 0; i < 6; i++) {
    codigo += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return codigo;
}

export async function criarGrupo(usuario) {
  const grupoId = usuario.uid;
  const grupoRef = doc(db, "grupos", grupoId);
  const userRef = doc(db, "usuarios", usuario.uid);

  // Garante código único
  let codigo = gerarCodigo();
  const { collection, query, where, getDocs } =
    await import("firebase/firestore");
  let tentativas = 0;
  while (tentativas < 10) {
    const q = query(collection(db, "grupos"), where("codigo", "==", codigo));
    const snap = await getDocs(q);
    if (snap.empty) break;
    codigo = gerarCodigo();
    tentativas++;
  }

  await setDoc(grupoRef, {
    criadoEm: new Date(),
    membros: [usuario.uid],
    codigo,
  });

  await setDoc(userRef, {
    nome: usuario.displayName,
    email: usuario.email,
    grupoId,
  });

  return grupoId;
}

export async function entrarNoGrupo(usuario, codigo) {
  const { collection, query, where, getDocs } =
    await import("firebase/firestore");

  // Busca o grupo pelo campo 'codigo'
  const q = query(
    collection(db, "grupos"),
    where("codigo", "==", codigo.toUpperCase()),
  );
  const snap = await getDocs(q);

  if (snap.empty) throw new Error("Código inválido");

  const grupoDoc = snap.docs[0];
  const grupoId = grupoDoc.id;

  await updateDoc(grupoDoc.ref, {
    membros: arrayUnion(usuario.uid),
  });

  await setDoc(doc(db, "usuarios", usuario.uid), {
    nome: usuario.displayName,
    email: usuario.email,
    grupoId,
  });

  return grupoId;
}
