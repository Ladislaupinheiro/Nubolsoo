/* =========================================================
   views/debts.js — Vista de Dívidas & Kilapes.
   ========================================================= */

import { debtStatus, paymentsForDebt, personById, personTrustBadge, sortDebtsForList, totalOwedByMe, totalOwedToMe, whatsappReminderUrl } from '../core/debt-selectors.js';
import { el, escapeHtml, qs, qsa } from '../core/dom.js';
import { formatKz, todayISO } from '../core/format.js';
import { iconChevronRight, iconHandshake, iconPlus, iconUsers } from '../core/icons.js';
import { STATE, loadState } from '../core/state.js';
import { render } from '../router.js';
import { closeSheet, openSheet } from '../ui/sheet.js';
import { showToast } from '../ui/toast.js';
import { catDotHtml } from '../ui/widgets.js';
import { openPersonSheet } from './people.js';

export function debtRow(d) {
  const status = debtStatus(d);
  const stampCls = d.settled ? 'paid' : status;
  const stampLabel = d.settled ? 'Pago' : (status === 'overdue' ? 'Atrasado' : 'Em aberto');
  const sub = [];
  if (d.remainingAmount < d.originalAmount && !d.settled) sub.push(`de ${formatKz(d.originalAmount)}`);
  if (d.dueDate) sub.push(d.dueDate.split('-').reverse().join('/'));
  const trust = d.direction === 'a_receber' ? personTrustBadge(d) : null;
  if (trust) {
    const emoji = trust.cls === 'paid' ? '🟢' : trust.cls === 'pending' ? '🟡' : '🔴';
    sub.push(`${emoji} ${trust.label}`);
  }
  return el(`
    <div class="list-item" data-action="open-debt-sheet" data-id="${d.id}" style="cursor:pointer">
      ${catDotHtml(d.person, d.direction === 'devo' ? 'expense' : 'income')}
      <div class="list-item__body">
        <div class="list-item__title">${escapeHtml(d.person)}</div>
        <div class="list-item__sub">${sub.join(' · ') || '&nbsp;'}</div>
      </div>
      <div class="stack" style="align-items:flex-end;gap:4px">
        <div class="list-item__amount">${formatKz(d.remainingAmount)}</div>
        <span class="stamp ${stampCls}" style="transform:none;font-size:9px;padding:1px 7px">${stampLabel}</span>
      </div>
    </div>
  `);
}

export function renderDebts(main) {
  const wrap = el(`<div class="stack"></div>`);
  main.appendChild(wrap);

  wrap.appendChild(el(`
    <div class="grid-2">
      <div class="stat glass-stat"><div class="label">Eu devo</div><div class="value neg">${formatKz(totalOwedByMe())}</div></div>
      <div class="stat glass-stat"><div class="label">Me devem</div><div class="value pos">${formatKz(totalOwedToMe())}</div></div>
    </div>
  `));

  wrap.appendChild(el(`
    <div class="menu-list glass-menu">
      <button type="button" class="menu-row" data-action="open-people-sheet">
        <span class="menu-row__icon">${iconUsers}</span>
        <span class="menu-row__label">Pessoas<span>${STATE.people.length ? `${STATE.people.length} registada(s)` : 'Organizar kilapes por pessoa'}</span></span>
        ${iconChevronRight}
      </button>
    </div>
  `));

  const receberList = sortDebtsForList(STATE.debts.filter((d) => d.direction === 'a_receber'));
  const receberCard = el(`<div class="card glass-card"><p class="section-title">Me devem <span class="mono">${receberList.length}</span></p><div class="stack" id="debtsReceberList"></div></div>`);
  wrap.appendChild(receberCard);
  const receberHolder = qs('#debtsReceberList', receberCard);
  if (!receberList.length) {
    receberHolder.appendChild(el(`<div class="empty"><p class="display">Ninguém te deve nada</p><p>Vendeste a fiado ou emprestaste dinheiro? Toca em + para registar.</p></div>`));
  } else {
    receberList.forEach((d) => receberHolder.appendChild(debtRow(d)));
  }

  const devoList = sortDebtsForList(STATE.debts.filter((d) => d.direction === 'devo'));
  const devoCard = el(`<div class="card glass-card"><p class="section-title">Eu devo <span class="mono">${devoList.length}</span></p><div class="stack" id="debtsDevoList"></div></div>`);
  wrap.appendChild(devoCard);
  const devoHolder = qs('#debtsDevoList', devoCard);
  if (!devoList.length) {
    devoHolder.appendChild(el(`<div class="empty"><p class="display">Não deves nada a ninguém</p><p>Se tens algum kilape em aberto, toca em + para registar.</p></div>`));
  } else {
    devoList.forEach((d) => devoHolder.appendChild(debtRow(d)));
  }
}

export function openDebtSheet(existing, forcedDirection, forcedPersonId) {
  const direction = forcedDirection || (existing ? existing.direction : 'a_receber');
  const hasPayments = existing ? paymentsForDebt(existing.id).length > 0 : false;
  const selectedPersonId = forcedPersonId || (existing ? existing.personId : '') || '';

  const body = el(`
    <div class="stack">
      <form class="stack" id="debtForm">
        <div class="segmented glass-segmented" id="debtDirSeg">
          <button type="button" class="${direction === 'a_receber' ? 'active income' : ''}" data-dir="a_receber">Me devem</button>
          <button type="button" class="${direction === 'devo' ? 'active expense' : ''}" data-dir="devo">Eu devo</button>
        </div>
        <div class="field">
          <label>${direction === 'devo' ? 'A quem devo' : 'Quem me deve'}</label>
          <div class="row" style="gap:8px">
            <select class="glass-select" name="personId" id="debtPersonSelect" style="flex:1" required>
              ${STATE.people.length
                ? (!selectedPersonId ? '<option value="" disabled selected>Selecionar pessoa…</option>' : '')
                : '<option value="" disabled selected>Nenhuma pessoa — toca em +</option>'}
              ${STATE.people.map((p) => `<option value="${p.id}" ${p.id === selectedPersonId ? 'selected' : ''}>${escapeHtml(p.name)}</option>`).join('')}
            </select>
            <button type="button" class="btn icon-btn" id="debtNewPersonBtn" title="Nova pessoa">${iconPlus}</button>
          </div>
          ${existing && !existing.personId ? `<span style="font-size:11px;color:var(--text-dim)">Registo antigo (${escapeHtml(existing.person)}) — associa a uma pessoa para veres o histórico completo.</span>` : ''}
        </div>
        <div class="field">
          <label>Valor${hasPayments ? ' original' : ''} (Kz)</label>
          <input class="glass-input" type="number" inputmode="decimal" step="0.01" min="0.01" name="amount" value="${existing ? existing.originalAmount : ''}" placeholder="0,00" ${hasPayments ? 'readonly' : ''} required>
          ${hasPayments ? `<span style="font-size:11px;color:var(--text-dim)">Já há abatimentos registados — usa "Registar abatimento" para atualizar o valor em falta.</span>` : ''}
        </div>
        <div class="field">
          <label>Data combinada (opcional)</label>
          <input class="glass-input" type="date" name="dueDate" value="${existing && existing.dueDate ? existing.dueDate : ''}">
        </div>
        <div class="field">
          <label>Nota (opcional)</label>
          <textarea class="glass-textarea" name="note" placeholder="Ex: venda a fiado de roupa">${existing && existing.note ? escapeHtml(existing.note) : ''}</textarea>
        </div>
        <button type="submit" class="btn btn-accent btn-block">${existing ? 'Guardar alterações' : 'Registar kilape'}</button>
      </form>
      ${existing ? `
        <hr class="rule">
        <div class="row-between">
          <p class="section-title" style="margin:0">Falta pagar</p>
          <span class="mono" style="font-size:16px;font-weight:700">${formatKz(existing.remainingAmount)}</span>
        </div>
        ${!existing.settled
          ? `<button type="button" class="btn btn-block" data-action="open-debt-payment-sheet" data-id="${existing.id}">Registar abatimento</button>`
          : `<p style="font-size:12.5px;color:var(--emerald);text-align:center;margin:0">✓ Kilape totalmente liquidado</p>`}
        ${direction === 'a_receber' && !existing.settled
          ? `<a class="btn btn-block btn-ghost" href="${whatsappReminderUrl(existing)}" target="_blank" rel="noopener">${iconHandshake} &nbsp; Enviar lembrete no WhatsApp</a>`
          : ''}
        <div class="stack" id="debtPaymentsList"></div>
        <button type="button" class="btn btn-block btn-danger" data-action="delete-debt" data-id="${existing.id}">Eliminar kilape</button>
      ` : ''}
    </div>
  `);

  qsa('#debtDirSeg button', body).forEach((btn) => {
    btn.addEventListener('click', () => {
      if (btn.dataset.dir === direction) return;
      const currentPersonId = qs('#debtPersonSelect', body).value;
      closeSheet();
      openDebtSheet(existing, btn.dataset.dir, currentPersonId);
    });
  });

  qs('#debtNewPersonBtn', body).addEventListener('click', () => {
    const currentDir = qs('#debtDirSeg button.active', body).dataset.dir;
    openPersonSheet(null, (newPerson) => {
      openDebtSheet(existing, currentDir, newPerson.id);
    });
  });

  qs('#debtForm', body).addEventListener('submit', async (e) => {
    e.preventDefault();
    const f = e.target;
    const activeDir = qs('#debtDirSeg button.active', body).dataset.dir;
    const amount = parseFloat(f.amount.value) || 0;
    if (amount <= 0) { showToast('Informa um valor válido'); return; }
    const person = f.personId.value ? personById(f.personId.value) : null;
    if (!person) { showToast('Seleciona (ou cria) uma pessoa'); return; }
    const record = existing ? { ...existing } : { id: DB.uid(), settled: false, settledAt: null, createdAt: todayISO() };
    record.direction = activeDir;
    record.personId = person.id;
    record.person = person.name;
    record.phone = person.phone || '';
    record.dueDate = f.dueDate.value || null;
    record.note = f.note.value.trim();
    if (!hasPayments) {
      record.originalAmount = amount;
      record.remainingAmount = amount;
    }
    await DB.put('debts', record);
    await loadState();
    closeSheet();
    render();
    showToast(existing ? 'Kilape atualizado' : 'Kilape registado');
  });

  if (existing) {
    const payHolder = qs('#debtPaymentsList', body);
    const payments = paymentsForDebt(existing.id);
    if (payments.length) {
      payHolder.appendChild(el(`<p class="section-title" style="margin-top:8px">Histórico de abatimentos</p>`));
      payments.forEach((p) => {
        payHolder.appendChild(el(`
          <div class="list-item">
            <div class="list-item__body">
              <div class="list-item__title">${formatKz(p.amount)}</div>
              <div class="list-item__sub">${p.date.split('-').reverse().join('/')}${p.note ? ' · ' + escapeHtml(p.note) : ''}</div>
            </div>
          </div>
        `));
      });
    }
  }

  openSheet(existing ? 'Editar kilape' : 'Novo kilape', body);
}

export function openDebtPaymentSheet(debtId) {
  const debt = STATE.debts.find((d) => d.id === debtId);
  if (!debt) return;
  const body = el(`
    <form class="stack" id="debtPaymentForm">
      <p style="font-size:12.5px;color:var(--text-dim);margin:0">Falta pagar ${formatKz(debt.remainingAmount)} de ${formatKz(debt.originalAmount)}.</p>
      <div class="field">
        <label>Valor do abatimento (Kz)</label>
        <input class="glass-input" type="number" inputmode="decimal" step="0.01" min="0.01" max="${debt.remainingAmount}" name="amount" value="${debt.remainingAmount}" required autofocus>
      </div>
      <div class="field">
        <label>Data</label>
        <input class="glass-input" type="date" name="date" value="${todayISO()}">
      </div>
      <div class="field">
        <label>Nota (opcional)</label>
        <input class="glass-input" type="text" name="note" placeholder="Ex: pagamento parcial em dinheiro">
      </div>
      <button type="submit" class="btn btn-accent btn-block">Registar abatimento</button>
    </form>
  `);
  body.addEventListener('submit', async (e) => {
    e.preventDefault();
    const f = e.target;
    let amount = parseFloat(f.amount.value) || 0;
    if (amount <= 0) { showToast('Informa um valor válido'); return; }
    amount = Math.min(amount, debt.remainingAmount);
    const payment = { id: DB.uid(), debtId, amount, date: f.date.value || todayISO(), note: f.note.value.trim() };
    await DB.put('debtPayments', payment);
    debt.remainingAmount = Math.round((debt.remainingAmount - amount) * 100) / 100;
    if (debt.remainingAmount <= 0) { debt.remainingAmount = 0; debt.settled = true; debt.settledAt = payment.date; }
    await DB.put('debts', debt);
    await loadState();
    closeSheet();
    render();
    showToast('Abatimento registado');
  });
  openSheet('Registar abatimento', body);
}
