/* =========================================================
   ui/sheet.js — Componente genérico de folha/modal (abrir e fechar).
   ========================================================= */

import { el, qs } from '../core/dom.js';

/* ----------------------- Sheet (modal inferior) ----------------------- */
export function openSheet(titleHtml, bodyEl) {
  closeSheet();
  const overlay = el(`<div class="sheet-overlay glass-modal-overlay" id="sheetOverlay"></div>`);
  const sheet = el(`
    <div class="sheet glass-modal">
      <div class="sheet__handle"></div>
      <h2 class="sheet__title display">${titleHtml}</h2>
      <div class="sheet__body"></div>
    </div>
  `);
  qs('.sheet__body', sheet).appendChild(bodyEl);
  overlay.appendChild(sheet);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) closeSheet(); });
  document.body.appendChild(overlay);
}

export function closeSheet() {
  const o = qs('#sheetOverlay');
  if (o) o.remove();
}
