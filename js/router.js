/* =========================================================
   router.js — Router baseado no hash da URL: decide o separador ativo e orquestra a renderização de cada vista.
   ========================================================= */

import { qs } from './core/dom.js';
import { UI } from './core/state.js';
import { renderBI } from './views/bi.js';
import { renderBills } from './views/bills.js';
import { renderBudget } from './views/budget.js';
import { renderDashboard } from './views/dashboard.js';
import { renderDebts } from './views/debts.js';
import { renderGoals } from './views/goals.js';
import { renderInvestments } from './views/investments.js';
import { renderBottomNav, renderSidebar } from './views/nav.js';
import { renderTopbar } from './views/topbar.js';
import { renderTransactions } from './views/transactions.js';

export function render() {
  renderTopbar();
  renderBottomNav();
  renderSidebar();
  const main = qs('#main');
  main.innerHTML = '';
  const fab = qs('#fab');
  fab.hidden = false;

  switch (UI.tab) {
    case 'dashboard': renderDashboard(main); fab.dataset.action = 'open-tx-sheet'; fab.title = 'Novo lançamento'; break;
    case 'transacoes': renderTransactions(main); fab.dataset.action = 'open-tx-sheet'; fab.title = 'Novo lançamento'; break;
    case 'orcamento': renderBudget(main); fab.hidden = true; break;
    case 'metas': renderGoals(main); fab.dataset.action = 'open-goal-sheet'; fab.title = 'Nova meta'; break;
    case 'contas': renderBills(main); fab.dataset.action = 'open-bill-sheet'; fab.title = 'Nova conta'; break;
    case 'dividas': renderDebts(main); fab.dataset.action = 'open-debt-sheet'; fab.title = 'Novo kilape'; break;
    case 'investimentos': renderInvestments(main); fab.dataset.action = 'open-investment-sheet'; fab.title = 'Novo ativo'; break;
    case 'bi': renderBI(main); fab.hidden = true; break;
    default: renderDashboard(main); fab.dataset.action = 'open-tx-sheet';
  }
}

export function routeFromHash() {
  const h = location.hash.replace('#/', '');
  if (h === 'relatorios') { UI.tab = 'bi'; return; } // alias antigo — Relatórios migrou para o BI
  const valid = ['dashboard', 'transacoes', 'orcamento', 'metas', 'contas', 'dividas', 'investimentos', 'bi'];
  UI.tab = valid.includes(h) ? h : 'dashboard';
}
