/* =========================================================
   views/investments.js — Vista de Investimentos.
   ========================================================= */

import { INVESTMENT_TYPES } from '../core/constants.js';
import { el, escapeHtml, qs } from '../core/dom.js';
import { totalInvestments } from '../core/finance-selectors.js';
import { formatKz } from '../core/format.js';
import { STATE, loadState } from '../core/state.js';
import { render } from '../router.js';
import { closeSheet, openSheet } from '../ui/sheet.js';
import { showToast } from '../ui/toast.js';
import { catDotHtml } from '../ui/widgets.js';

export function renderInvestments(main) {
  const wrap = el(`<div class="stack"></div>`);
  main.appendChild(wrap);
  wrap.appendChild(el(`<div class="stat glass-stat"><div class="label">Patrimônio investido</div><div class="value" style="font-size:22px">${formatKz(totalInvestments())}</div></div>`));

  if (STATE.investments.length) {
    const byType = {};
    STATE.investments.forEach((i) => { byType[i.type] = (byType[i.type] || 0) + i.value; });
    const colors = ['#c9a227', '#4fa37b', '#7a8fa6', '#c0563e', '#8b6dae', '#5ea8a0'];
    const donutData = Object.entries(byType).map(([label, value], idx) => ({ label, value, color: colors[idx % colors.length] }));
    const donutCard = el(`<div class="card glass-card"><p class="section-title">Distribuição por tipo</p><div id="invDonutHolder"></div></div>`);
    wrap.appendChild(donutCard);
    Charts.renderDonutChart(qs('#invDonutHolder', donutCard), donutData, 'Total', (v) => formatKz(v));
  }

  const listCard = el(`<div class="card glass-card"><p class="section-title">Ativos <span class="mono">${STATE.investments.length}</span></p><div class="stack" id="invList"></div></div>`);
  const holder = qs('#invList', listCard);
  if (!STATE.investments.length) {
    holder.appendChild(el(`<div class="empty"><p class="display">Nenhum ativo cadastrado</p><p>Toque em + para registrar seus investimentos.</p></div>`));
  } else {
    STATE.investments.forEach((i) => {
      holder.appendChild(el(`
        <div class="list-item" data-action="open-investment-sheet" data-id="${i.id}" style="cursor:pointer">
          ${catDotHtml(i.type, 'income')}
          <div class="list-item__body">
            <div class="list-item__title">${escapeHtml(i.name)}</div>
            <div class="list-item__sub">${i.type}</div>
          </div>
          <div class="list-item__amount">${formatKz(i.value)}</div>
        </div>
      `));
    });
  }
  wrap.appendChild(listCard);
}

export function openInvestmentSheet(existing) {
  const body = el(`
    <form class="stack" id="invForm">
      <div class="field"><label>Nome do ativo</label><input class="glass-input" type="text" name="name" placeholder="Ex: Poupança BAI, Tesouro..." value="${existing ? escapeHtml(existing.name) : ''}" required></div>
      <div class="field">
        <label>Tipo</label>
        <select class="glass-select" name="type">
          ${INVESTMENT_TYPES.map((t) => `<option value="${t}" ${existing && existing.type === t ? 'selected' : ''}>${t}</option>`).join('')}
        </select>
      </div>
      <div class="field"><label>Valor atual (Kz)</label><input class="glass-input" type="number" step="0.01" min="0" name="value" value="${existing ? existing.value : ''}" required></div>
      <button type="submit" class="btn btn-accent btn-block">${existing ? 'Guardar alterações' : 'Adicionar ativo'}</button>
      ${existing ? `<button type="button" class="btn btn-danger btn-block" data-action="delete-investment" data-id="${existing.id}">Eliminar ativo</button>` : ''}
    </form>
  `);
  body.addEventListener('submit', async (e) => {
    e.preventDefault();
    const f = e.target;
    const record = {
      id: existing ? existing.id : DB.uid(),
      name: f.name.value.trim(),
      type: f.type.value,
      value: parseFloat(f.value.value) || 0
    };
    await DB.put('investments', record);
    await loadState();
    closeSheet();
    render();
    showToast(existing ? 'Ativo atualizado' : 'Ativo adicionado');
  });
  openSheet(existing ? 'Editar ativo' : 'Novo ativo', body);
}
