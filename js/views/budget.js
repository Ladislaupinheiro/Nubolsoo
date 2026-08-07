/* =========================================================
   views/budget.js — Vista de Orçamento por categoria.
   ========================================================= */

import { el, qs } from '../core/dom.js';
import { catList, txForMonth } from '../core/finance-selectors.js';
import { formatKz, monthLabel } from '../core/format.js';
import { iconChevronLeft, iconChevronRight } from '../core/icons.js';
import { STATE, UI, loadState } from '../core/state.js';
import { render } from '../router.js';
import { closeSheet, openSheet } from '../ui/sheet.js';
import { showToast } from '../ui/toast.js';

export function renderBudget(main) {
  const wrap = el(`<div class="stack"></div>`);
  wrap.appendChild(el(`
    <div class="row-between card">
      <button class="icon-btn" data-action="budget-month-prev">${iconChevronLeft}</button>
      <strong class="display" style="font-size:15px">${monthLabel(UI.budgetMonth)}</strong>
      <button class="icon-btn" data-action="budget-month-next">${iconChevronRight}</button>
    </div>
  `));

  const monthTx = txForMonth(UI.budgetMonth).filter((t) => t.type === 'expense');
  let totalLimit = 0, totalSpent = 0;

  const listCard = el(`<div class="card glass-card"><p class="section-title">Orçamento por categoria</p><div class="stack" id="budgetList"></div></div>`);
  const holder = qs('#budgetList', listCard);

  catList('expense').forEach((cat) => {
    const spent = monthTx.filter((t) => t.category === cat.name).reduce((s, t) => s + t.amount, 0);
    const limit = STATE.budgets[cat.name] || 0;
    totalLimit += limit;
    totalSpent += spent;
    const pct = limit > 0 ? Math.min(100, Math.round((spent / limit) * 100)) : 0;
    const over = limit > 0 && spent > limit;
    holder.appendChild(el(`
      <div class="stack" style="gap:6px">
        <div class="row-between">
          <span style="font-size:13.5px;font-weight:500">${cat.name}</span>
          <span class="mono" style="font-size:12.5px;color:${over ? 'var(--rust)' : 'var(--text-muted)'}">
            ${formatKz(spent)} ${limit > 0 ? `/ ${formatKz(limit)}` : ''}
          </span>
        </div>
        <div class="progress"><div class="progress__fill" style="width:${limit > 0 ? pct : 0}%;background:${over ? 'var(--rust)' : cat.color}"></div></div>
        <button type="button" class="btn btn-sm btn-ghost" style="align-self:flex-start;padding-left:0" data-action="edit-budget" data-cat="${cat.name}">
          ${limit > 0 ? 'Editar limite' : 'Definir limite'}
        </button>
      </div>
    `));
  });
  wrap.appendChild(listCard);

  wrap.appendChild(el(`
    <div class="grid-2">
      <div class="stat glass-stat"><div class="label">Orçado no mês</div><div class="value">${formatKz(totalLimit)}</div></div>
      <div class="stat glass-stat"><div class="label">Gasto no mês</div><div class="value ${totalSpent > totalLimit && totalLimit > 0 ? 'neg' : ''}">${formatKz(totalSpent)}</div></div>
    </div>
  `));

  main.appendChild(wrap);
}

export function openBudgetEditSheet(category) {
  const current = STATE.budgets[category] || '';
  const body = el(`
    <form class="stack" id="budgetForm">
      <div class="field">
        <label>Limite mensal para "${category}" (Kz)</label>
        <input class="glass-input" type="number" inputmode="decimal" step="0.01" min="0" name="limit" value="${current}" placeholder="0,00" autofocus>
      </div>
      <button type="submit" class="btn btn-accent btn-block">Guardar limite</button>
    </form>
  `);
  body.addEventListener('submit', async (e) => {
    e.preventDefault();
    const val = parseFloat(e.target.limit.value) || 0;
    await DB.put('budgets', { category, limit: val });
    await loadState();
    closeSheet();
    render();
    showToast('Orçamento atualizado');
  });
  openSheet(`Definir limite`, body);
}
