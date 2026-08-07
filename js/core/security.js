/* =========================================================
   core/security.js — Helpers puros de segurança (salt aleatório, hash do PIN). Sem acesso a DOM ou STATE.
   ========================================================= */

/* ----------------------- Segurança (PIN) ----------------------- */
export function randomSalt() {
  return Array.from(crypto.getRandomValues(new Uint8Array(16))).map((b) => b.toString(16).padStart(2, '0')).join('');
}

export async function hashPin(pin, salt) {
  const enc = new TextEncoder().encode(`${salt}:${pin}`);
  const buf = await crypto.subtle.digest('SHA-256', enc);
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('');
}
