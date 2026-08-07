/* =========================================================
   actions.js — Delegação de eventos: liga os elementos com
   [data-action] às funções dos módulos de vista e de dados.
   Único módulo com conhecimento de "todas" as vistas — é a
   sua responsabilidade (SRP): interpretar a ação, não executá-la.
   ========================================================= */

import { shiftMonth } from './core/format.js';
import { STATE, UI } from './core/state.js';
import { applyPendingUpdate, hideUpdateBanner } from './app-update.js';
import { exportData, importDataFromFile, wipeAllData } from './data-io.js';
import { render } from './router.js';
import { closeSheet } from './ui/sheet.js';
import { showToast } from './ui/toast.js';
import { qs } from './core/dom.js';
import { setThemePref } from './core/theme.js';
import { openThemeSheet } from './views/theme-sheet.js';
import { openProfileSheet } from './views/profile.js';
import { openCategoriesSheet, openCategorySheet } from './views/categories.js';
import { openSecuritySheet, openPinFormSheet } from './views/security-sheet.js';
import { setTab } from './views/nav.js';
import { openTransactionSheet } from './views/transactions.js';
import { openBudgetEditSheet } from './views/budget.js';
import { openGoalSheet } from './views/goals.js';
import { openBillSheet } from './views/bills.js';
import { openDebtSheet, openDebtPaymentSheet } from './views/debts.js';
import { paymentsForDebt, personById, debtsForPerson } from './core/debt-selectors.js';
import { openPeopleSheet, openPersonDetailSheet, openPersonSheet } from './views/people.js';
import { openInvestmentSheet } from './views/investments.js';
import { loadState } from './core/state.js';

document.addEventListener('click', async (e) => {
  const t = e.target.closest('[data-action]');
  if (!t) return;
  const action = t.dataset.action;

  if (action === 'nav') { e.preventDefault(); setTab(t.dataset.tab); return; }
  if (action === 'nav-more') { closeSheet(); UI.tab = t.dataset.tab; location.hash = '#/' + UI.tab; render(); return; }
  if (action === 'close-sheet') { closeSheet(); return; }

  if (action === 'open-tx-sheet') {
    const tx = t.dataset.id ? STATE.transactions.find((x) => x.id === t.dataset.id) : null;
    openTransactionSheet(tx);
    return;
  }
  if (action === 'delete-tx') {
    if (confirm('Eliminar este lançamento?')) {
      await DB.delete('transactions', t.dataset.id);
      await loadState();
      closeSheet();
      render();
      showToast('Lançamento eliminado');
    }
    return;
  }
  if (action === 'tx-month-prev') { UI.txMonth = shiftMonth(UI.txMonth, -1); render(); return; }
  if (action === 'tx-month-next') { UI.txMonth = shiftMonth(UI.txMonth, 1); render(); return; }
  if (action === 'tx-filter-type') { UI.txType = t.dataset.value; render(); return; }

  if (action === 'budget-month-prev') { UI.budgetMonth = shiftMonth(UI.budgetMonth, -1); render(); return; }
  if (action === 'budget-month-next') { UI.budgetMonth = shiftMonth(UI.budgetMonth, 1); render(); return; }
  if (action === 'edit-budget') { openBudgetEditSheet(t.dataset.cat); return; }

  if (action === 'open-goal-sheet') {
    const g = t.dataset.id ? STATE.goals.find((x) => x.id === t.dataset.id) : null;
    openGoalSheet(g);
    return;
  }
  if (action === 'delete-goal') {
    if (confirm('Eliminar esta meta?')) {
      await DB.delete('goals', t.dataset.id);
      await loadState();
      closeSheet();
      render();
      showToast('Meta eliminada');
    }
    return;
  }

  if (action === 'open-bill-sheet') {
    const b = t.dataset.id ? STATE.bills.find((x) => x.id === t.dataset.id) : null;
    openBillSheet(b);
    return;
  }
  if (action === 'delete-bill') {
    if (confirm('Eliminar esta conta?')) {
      await DB.delete('bills', t.dataset.id);
      await loadState();
      closeSheet();
      render();
      showToast('Conta eliminada');
    }
    return;
  }
  if (action === 'toggle-bill-paid') {
    const b = STATE.bills.find((x) => x.id === t.dataset.id);
    b.paidMonths = b.paidMonths || [];
    const idx = b.paidMonths.indexOf(UI.billsMonth);
    if (idx >= 0) b.paidMonths.splice(idx, 1); else b.paidMonths.push(UI.billsMonth);
    await DB.put('bills', b);
    await loadState();
    render();
    return;
  }
  if (action === 'bills-month-prev') { UI.billsMonth = shiftMonth(UI.billsMonth, -1); render(); return; }
  if (action === 'bills-month-next') { UI.billsMonth = shiftMonth(UI.billsMonth, 1); render(); return; }

  if (action === 'open-debt-sheet') {
    const d = t.dataset.id ? STATE.debts.find((x) => x.id === t.dataset.id) : null;
    openDebtSheet(d, t.dataset.dir, t.dataset.personId);
    return;
  }
  if (action === 'open-debt-payment-sheet') { openDebtPaymentSheet(t.dataset.id); return; }
  if (action === 'delete-debt') {
    if (confirm('Eliminar este kilape? O histórico de abatimentos também será apagado.')) {
      const payments = paymentsForDebt(t.dataset.id);
      for (const p of payments) await DB.delete('debtPayments', p.id);
      await DB.delete('debts', t.dataset.id);
      await loadState();
      closeSheet();
      render();
      showToast('Kilape eliminado');
    }
    return;
  }

  if (action === 'open-people-sheet') { openPeopleSheet(); return; }
  if (action === 'open-person-detail') { openPersonDetailSheet(t.dataset.id); return; }
  if (action === 'open-person-sheet') {
    const p = t.dataset.id ? personById(t.dataset.id) : null;
    openPersonSheet(p);
    return;
  }
  if (action === 'delete-person') {
    const person = personById(t.dataset.id);
    if (!person) return;
    const linked = debtsForPerson(person);
    if (linked.length) { showToast('Esta pessoa tem kilapes ligados — elimina-os primeiro'); return; }
    if (confirm(`Eliminar ${person.name}?`)) {
      await DB.delete('people', person.id);
      await loadState();
      closeSheet();
      openPeopleSheet();
      showToast('Pessoa eliminada');
    }
    return;
  }

  if (action === 'open-investment-sheet') {
    const i = t.dataset.id ? STATE.investments.find((x) => x.id === t.dataset.id) : null;
    openInvestmentSheet(i);
    return;
  }
  if (action === 'delete-investment') {
    if (confirm('Eliminar este ativo?')) {
      await DB.delete('investments', t.dataset.id);
      await loadState();
      closeSheet();
      render();
      showToast('Ativo eliminado');
    }
    return;
  }

  if (action === 'bi-section') { UI.biSection = t.dataset.value; render(); return; }
  if (action === 'bi-range') { UI.biRangeMonths = parseInt(t.dataset.value, 10); render(); return; }
  if (action === 'bi-proj-range') { UI.biProjMonths = parseInt(t.dataset.value, 10); render(); return; }
  if (action === 'bi-cat-month-prev') { UI.biCatMonth = shiftMonth(UI.biCatMonth, -1); render(); return; }
  if (action === 'bi-cat-month-next') { UI.biCatMonth = shiftMonth(UI.biCatMonth, 1); render(); return; }

  if (action === 'open-categories-sheet') { openCategoriesSheet(); return; }
  if (action === 'open-category-sheet') {
    const cat = t.dataset.id ? STATE.categories.find((c) => c.id === t.dataset.id) : null;
    openCategorySheet(cat, t.dataset.type);
    return;
  }
  if (action === 'delete-category') {
    const inUse = STATE.transactions.some((tx) => tx.category === STATE.categories.find((c) => c.id === t.dataset.id)?.name);
    const msg = inUse
      ? 'Esta categoria já tem lançamentos associados. Eles manterão o nome da categoria, mas ela deixará de aparecer nas listas. Eliminar mesmo assim?'
      : 'Eliminar esta categoria?';
    if (confirm(msg)) {
      await DB.delete('categories', t.dataset.id);
      await loadState();
      closeSheet();
      render();
      showToast('Categoria eliminada');
    }
    return;
  }

  if (action === 'open-security-sheet') { openSecuritySheet(); return; }
  if (action === 'open-pin-form') { openPinFormSheet(t.dataset.mode); return; }

  if (action === 'open-profile-sheet') { openProfileSheet(); return; }
  if (action === 'open-theme-sheet') { openThemeSheet(); return; }
  if (action === 'set-theme') { setThemePref(t.dataset.theme); closeSheet(); return; }

  if (action === 'export-data') { exportData(); return; }
  if (action === 'trigger-import') { qs('#importInput').click(); return; }
  if (action === 'wipe-data') { wipeAllData(); return; }
  if (action === 'install-app') {
    if (window.deferredInstallPrompt) {
      window.deferredInstallPrompt.prompt();
      window.deferredInstallPrompt = null;
      closeSheet();
    }
    return;
  }

  if (action === 'update-now') {
    applyPendingUpdate();
    hideUpdateBanner();
    return;
  }
  if (action === 'update-later') { hideUpdateBanner(); return; }
});

document.addEventListener('change', (e) => {
  if (e.target.id === 'importInput' && e.target.files[0]) {
    importDataFromFile(e.target.files[0]);
  }
});
