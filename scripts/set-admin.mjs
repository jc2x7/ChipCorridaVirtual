/**
 * Script para promover um usuário a admin no Firestore.
 * Uso: node scripts/set-admin.mjs
 */

const API_KEY = 'AIzaSyAfs86ugcTTOIrvxmWJ2vGR_X_MOnfgVr4';
const PROJECT_ID = 'consultoriaexelencia';
const EMAIL = 'juliolemosdf@gmail.com';
const UID = 'L7klQSLkFGSGY0O3KlCWl2RkMOc2';

import { createInterface } from 'readline';

const rl = createInterface({ input: process.stdin, output: process.stdout });
const ask = (q) => new Promise((res) => rl.question(q, res));

async function main() {
  const password = await ask('Senha do ' + EMAIL + ': ');
  rl.close();

  // 1. Autenticar via Firebase Auth REST API
  const authRes = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: EMAIL, password, returnSecureToken: true }),
    }
  );
  const authData = await authRes.json();
  if (!authRes.ok) {
    console.error('Erro ao autenticar:', authData.error?.message);
    process.exit(1);
  }
  const idToken = authData.idToken;
  console.log('Autenticado com sucesso.');

  // 2. Atualizar isAdmin = true via Firestore REST API
  const firestoreUrl =
    `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/users/${UID}` +
    `?updateMask.fieldPaths=isAdmin`;

  const updateRes = await fetch(firestoreUrl, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify({
      fields: {
        isAdmin: { booleanValue: true },
      },
    }),
  });

  if (!updateRes.ok) {
    const err = await updateRes.json();
    console.error('Erro ao atualizar Firestore:', err.error?.message);
    process.exit(1);
  }

  console.log('Sucesso! juliolemosdf@gmail.com agora é admin.');
}

main().catch(console.error);
