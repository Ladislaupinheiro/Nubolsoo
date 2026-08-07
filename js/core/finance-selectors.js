/* =========================================================
   core/finance-selectors.js — Cálculos financeiros derivados do STATE (saldo, totais por mês, saúde financeira, projeções).
   ========================================================= */

import { totalOwedByMe } from './debt-selectors.js';
import { currentMonthKey, daysInMonth, monthShortLabel, monthsBack, shiftMonth } from './format.js';
import { STATE } from './state.js';

export function catColor(name, type) {
  const found = STATE.categories.find((c) => c.type === type && c.name === name);
  return found ? found.color : '#8fa396';
}

export function catList(type) { return STATE.categories.filter((c) => c.type === type); }

/* ----------------------- Consultas derivadas do estado ----------------------- */
export function txForMonth(key) { return STATE.transactions.filter((t) => t.date.slice(0, 7) === key); }

export function monthIncome(key) { return txForMonth(key).filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0); }

export function monthExpense(key) { return txForMonth(key).filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0); }

export function totalBalance() { return STATE.transactions.reduce((s, t) => s + (t.type === 'income' ? t.amount : -t.amount), 0); }

export function totalInvestments() { return STATE.investments.reduce((s, i) => s + i.value, 0); }

export function netWorth() { return totalBalance() + totalInvestments(); }

export function balanceUpToMonthEnd(key) {
  return STATE.transactions
    .filter((t) => t.date.slice(0, 7) <= key)
    .reduce((s, t) => s + (t.type === 'income' ? t.amount : -t.amount), 0);
}

export function totalFixedExpenses() { return STATE.bills.reduce((s, b) => s + b.amount, 0); }

export function averageMonthlySavings(n) {
  const months = monthsBack(n);
  const total = months.reduce((s, k) => s + (monthIncome(k) - monthExpense(k)), 0);
  return total / n;
}

/** Pontuação heurística 0-100: taxa de poupança, peso dos kilapes e aderência ao orçamento. */
export function computeHealthScore(mKey) {
  const inc = monthIncome(mKey), exp = monthExpense(mKey);
  const savingsRate = inc > 0 ? (inc - exp) / inc : (exp > 0 ? -1 : 0);
  let score = 55 + savingsRate * 90;

  const bal = totalBalance();
  const owed = totalOwedByMe();
  if (owed > 0) score -= Math.min(20, bal > 0 ? (owed / bal) * 20 : 20);

  const cats = catList('expense');
  let withLimit = 0, overCount = 0;
  cats.forEach((c) => {
    const limit = STATE.budgets[c.name] || 0;
    if (limit > 0) {
      withLimit++;
      const spent = txForMonth(mKey).filter((t) => t.type === 'expense' && t.category === c.name).reduce((s, t) => s + t.amount, 0);
      if (spent > limit) overCount++;
    }
  });
  if (withLimit > 0) score -= (overCount / withLimit) * 15;

  return Math.max(0, Math.min(100, Math.round(score)));
}

export function healthScoreLevel(score) {
  if (score >= 70) return { level: 'green', label: 'Saudável' };
  if (score >= 45) return { level: 'yellow', label: 'Atenção' };
  return { level: 'red', label: 'Crítico' };
}

/** Ranking de categorias do mês, com variação % face ao mês anterior. */
export function categoryBreakdown(mKey) {
  const prevKey = shiftMonth(mKey, -1);
  const cur = {}, prev = {};
  txForMonth(mKey).filter((t) => t.type === 'expense').forEach((t) => { cur[t.category] = (cur[t.category] || 0) + t.amount; });
  txForMonth(prevKey).filter((t) => t.type === 'expense').forEach((t) => { prev[t.category] = (prev[t.category] || 0) + t.amount; });
  return Object.keys(cur)
    .map((cat) => {
      const value = cur[cat];
      const prevVal = prev[cat] || 0;
      const delta = prevVal > 0 ? Math.round(((value - prevVal) / prevVal) * 100) : null;
      return { cat, value, prevVal, delta, color: catColor(cat, 'expense'), budget: STATE.budgets[cat] || 0 };
    })
    .sort((a, b) => b.value - a.value);
}

/** Saldo projetado ao ritmo diário atual de receitas/despesas. */
export function projectedBalanceEndOfMonth() {
  const mKey = currentMonthKey();
  const dayOfMonth = new Date().getDate();
  const totalDays = daysInMonth(mKey);
  const inc = monthIncome(mKey), exp = monthExpense(mKey);
  if (dayOfMonth <= 0) return totalBalance();
  const dailyNet = (inc - exp) / dayOfMonth;
  return totalBalance() + dailyNet * (totalDays - dayOfMonth);
}

/** Projeção linear simples do património, com base na média de variação dos últimos 6 meses. */
export function netWorthProjection(monthsAhead) {
  const hist = monthsBack(6);
  const series = hist.map((k) => balanceUpToMonthEnd(k) + totalInvestments());
  const deltas = [];
  for (let i = 1; i < series.length; i++) deltas.push(series[i] - series[i - 1]);
  const avgDelta = deltas.length ? deltas.reduce((s, d) => s + d, 0) / deltas.length : 0;

  const points = hist.map((k, i) => ({ label: monthShortLabel(k), value: series[i], projected: false }));
  const mKey = currentMonthKey();
  let running = series[series.length - 1];
  for (let i = 1; i <= monthsAhead; i++) {
    running += avgDelta;
    points.push({ label: monthShortLabel(shiftMonth(mKey, i)), value: Math.round(running), projected: true });
  }
  return { points, avgDelta };
}

/** Meses estimados até atingir uma meta, com base na poupança média dos últimos 3 meses. */
export function goalETAMonths(g) {
  const remaining = Math.max(0, g.target - g.current);
  if (remaining <= 0) return 0;
  const avg = averageMonthlySavings(3);
  if (avg <= 0) return null;
  return Math.ceil(remaining / avg);
}
