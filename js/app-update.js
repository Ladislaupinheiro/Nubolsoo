/* =========================================================
   app-update.js — Aviso de nova versão disponível e aplicação da atualização do service worker.
   ========================================================= */

import { el, qs } from './core/dom.js';

let waitingWorker = null;

export function showUpdateBanner(worker) {
  waitingWorker = worker;
  if (qs('#updateBanner')) return; // já visível
  const banner = el(`
    <div class="update-banner" id="updateBanner">
      <div class="update-banner__text">
        <strong class="display">Nova atualização disponível</strong>
        <span>Reinicie para obter as últimas melhorias.</span>
      </div>
      <div class="update-banner__actions">
        <button class="btn btn-ghost btn-sm" data-action="update-later">Depois</button>
        <button class="btn btn-accent btn-sm" data-action="update-now">Atualizar</button>
      </div>
    </div>
  `);
  document.body.appendChild(banner);
}

export function hideUpdateBanner() {
  const b = qs('#updateBanner');
  if (b) b.remove();
}

/** Aplica a atualização em espera do service worker (chamado pela ação "update-now"). */
export function applyPendingUpdate() {
  if (waitingWorker) waitingWorker.postMessage({ type: 'SKIP_WAITING' });
}
