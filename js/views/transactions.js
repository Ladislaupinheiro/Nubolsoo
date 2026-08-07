/* =========================================================
   views/transactions.js — Vista de Transações: listagem, filtros e formulário de lançamento.
   ========================================================= */

import { el, escapeHtml, qs, qsa } from '../core/dom.js';
import { catList, txForMonth } from '../core/finance-selectors.js';
import { formatKz, monthLabel, todayISO } from '../core/format.js';
import { iconChevronLeft, iconChevronRight } from '../core/icons.js';
import { UI, loadState } from '../core/state.js';
import { render } from '../router.js';
import { closeSheet, openSheet } from '../ui/sheet.js';
import { showToast } from '../ui/toast.js';
import { catDotHtml } from '../ui/widgets.js';

export function renderTransactions(main) {
  const wrap = el(`<div class="stack"></div>`);

  // seletor de mês
  wrap.appendChild(el(`
    <div class="row-between card">
      <button class="icon-btn" data-action="tx-month-prev">${iconChevronLeft}</button>
      <strong class="display" style="font-size:15px">${monthLabel(UI.txMonth)}</strong>
      <button class="icon-btn" data-action="tx-month-next">${iconChevronRight}</button>
    </div>
  `));

  // filtros
  const filterCard = el(`<div class="card glass-card stack" style="gap:10px">
    <div class="segmented glass-segmented" id="txTypeFilter">
      <button class="${UI.txType === 'all' ? 'active neutral' : ''}" data-action="tx-filter-type" data-value="all">Tudo</button>
      <button class="${UI.txType === 'income' ? 'active income' : ''}" data-action="tx-filter-type" data-value="income">Receitas</button>
      <button class="${UI.txType === 'expense' ? 'active expense' : ''}" data-action="tx-filter-type" data-value="expense">Despesas</button>
    </div>
  </div>`);
  wrap.appendChild(filterCard);

  const list = txForMonth(UI.txMonth).filter((t) => UI.txType === 'all' || t.type === UI.txType);
  const incTotal = list.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const expTotal = list.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0);

  const listCard = el(`<div class="card glass-card"><p class="section-title">Lançamentos <span class="mono">${list.length}</span></p><div id="txList"></div></div>`);
  const holder = qs('#txList', listCard);
  if (!list.length) {
    holder.appendChild(el(`<div class="empty"><p class="display">Nada por aqui</p><p>Toque em + para adicionar um lançamento.</p></div>`));
  } else {
    list.forEach((t) => holder.appendChild(transactionRow(t)));
  }
  wrap.appendChild(listCard);

  wrap.appendChild(el(`
    <div class="grid-2">
      <div class="stat glass-stat"><div class="label">Total receitas</div><div class="value pos">${formatKz(incTotal)}</div></div>
      <div class="stat glass-stat"><div class="label">Total despesas</div><div class="value neg">${formatKz(expTotal)}</div></div>
    </div>
  `));

  main.appendChild(wrap);
}

export function transactionRow(t) {
  const row = el(`
    <div class="list-item" data-action="open-tx-sheet" data-id="${t.id}" style="cursor:pointer">
      ${catDotHtml(t.category, t.type)}
      <div class="list-item__body">
        <div class="list-item__title">${escapeHtml(t.description || t.category)}</div>
        <div class="list-item__sub">${t.category} · ${t.date.split('-').reverse().join('/')}</div>
      </div>
      <div class="list-item__amount ${t.type === 'income' ? 'pos' : 'neg'}">${t.type === 'income' ? '+' : '-'}${formatKz(t.amount)}</div>
    </div>
  `);
  return row;
}

export function openTransactionSheet(existing, forcedType) {
  const type = forcedType || (existing ? existing.type : 'expense');
  const cats = catList(type);
  const body = el(`
    <form class="stack" id="txForm">
      <div class="segmented glass-segmented" id="txTypeSeg">
        <button type="button" class="${type === 'income' ? 'active income' : ''}" data-type="income">Receita</button>
        <button type="button" class="${type === 'expense' ? 'active expense' : ''}" data-type="expense">Despesa</button>
      </div>
      <div class="field">
        <label>Categoria</label>
        <div class="chip-group" id="txCatChips">
          ${cats.map((c) => `<button type="button" class="chip glass-chip ${existing && existing.category === c.name ? 'active' : (!existing && c === cats[0] ? 'active' : '')}" data-cat="${c.name}">${c.name}</button>`).join('')}
        </div>
      </div>
      <div class="field">
        <label>Valor (Kz)</label>
        <input class="glass-input" type="number" inputmode="decimal" step="0.01" min="0" name="amount" placeholder="0,00" value="${existing ? existing.amount : ''}" required>
      </div>
      <div class="field">
        <label>Descrição (opcional)</label>
        <input class="glass-input" type="text" name="description" placeholder="Ex: Almoço, Uber, Salário de Agosto" value="${existing ? escapeHtml(existing.description || '') : ''}">
      </div>
      <div class="field">
        <label>Data</label>
        <input class="glass-input" type="date" name="date" value="${existing ? existing.date : todayISO()}" required>
      </div>
      <button type="submit" class="btn btn-accent btn-block">${existing ? 'Guardar alterações' : 'Adicionar lançamento'}</button>
      ${existing ? `<button type="button" class="btn btn-danger btn-block" data-action="delete-tx" data-id="${existing.id}">Eliminar lançamento</button>` : ''}
    </form>
  `);

  // troca de tipo re-renderiza chips de categoria
  qsa('#txTypeSeg button', body).forEach((btn) => {
    btn.addEventListener('click', () => {
      closeSheet();
      openTransactionSheet(existing, btn.dataset.type);
    });
  });
  qsa('#txCatChips .chip', body).forEach((chip) => {
    chip.addEventListener('click', () => {
      qsa('#txCatChips .chip', body).forEach((c) => c.classList.remove('active'));
      chip.classList.add('active');
    });
  });

  body.addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = e.target;
    const activeChip = qs('#txCatChips .chip.active', body);
    const record = {
      id: existing ? existing.id : DB.uid(),
      type: qs('#txTypeSeg button.active', body).dataset.type,
      category: activeChip ? activeChip.dataset.cat : cats[0].name,
      amount: parseFloat(form.amount.value),
      description: form.description.value.trim(),
      date: form.date.value
    };
    if (!record.amount || record.amount <= 0) { showToast('Informe um valor válido'); return; }
    await DB.put('transactions', record);
    await loadState();
    closeSheet();
    UI.txMonth = record.date.slice(0, 7);
    render();
    showToast(existing ? 'Lançamento atualizado' : 'Lançamento adicionado');
  });

  openSheet(existing ? 'Editar lançamento' : 'Novo lançamento', body);
}
