/* =========================================================
   views/bills.js — Vista de Contas a pagar.
   ========================================================= */

import { el, escapeHtml, qs, qsa } from '../core/dom.js';
import { catList } from '../core/finance-selectors.js';
import { currentMonthKey, formatKz, monthLabel } from '../core/format.js';
import { iconChevronLeft, iconChevronRight } from '../core/icons.js';
import { STATE, UI, loadState } from '../core/state.js';
import { render } from '../router.js';
import { closeSheet, openSheet } from '../ui/sheet.js';
import { showToast } from '../ui/toast.js';
import { catDotHtml } from '../ui/widgets.js';

export function renderBills(main) {
  const wrap = el(`<div class="stack"></div>`);
  wrap.appendChild(el(`
    <div class="row-between card">
      <button class="icon-btn" data-action="bills-month-prev">${iconChevronLeft}</button>
      <strong class="display" style="font-size:15px">${monthLabel(UI.billsMonth)}</strong>
      <button class="icon-btn" data-action="bills-month-next">${iconChevronRight}</button>
    </div>
  `));

  const isCurrentMonth = UI.billsMonth === currentMonthKey();
  const today = new Date().getDate();

  if (!STATE.bills.length) {
    wrap.appendChild(el(`<div class="empty card"><p class="display">Nenhuma conta cadastrada</p><p>Toque em + para adicionar uma conta recorrente.</p></div>`));
  } else {
    const card = el(`<div class="card glass-card"><p class="section-title">Contas do mês</p><div class="stack" id="billsList"></div></div>`);
    const holder = qs('#billsList', card);
    STATE.bills.forEach((b) => {
      const paid = (b.paidMonths || []).includes(UI.billsMonth);
      const overdue = isCurrentMonth && !paid && b.dueDay < today;
      holder.appendChild(el(`
        <div class="list-item">
          ${catDotHtml(b.category || 'Outros', 'expense')}
          <div class="list-item__body" data-action="open-bill-sheet" data-id="${b.id}" style="cursor:pointer">
            <div class="list-item__title">${escapeHtml(b.name)}</div>
            <div class="list-item__sub">Vence dia ${b.dueDay} · <span class="mono">${formatKz(b.amount)}</span></div>
          </div>
          <button class="stamp ${paid ? 'paid' : overdue ? 'overdue' : 'pending'}" style="border-style:solid" data-action="toggle-bill-paid" data-id="${b.id}">
            ${paid ? 'Pago' : overdue ? 'Atrasada' : 'Pendente'}
          </button>
        </div>
      `));
    });
    wrap.appendChild(card);
  }
  main.appendChild(wrap);
}

export function openBillSheet(existing) {
  const body = el(`
    <form class="stack" id="billForm">
      <div class="field"><label>Nome da conta</label><input class="glass-input" type="text" name="name" placeholder="Ex: Renda, Internet, Água" value="${existing ? escapeHtml(existing.name) : ''}" required></div>
      <div class="field"><label>Valor (Kz)</label><input class="glass-input" type="number" step="0.01" min="0" name="amount" value="${existing ? existing.amount : ''}" required></div>
      <div class="field"><label>Dia do vencimento (1-31)</label><input class="glass-input" type="number" min="1" max="31" name="dueDay" value="${existing ? existing.dueDay : ''}" required></div>
      <div class="field">
        <label>Categoria</label>
        <div class="chip-group" id="billCatChips">
          ${catList('expense').map((c) => `<button type="button" class="chip glass-chip ${existing && existing.category === c.name ? 'active' : (!existing && c === catList('expense')[0]) ? 'active' : ''}" data-cat="${c.name}">${c.name}</button>`).join('')}
        </div>
      </div>
      <button type="submit" class="btn btn-accent btn-block">${existing ? 'Guardar alterações' : 'Adicionar conta'}</button>
      ${existing ? `<button type="button" class="btn btn-danger btn-block" data-action="delete-bill" data-id="${existing.id}">Eliminar conta</button>` : ''}
    </form>
  `);
  qsa('#billCatChips .chip', body).forEach((chip) => {
    chip.addEventListener('click', () => {
      qsa('#billCatChips .chip', body).forEach((c) => c.classList.remove('active'));
      chip.classList.add('active');
    });
  });
  body.addEventListener('submit', async (e) => {
    e.preventDefault();
    const f = e.target;
    const activeChip = qs('#billCatChips .chip.active', body);
    const record = {
      id: existing ? existing.id : DB.uid(),
      name: f.name.value.trim(),
      amount: parseFloat(f.amount.value) || 0,
      dueDay: Math.min(31, Math.max(1, parseInt(f.dueDay.value, 10))),
      category: activeChip ? activeChip.dataset.cat : catList('expense')[0].name,
      paidMonths: existing ? existing.paidMonths || [] : []
    };
    await DB.put('bills', record);
    await loadState();
    closeSheet();
    render();
    showToast(existing ? 'Conta atualizada' : 'Conta adicionada');
  });
  openSheet(existing ? 'Editar conta' : 'Nova conta', body);
}
