/* =========================================================
   core/dom.js — Helpers genéricos de DOM (criação de elementos, seletores, escape de HTML).
   ========================================================= */

/* ----------------------- Utilitários ----------------------- */
export function el(html) {
  const d = document.createElement('div');
  d.innerHTML = html.trim();
  return d.firstElementChild;
}

export function qs(sel, ctx) { return (ctx || document).querySelector(sel); }

export function qsa(sel, ctx) { return Array.from((ctx || document).querySelectorAll(sel)); }

export function escapeHtml(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
