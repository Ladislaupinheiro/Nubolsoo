/* =========================================================
   ui/toast.js — Componente de notificação toast (mensagem breve e temporária).
   ========================================================= */

import { el, escapeHtml, qsa } from '../core/dom.js';

/* ----------------------- Toast ----------------------- */
export let toastTimer = null;

export function showToast(msg) {
  qsa('.toast').forEach((t) => t.remove());
  const t = el(`<div class="toast glass-toast">${escapeHtml(msg)}</div>`);
  document.body.appendChild(t);
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.remove(), 2200);
}
