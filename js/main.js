/* =========================================================
   main.js — Ponto de entrada da app. Único módulo carregado
   diretamente pelo index.html. Responsável apenas por arrancar
   a aplicação: liga tudo o resto (router, ações, vistas) e não
   contém lógica de domínio própria.
   ========================================================= */

import { applyTheme, getStoredThemePref } from './core/theme.js';
import { loadState, STATE } from './core/state.js';
import { render, routeFromHash } from './router.js';
import { renderTopbar } from './views/topbar.js';
import { openTransactionSheet } from './views/transactions.js';
import { openGoalSheet } from './views/goals.js';
import { showLockScreen } from './views/security-sheet.js';
import { showUpdateBanner } from './app-update.js';

// Liga a delegação de eventos (data-action) assim que a app arranca.
import './actions.js';

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  window.deferredInstallPrompt = e;
});

window.addEventListener('hashchange', () => { routeFromHash(); render(); });

(async function init() {
  applyTheme(getStoredThemePref());
  if (window.matchMedia) {
    window.matchMedia('(prefers-color-scheme: light)').addEventListener('change', () => {
      if (getStoredThemePref() === 'system') { applyTheme('system'); renderTopbar(); }
    });
  }

  routeFromHash();
  await loadState();
  render();

  // App Shortcuts (long-press no ícone) chegam com ?action=... na URL
  const shortcutAction = new URLSearchParams(location.search).get('action');
  if (shortcutAction === 'new-tx') openTransactionSheet();
  if (shortcutAction === 'new-goal') openGoalSheet();
  if (shortcutAction) {
    history.replaceState(null, '', location.pathname + location.hash);
  }

  if (STATE.security && STATE.security.pinHash) {
    showLockScreen();
  }

  if ('serviceWorker' in navigator) {
    try {
      const reg = await navigator.serviceWorker.register('./sw.js');

      // Já existe um SW novo à espera (ex: separador ficou aberto durante a atualização)
      if (reg.waiting && navigator.serviceWorker.controller) {
        showUpdateBanner(reg.waiting);
      }

      // Deteta quando um novo SW termina de instalar
      reg.addEventListener('updatefound', () => {
        const newWorker = reg.installing;
        if (!newWorker) return;
        newWorker.addEventListener('statechange', () => {
          // 'controller' só existe se já havia um SW ativo antes,
          // ou seja: isto é uma atualização, não a primeira instalação.
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            showUpdateBanner(newWorker);
          }
        });
      });

      // Verifica periodicamente se há uma nova versão publicada
      setInterval(() => reg.update().catch(() => {}), 60 * 60 * 1000);

      // Quando o novo SW assume o controlo, recarrega a página uma única vez
      let refreshing = false;
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (refreshing) return;
        refreshing = true;
        window.location.reload();
      });
    } catch (err) {
      console.warn('SW falhou:', err);
    }
  }
})();
