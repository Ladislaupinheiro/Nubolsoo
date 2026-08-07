/* =========================================================
   views/bi.js — Vista de BI/Relatórios (visão geral, tendências, categorias, cruzada, projeções).
   ========================================================= */

import { BI_SECTIONS } from '../core/constants.js';
import { totalOwedByMe } from '../core/debt-selectors.js';
import { el, escapeHtml, qs } from '../core/dom.js';
import { balanceUpToMonthEnd, categoryBreakdown, computeHealthScore, goalETAMonths, healthScoreLevel, monthExpense, monthIncome, netWorth, netWorthProjection, projectedBalanceEndOfMonth, totalBalance, totalFixedExpenses, totalInvestments } from '../core/finance-selectors.js';
import { currentMonthKey, formatKz, monthLabel, monthShortLabel, monthsBack, shiftMonth } from '../core/format.js';
import { iconChevronLeft, iconChevronRight } from '../core/icons.js';
import { STATE, UI } from '../core/state.js';

export function renderBI(main) {
  const wrap = el(`<div class="stack"></div>`);
  main.appendChild(wrap);

  wrap.appendChild(el(`
    <div class="tabbar-scroll">
      <div class="tabbar">
        ${BI_SECTIONS.map((s) => `<button type="button" class="tab ${UI.biSection === s.id ? 'active' : ''}" data-action="bi-section" data-value="${s.id}">${s.label}</button>`).join('')}
      </div>
    </div>
  `));

  const body = el(`<div class="stack"></div>`);
  wrap.appendChild(body);

  switch (UI.biSection) {
    case 'tendencias': renderBITendencias(body); break;
    case 'categorias': renderBICategorias(body); break;
    case 'cruzada': renderBICruzada(body); break;
    case 'projecoes': renderBIProjecoes(body); break;
    default: renderBIGeral(body);
  }
}

export function renderBIGeral(body) {
  const mKey = currentMonthKey();
  const inc = monthIncome(mKey), exp = monthExpense(mKey);
  const score = computeHealthScore(mKey);
  const lvl = healthScoreLevel(score);
  const ringColor = lvl.level === 'green' ? 'var(--emerald)' : lvl.level === 'yellow' ? 'var(--accent)' : 'var(--rust)';
  const stampCls = lvl.level === 'green' ? 'paid' : lvl.level === 'yellow' ? 'pending' : 'overdue';

  body.appendChild(el(`
    <div class="card glass-card">
      <p class="section-title">Saúde financeira · ${monthLabel(mKey)}</p>
      <div class="row" style="align-items:center;gap:16px">
        <div class="gauge" style="background:conic-gradient(${ringColor} ${score * 3.6}deg, var(--surface-3) 0deg)">
          <div class="gauge-center"><span class="value">${score}</span><span class="label">/100</span></div>
        </div>
        <div class="stack" style="gap:6px">
          <span class="stamp ${stampCls}" style="transform:none;align-self:flex-start">${lvl.label}</span>
          <p style="font-size:12px;color:var(--text-muted);margin:0;line-height:1.4">Combina taxa de poupança do mês, peso dos kilapes em aberto e aderência ao orçamento.</p>
        </div>
      </div>
    </div>
  `));

  const projBalance = projectedBalanceEndOfMonth();
  body.appendChild(el(`
    <div class="grid-2">
      <div class="stat glass-stat"><div class="label">Poupança do mês</div><div class="value ${inc - exp >= 0 ? 'pos' : 'neg'}">${formatKz(inc - exp)}</div></div>
      <div class="stat glass-stat"><div class="label">Taxa de poupança</div><div class="value">${inc > 0 ? Math.round(((inc - exp) / inc) * 100) : 0}%</div></div>
      <div class="stat glass-stat"><div class="label">Saldo projetado (fim do mês)</div><div class="value ${projBalance >= 0 ? 'pos' : 'neg'}">${formatKz(projBalance)}</div></div>
      <div class="stat glass-stat"><div class="label">Património líquido</div><div class="value">${formatKz(netWorth())}</div></div>
    </div>
  `));
}

export function renderBITendencias(body) {
  body.appendChild(el(`
    <div class="segmented glass-segmented">
      <button class="${UI.biRangeMonths === 6 ? 'active neutral' : ''}" data-action="bi-range" data-value="6">6 meses</button>
      <button class="${UI.biRangeMonths === 12 ? 'active neutral' : ''}" data-action="bi-range" data-value="12">12 meses</button>
      <button class="${UI.biRangeMonths === 24 ? 'active neutral' : ''}" data-action="bi-range" data-value="24">24 meses</button>
    </div>
  `));

  const months = monthsBack(UI.biRangeMonths);
  const flowData = months.map((k) => ({ label: monthShortLabel(k), income: monthIncome(k), expense: monthExpense(k) }));
  const flowCard = el(`<div class="card glass-card"><p class="section-title">Receitas × Despesas</p><div id="biFlowHolder"></div>
    <div class="row" style="justify-content:center;gap:18px;margin-top:8px;font-size:11px;color:var(--text-dim)">
      <span><span style="display:inline-block;width:8px;height:8px;background:var(--emerald);border-radius:2px;margin-right:4px"></span>Receitas</span>
      <span><span style="display:inline-block;width:8px;height:8px;background:var(--rust);border-radius:2px;margin-right:4px"></span>Despesas</span>
    </div>
  </div>`);
  body.appendChild(flowCard);
  Charts.renderBarChart(qs('#biFlowHolder', flowCard), flowData);

  const netData = months.map((k) => ({ label: monthShortLabel(k), value: balanceUpToMonthEnd(k) + totalInvestments() }));
  const netCard = el(`<div class="card glass-card"><p class="section-title">Evolução do patrimônio</p><div id="biNetHolder"></div></div>`);
  body.appendChild(netCard);
  Charts.renderLineChart(qs('#biNetHolder', netCard), netData);

  const mKey = currentMonthKey();
  const yoyKey = shiftMonth(mKey, -12);
  const hasYoY = STATE.transactions.some((t) => t.date.slice(0, 7) === yoyKey);
  if (hasYoY) {
    const curExp = monthExpense(mKey), prevExp = monthExpense(yoyKey);
    const diffPct = prevExp > 0 ? Math.round(((curExp - prevExp) / prevExp) * 100) : null;
    body.appendChild(el(`
      <div class="card glass-card">
        <p class="section-title">Comparação anual</p>
        <div class="row-between">
          <span style="font-size:12.5px;color:var(--text-muted)">Despesas · ${monthLabel(mKey)} vs ${monthLabel(yoyKey)}</span>
          ${diffPct !== null ? `<span class="mono" style="font-size:13px;font-weight:600;color:${diffPct > 0 ? 'var(--rust)' : 'var(--emerald)'}">${diffPct > 0 ? '+' : ''}${diffPct}%</span>` : ''}
        </div>
      </div>
    `));
  }
}

export function renderBICategorias(body) {
  body.appendChild(el(`
    <div class="row-between card">
      <button class="icon-btn" data-action="bi-cat-month-prev">${iconChevronLeft}</button>
      <strong class="display" style="font-size:15px">${monthLabel(UI.biCatMonth)}</strong>
      <button class="icon-btn" data-action="bi-cat-month-next">${iconChevronRight}</button>
    </div>
  `));

  const breakdown = categoryBreakdown(UI.biCatMonth);
  const donutData = breakdown.map((b) => ({ label: b.cat, value: b.value, color: b.color }));
  const donutCard = el(`<div class="card glass-card"><p class="section-title">Despesas por categoria</p><div id="biCatDonutHolder"></div></div>`);
  body.appendChild(donutCard);
  if (donutData.length) {
    Charts.renderDonutChart(qs('#biCatDonutHolder', donutCard), donutData, 'Gasto', (v) => formatKz(v));
  } else {
    qs('#biCatDonutHolder', donutCard).appendChild(el(`<p style="font-size:12.5px;color:var(--text-dim);text-align:center;padding:20px 0">Sem despesas neste mês.</p>`));
  }

  const rankCard = el(`<div class="card glass-card"><p class="section-title">Ranking · vs mês anterior</p><div class="stack" id="biCatRank" style="gap:10px"></div></div>`);
  const holder = qs('#biCatRank', rankCard);
  if (!breakdown.length) {
    holder.appendChild(el(`<p style="font-size:12.5px;color:var(--text-dim);margin:0">Sem dados para este mês.</p>`));
  } else {
    breakdown.forEach((b) => {
      const pctBudget = b.budget > 0 ? Math.min(100, Math.round((b.value / b.budget) * 100)) : null;
      holder.appendChild(el(`
        <div class="stack" style="gap:5px">
          <div class="row-between">
            <span style="font-size:13px;font-weight:500">${escapeHtml(b.cat)}</span>
            <span class="mono" style="font-size:12.5px">${formatKz(b.value)}</span>
          </div>
          <div class="row-between" style="font-size:11px;color:var(--text-dim)">
            <span>${pctBudget !== null ? `${pctBudget}% do orçamento` : 'sem orçamento definido'}</span>
            ${b.delta !== null ? `<span style="color:${b.delta > 0 ? 'var(--rust)' : 'var(--emerald)'}">${b.delta > 0 ? '▲' : '▼'} ${Math.abs(b.delta)}%</span>` : ''}
          </div>
        </div>
      `));
    });
  }
  body.appendChild(rankCard);
}

export function renderBICruzada(body) {
  const mKey = currentMonthKey();
  const css = getComputedStyle(document.documentElement);
  const accent = css.getPropertyValue('--accent').trim();
  const rust = css.getPropertyValue('--rust').trim();

  const totalLimit = Object.values(STATE.budgets).reduce((s, v) => s + v, 0);
  const months = monthsBack(6);
  const budgetData = months.map((k) => ({ label: monthShortLabel(k), income: totalLimit, expense: monthExpense(k) }));
  const budgetCard = el(`<div class="card glass-card"><p class="section-title">Orçamento vs realizado</p><div id="biBudgetHolder"></div>
    <div class="row" style="justify-content:center;gap:18px;margin-top:8px;font-size:11px;color:var(--text-dim)">
      <span><span style="display:inline-block;width:8px;height:8px;background:var(--accent);border-radius:2px;margin-right:4px"></span>Orçado (atual)</span>
      <span><span style="display:inline-block;width:8px;height:8px;background:var(--rust);border-radius:2px;margin-right:4px"></span>Gasto</span>
    </div>
  </div>`);
  body.appendChild(budgetCard);
  if (totalLimit > 0) {
    Charts.renderBarChart(qs('#biBudgetHolder', budgetCard), budgetData, { seriesNames: ['Orçado', 'Gasto'], colors: [accent, rust] });
  } else {
    qs('#biBudgetHolder', budgetCard).appendChild(el(`<p style="font-size:12.5px;color:var(--text-dim);text-align:center;padding:20px 0">Define limites de orçamento para ver esta comparação.</p>`));
  }

  const owedByMe = totalOwedByMe();
  const bal = totalBalance();
  body.appendChild(el(`
    <div class="card glass-card" data-action="nav" data-tab="dividas" style="cursor:pointer">
      <p class="section-title">Impacto dos kilapes no caixa <span style="font-size:11px">ver todos ›</span></p>
      <div class="grid-2">
        <div class="stat glass-stat"><div class="label">Eu devo</div><div class="value neg" style="font-size:15px">${formatKz(owedByMe)}</div></div>
        <div class="stat glass-stat"><div class="label">Saldo livre após kilapes</div><div class="value ${bal - owedByMe >= 0 ? 'pos' : 'neg'}" style="font-size:15px">${formatKz(bal - owedByMe)}</div></div>
      </div>
    </div>
  `));

  const fixed = totalFixedExpenses();
  const exp = monthExpense(mKey);
  const variable = Math.max(0, exp - fixed);
  const fixedPct = exp > 0 ? Math.round((Math.min(fixed, exp) / exp) * 100) : 0;
  body.appendChild(el(`
    <div class="card glass-card">
      <p class="section-title">Fixas vs variáveis · ${monthLabel(mKey)}</p>
      <div class="progress"><div class="progress__fill" style="width:${fixedPct}%;background:var(--accent)"></div></div>
      <div class="row-between" style="margin-top:8px;font-size:12px;color:var(--text-muted)">
        <span>Fixas (contas): <span class="mono">${formatKz(Math.min(fixed, exp))}</span></span>
        <span>Variáveis: <span class="mono">${formatKz(variable)}</span></span>
      </div>
    </div>
  `));

  if (STATE.goals.length) {
    const goalsCard = el(`<div class="card glass-card"><p class="section-title">Metas · tempo estimado</p><div class="stack" id="biGoalsHolder" style="gap:10px"></div></div>`);
    const holder = qs('#biGoalsHolder', goalsCard);
    STATE.goals.forEach((g) => {
      const eta = goalETAMonths(g);
      holder.appendChild(el(`
        <div class="row-between">
          <span style="font-size:13px">${escapeHtml(g.name)}</span>
          <span style="font-size:12px;color:var(--text-dim)">${eta === null ? 'sem ritmo de poupança' : eta === 0 ? 'concluída' : `~${eta} ${eta === 1 ? 'mês' : 'meses'}`}</span>
        </div>
      `));
    });
    body.appendChild(goalsCard);
  }
}

export function renderBIProjecoes(body) {
  const mKey = currentMonthKey();
  const projBalance = projectedBalanceEndOfMonth();
  body.appendChild(el(`
    <div class="stat glass-stat">
      <div class="label">Saldo projetado · fim de ${monthLabel(mKey)}</div>
      <div class="value ${projBalance >= 0 ? 'pos' : 'neg'}" style="font-size:22px">${formatKz(projBalance)}</div>
    </div>
  `));

  body.appendChild(el(`
    <div class="segmented glass-segmented">
      <button class="${UI.biProjMonths === 3 ? 'active neutral' : ''}" data-action="bi-proj-range" data-value="3">3 meses</button>
      <button class="${UI.biProjMonths === 6 ? 'active neutral' : ''}" data-action="bi-proj-range" data-value="6">6 meses</button>
      <button class="${UI.biProjMonths === 12 ? 'active neutral' : ''}" data-action="bi-proj-range" data-value="12">12 meses</button>
    </div>
  `));

  const { points, avgDelta } = netWorthProjection(UI.biProjMonths);
  const projCard = el(`<div class="card glass-card"><p class="section-title">Património · projeção</p><div id="biProjHolder"></div></div>`);
  body.appendChild(projCard);
  Charts.renderForecastChart(qs('#biProjHolder', projCard), points);

  body.appendChild(el(`
    <div class="advice-banner ${avgDelta >= 0 ? 'green' : 'red'}">
      <span class="advice-banner__icon">${avgDelta >= 0 ? '📈' : '📉'}</span>
      <div>
        <strong>${avgDelta >= 0 ? 'Tendência de crescimento' : 'Tendência de queda'}</strong>
        <p>Com base nos últimos 6 meses, o património varia em média ${formatKz(Math.abs(avgDelta))} por mês. Projeção simples de tendência — não considera eventos futuros.</p>
      </div>
    </div>
  `));
}
