/* =========================================================
   views/dashboard.js — Vista do Dashboard (resumo do mês, gráficos, atalhos).
   ========================================================= */

import { MONTH_NAMES } from '../core/constants.js';
import { totalOwedByMe, totalOwedToMe } from '../core/debt-selectors.js';
import { el, escapeHtml, qs } from '../core/dom.js';
import { monthExpense, monthIncome, netWorth } from '../core/finance-selectors.js';
import { currentMonthKey, formatKz, monthLabel, shiftMonth } from '../core/format.js';
import { STATE } from '../core/state.js';
import { catDotHtml } from '../ui/widgets.js';
import { goalProgressRow } from './goals.js';

export function renderDashboard(main) {
  const mKey = currentMonthKey();
  const inc = monthIncome(mKey);
  const exp = monthExpense(mKey);
  const saved = inc - exp;

  const wrap = el(`<div class="stack"></div>`);
  main.appendChild(wrap);

  wrap.appendChild(el(`
    <div class="grid-2">
      <div class="stat glass-stat"><div class="label">Receitas · ${monthLabel(mKey)}</div><div class="value pos">${formatKz(inc)}</div></div>
      <div class="stat glass-stat"><div class="label">Despesas · ${monthLabel(mKey)}</div><div class="value neg">${formatKz(exp)}</div></div>
      <div class="stat glass-stat"><div class="label">Economia do mês</div><div class="value ${saved >= 0 ? 'pos' : 'neg'}">${formatKz(saved)}</div></div>
      <div class="stat glass-stat"><div class="label">Patrimônio líquido</div><div class="value">${formatKz(netWorth())}</div></div>
    </div>
  `));

  // Fluxo dos últimos 6 meses
  const months = [5, 4, 3, 2, 1, 0].map((i) => shiftMonth(mKey, -i));
  const flowData = months.map((k) => ({ label: MONTH_NAMES[Number(k.split('-')[1]) - 1].slice(0, 3), income: monthIncome(k), expense: monthExpense(k) }));
  const flowCard = el(`<div class="card glass-card"><p class="section-title">Fluxo · últimos 6 meses <span></span></p><div id="flowChartHolder"></div>
    <div class="row" style="justify-content:center;gap:18px;margin-top:8px;font-size:11px;color:var(--text-dim)">
      <span><span style="display:inline-block;width:8px;height:8px;background:var(--emerald);border-radius:2px;margin-right:4px"></span>Receitas</span>
      <span><span style="display:inline-block;width:8px;height:8px;background:var(--rust);border-radius:2px;margin-right:4px"></span>Despesas</span>
    </div>
  </div>`);
  wrap.appendChild(flowCard);
  Charts.renderBarChart(qs('#flowChartHolder', flowCard), flowData);

  // Próximas contas
  const pendingBills = STATE.bills
    .filter((b) => !(b.paidMonths || []).includes(mKey))
    .sort((a, b) => a.dueDay - b.dueDay)
    .slice(0, 4);
  const today = new Date().getDate();
  const billsCard = el(`<div class="card glass-card"><p class="section-title">Próximas contas <a href="#" data-action="nav" data-tab="contas" style="font-size:11px">ver todas ›</a></p><div class="stack" id="billsPreview"></div></div>`);
  const billsHolder = qs('#billsPreview', billsCard);
  if (pendingBills.length === 0) {
    billsHolder.appendChild(el(`<p style="font-size:12.5px;color:var(--text-dim);margin:0">Nenhuma conta pendente este mês. 🎉</p>`));
  } else {
    pendingBills.forEach((b) => {
      const overdue = b.dueDay < today;
      billsHolder.appendChild(el(`
        <div class="list-item">
          ${catDotHtml(b.category || 'Outros', 'expense')}
          <div class="list-item__body">
            <div class="list-item__title">${escapeHtml(b.name)}</div>
            <div class="list-item__sub">Vence dia ${b.dueDay}</div>
          </div>
          <span class="stamp ${overdue ? 'overdue' : 'pending'}">${overdue ? 'Atrasada' : 'Pendente'}</span>
        </div>
      `));
    });
  }
  wrap.appendChild(billsCard);

  // Kilapes em aberto
  const openDebts = STATE.debts.filter((d) => !d.settled);
  if (openDebts.length) {
    wrap.appendChild(el(`
      <div class="card glass-card" data-action="nav" data-tab="dividas" style="cursor:pointer">
        <p class="section-title">Kilapes <span style="font-size:11px">ver todos ›</span></p>
        <div class="grid-2">
          <div class="stat glass-stat"><div class="label">Eu devo</div><div class="value neg" style="font-size:15px">${formatKz(totalOwedByMe())}</div></div>
          <div class="stat glass-stat"><div class="label">Me devem</div><div class="value pos" style="font-size:15px">${formatKz(totalOwedToMe())}</div></div>
        </div>
      </div>
    `));
  }

  // Metas em progresso
  if (STATE.goals.length) {
    const goalsCard = el(`<div class="card glass-card"><p class="section-title">Metas <a href="#" data-action="nav" data-tab="metas" style="font-size:11px">ver todas ›</a></p><div class="stack" id="goalsPreview"></div></div>`);
    const holder = qs('#goalsPreview', goalsCard);
    STATE.goals.slice(0, 3).forEach((g) => holder.appendChild(goalProgressRow(g)));
    wrap.appendChild(goalsCard);
  }
}
