/* =========================================================
   core/state.js — Estado global da app (STATE dos dados persistidos, UI do estado de interface) e o carregamento inicial a partir do IndexedDB.
   ========================================================= */

import { DEFAULT_EXPENSE_CATS, DEFAULT_INCOME_CATS } from './constants.js';
import { currentMonthKey } from './format.js';

/* ----------------------- Estado global ----------------------- */
export let STATE = { transactions: [], budgets: {}, goals: [], bills: [], investments: [], categories: [], security: null, debts: [], debtPayments: [], people: [], profile: { name: '', photo: null } };

export let UI = {
  tab: 'dashboard',
  txMonth: currentMonthKey(),
  txType: 'all',
  txCategory: 'all',
  budgetMonth: currentMonthKey(),
  billsMonth: currentMonthKey(),
  biSection: 'geral',
  biCatMonth: currentMonthKey(),
  biRangeMonths: 6,
  biProjMonths: 6,
  themePref: 'system',
  themeResolved: 'dark'
};

/* ----------------------- Carregamento inicial ----------------------- */
export async function loadState() {
  const [transactions, budgetsArr, goals, bills, investments, categories, security, debts, debtPayments, people, profile] = await Promise.all([
    DB.getAll('transactions'), DB.getAll('budgets'), DB.getAll('goals'), DB.getAll('bills'), DB.getAll('investments'),
    DB.getAll('categories'), DB.get('settings', 'security'), DB.getAll('debts'), DB.getAll('debtPayments'), DB.getAll('people'),
    DB.get('settings', 'profile')
  ]);
  STATE.transactions = transactions.sort((a, b) => (b.date + b.id).localeCompare(a.date + a.id));
  STATE.budgets = {};
  budgetsArr.forEach((b) => { STATE.budgets[b.category] = b.limit; });
  STATE.goals = goals;
  STATE.bills = bills.sort((a, b) => a.dueDay - b.dueDay);
  STATE.investments = investments;
  STATE.categories = categories;
  STATE.security = security || null;
  STATE.debts = debts.sort((a, b) => (a.dueDate || '9999').localeCompare(b.dueDate || '9999'));
  STATE.debtPayments = debtPayments;
  STATE.people = people.sort((a, b) => a.name.localeCompare(b.name));
  STATE.profile = profile || { name: '', photo: null };

  if (STATE.categories.length === 0) {
    const seeds = [
      ...DEFAULT_EXPENSE_CATS.map((c) => ({ id: DB.uid(), name: c.name, type: 'expense', color: c.color })),
      ...DEFAULT_INCOME_CATS.map((c) => ({ id: DB.uid(), name: c.name, type: 'income', color: c.color }))
    ];
    for (const s of seeds) await DB.put('categories', s);
    STATE.categories = seeds;
  }

  // Migração não-destrutiva: acrescenta as categorias mais realistas (roupas
  // desdobradas, apoio familiar, etc.) a instalações já existentes, sem
  // duplicar e sem mexer nas categorias que o utilizador já personalizou.
  // Corre uma única vez, controlado por uma flag em 'settings'.
  const catMigration = await DB.get('settings', 'catSeedV1');
  if (!catMigration) {
    const existing = new Set(STATE.categories.map((c) => `${c.type}:${c.name.toLowerCase()}`));
    const toAdd = DEFAULT_EXPENSE_CATS.filter((c) => !existing.has(`expense:${c.name.toLowerCase()}`));
    for (const c of toAdd) {
      const rec = { id: DB.uid(), name: c.name, type: 'expense', color: c.color };
      await DB.put('categories', rec);
      STATE.categories.push(rec);
    }
    await DB.put('settings', { key: 'catSeedV1', applied: true });
  }
}
