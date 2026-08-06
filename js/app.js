/* =========================================================
   app.js — lógica principal do PWA de Finanças Pessoais
   Vanilla JS puro. Sem dependências externas.
   ========================================================= */

/* ----------------------- Constantes ----------------------- */
const DEFAULT_EXPENSE_CATS = [
  { name: 'Alimentação', color: '#c9a227' },
  { name: 'Transporte', color: '#4fa37b' },
  { name: 'Moradia', color: '#7a8fa6' },
  { name: 'Saúde', color: '#c0563e' },
  { name: 'Educação', color: '#8b6dae' },
  { name: 'Lazer', color: '#d4915d' },
  { name: 'Compras', color: '#5ea8a0' },
  { name: 'Outros', color: '#8fa396' },
  { name: 'Roupas do Dia a Dia', color: '#6fb88a' },
  { name: 'Ocasiões Especiais', color: '#a8763e' },
  { name: 'Calçados & Acessórios', color: '#5a7fc4' },
  { name: 'Manutenção de Roupas', color: '#c46f9e' },
  { name: 'Apoio Familiar / Emergências', color: '#9c7b4f' },
  { name: 'Social & Lazer Informal', color: '#5b8fae' },
  { name: 'Pequenos Gastos', color: '#a55b6b' },
  { name: 'Manutenção Doméstica', color: '#7fa65a' }
];
const DEFAULT_INCOME_CATS = [
  { name: 'Salário', color: '#4fa37b' },
  { name: 'Freelance', color: '#6fb88a' },
  { name: 'Investimentos', color: '#c9a227' },
  { name: 'Outros', color: '#8fa396' }
];
const CATEGORY_PALETTE = ['#c9a227', '#4fa37b', '#c0563e', '#7a8fa6', '#8b6dae', '#d4915d', '#5ea8a0', '#8fa396', '#6fb88a', '#a8763e', '#5a7fc4', '#c46f9e', '#9c7b4f', '#5b8fae', '#a55b6b', '#7fa65a'];
const INVESTMENT_TYPES = ['Poupança', 'Ações', 'Fundos', 'Imóveis', 'Criptomoeda', 'Outros'];
const MONTH_NAMES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

/* ----------------------- Estado global ----------------------- */
let STATE = { transactions: [], budgets: {}, goals: [], bills: [], investments: [], categories: [], security: null, debts: [], debtPayments: [] };
let UI = {
  tab: 'dashboard',
  txMonth: currentMonthKey(),
  txType: 'all',
  txCategory: 'all',
  budgetMonth: currentMonthKey(),
  billsMonth: currentMonthKey(),
  reportMonth: currentMonthKey()
};

/* ----------------------- Utilitários ----------------------- */
function el(html) {
  const d = document.createElement('div');
  d.innerHTML = html.trim();
  return d.firstElementChild;
}
function qs(sel, ctx) { return (ctx || document).querySelector(sel); }
function qsa(sel, ctx) { return Array.from((ctx || document).querySelectorAll(sel)); }
function escapeHtml(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
function formatKz(v) {
  const sign = v < 0 ? '-' : '';
  const abs = Math.abs(v || 0);
  const parts = abs.toFixed(2).split('.');
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${sign}Kz ${parts[0]},${parts[1]}`;
}
function todayISO() { return new Date().toISOString().slice(0, 10); }

/* ----------------------- Segurança (PIN) ----------------------- */
function randomSalt() {
  return Array.from(crypto.getRandomValues(new Uint8Array(16))).map((b) => b.toString(16).padStart(2, '0')).join('');
}
async function hashPin(pin, salt) {
  const enc = new TextEncoder().encode(`${salt}:${pin}`);
  const buf = await crypto.subtle.digest('SHA-256', enc);
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('');
}
function currentMonthKey() { return new Date().toISOString().slice(0, 7); }
function monthLabel(key) {
  const [y, m] = key.split('-').map(Number);
  return `${MONTH_NAMES[m - 1]} ${y}`;
}
function shiftMonth(key, delta) {
  let [y, m] = key.split('-').map(Number);
  m += delta;
  while (m < 1) { m += 12; y--; }
  while (m > 12) { m -= 12; y++; }
  return `${y}-${String(m).padStart(2, '0')}`;
}
function daysInMonth(key) {
  const [y, m] = key.split('-').map(Number);
  return new Date(y, m, 0).getDate();
}
function catColor(name, type) {
  const found = STATE.categories.find((c) => c.type === type && c.name === name);
  return found ? found.color : '#8fa396';
}
function catList(type) { return STATE.categories.filter((c) => c.type === type); }

/* ----------------------- Consultas derivadas do estado ----------------------- */
function txForMonth(key) { return STATE.transactions.filter((t) => t.date.slice(0, 7) === key); }
function monthIncome(key) { return txForMonth(key).filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0); }
function monthExpense(key) { return txForMonth(key).filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0); }
function totalBalance() { return STATE.transactions.reduce((s, t) => s + (t.type === 'income' ? t.amount : -t.amount), 0); }
function totalInvestments() { return STATE.investments.reduce((s, i) => s + i.value, 0); }
function netWorth() { return totalBalance() + totalInvestments(); }

/* ----------------------- Dívidas & Kilapes ----------------------- */
function debtsByDirection(direction) { return STATE.debts.filter((d) => d.direction === direction && !d.settled); }
function totalOwedByMe() { return debtsByDirection('devo').reduce((s, d) => s + d.remainingAmount, 0); }
function totalOwedToMe() { return debtsByDirection('a_receber').reduce((s, d) => s + d.remainingAmount, 0); }
function paymentsForDebt(debtId) {
  return STATE.debtPayments.filter((p) => p.debtId === debtId).sort((a, b) => b.date.localeCompare(a.date));
}
function debtStatus(d) {
  if (d.settled) return 'paid';
  if (!d.dueDate) return 'pending';
  return d.dueDate < todayISO() ? 'overdue' : 'pending';
}
/** Score de confiança: com base no histórico de kilapes já liquidados desta pessoa (só faz sentido para "a_receber") */
function personTrustBadge(person) {
  const settledOnes = STATE.debts.filter((d) => d.direction === 'a_receber' && d.person === person && d.settled);
  if (settledOnes.length < 2) return null; // histórico curto demais para dizer algo útil
  const onTime = settledOnes.filter((d) => !d.dueDate || !d.settledAt || d.settledAt <= d.dueDate).length;
  const ratio = onTime / settledOnes.length;
  if (ratio >= 0.8) return { label: 'Bom pagador', cls: 'paid' };
  if (ratio >= 0.5) return { label: 'Pagamentos irregulares', cls: 'pending' };
  return { label: 'Atrasos frequentes', cls: 'overdue' };
}
function whatsappReminderUrl(debt) {
  const valor = formatKz(debt.remainingAmount);
  const prazo = debt.dueDate ? ` combinado para ${debt.dueDate.split('-').reverse().join('/')}` : ' que ficou combinado';
  const msg = `Olá ${debt.person}! Só a passar para lembrar do valor de ${valor}${prazo}. Qualquer coisa, fala comigo. Obrigado(a)! 🙂`;
  const digits = (debt.phone || '').replace(/\D/g, '');
  return digits ? `https://wa.me/${digits}?text=${encodeURIComponent(msg)}` : `https://wa.me/?text=${encodeURIComponent(msg)}`;
}
function balanceUpToMonthEnd(key) {
  return STATE.transactions
    .filter((t) => t.date.slice(0, 7) <= key)
    .reduce((s, t) => s + (t.type === 'income' ? t.amount : -t.amount), 0);
}

/* ========================================================================
   PERSONAL INTELLIGENCE (PI) — heurísticas locais, sem IA externa
   Tudo calculado a partir do que já está em STATE, 100% offline.
   ======================================================================== */

/** Projeta, ao ritmo de gastos atual, se/quando o saldo do mês fica apertado. */
function spendingPaceInsight(mKey) {
  if (mKey !== currentMonthKey()) return null;
  const dayOfMonth = new Date().getDate();
  const totalDays = daysInMonth(mKey);
  const inc = monthIncome(mKey);
  const exp = monthExpense(mKey);
  if (exp <= 0 || inc <= 0) return null;

  const dailyAvg = exp / dayOfMonth;
  const remaining = inc - exp;

  if (remaining <= 0) {
    return { level: 'red', text: `Já gastaste ${formatKz(exp)} este mês, mais do que as receitas de ${formatKz(inc)}.` };
  }
  const daysAfford = Math.floor(remaining / dailyAvg);
  const projectedDay = dayOfMonth + daysAfford;

  if (projectedDay >= totalDays) {
    return { level: 'green', text: `No ritmo atual de gastos, o saldo do mês dá tranquilamente até ao dia ${totalDays}.` };
  }
  return {
    level: projectedDay - dayOfMonth <= 4 ? 'red' : 'yellow',
    text: `No ritmo atual de gastos diários (${formatKz(dailyAvg)}/dia), o saldo deste mês tende a esgotar-se por volta do dia ${projectedDay}.`
  };
}

/** Compara a média de gastos ao fim de semana com a média em dias de semana, nos últimos ~2 meses. */
function weekendPatternInsight() {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 56);
  const cutoffISO = cutoff.toISOString().slice(0, 10);
  const byDate = {};
  STATE.transactions
    .filter((t) => t.type === 'expense' && t.date >= cutoffISO)
    .forEach((t) => { byDate[t.date] = (byDate[t.date] || 0) + t.amount; });

  let weekendSum = 0, weekendDays = 0, weekdaySum = 0, weekdayDays = 0;
  Object.entries(byDate).forEach(([date, total]) => {
    const dow = new Date(`${date}T00:00:00`).getDay();
    if (dow === 0 || dow === 6) { weekendSum += total; weekendDays++; } else { weekdaySum += total; weekdayDays++; }
  });
  if (weekendDays < 3 || weekdayDays < 5) return null;

  const weekendAvg = weekendSum / weekendDays;
  const weekdayAvg = weekdaySum / weekdayDays;
  if (weekdayAvg <= 0) return null;

  const diffPct = Math.round(((weekendAvg - weekdayAvg) / weekdayAvg) * 100);
  if (Math.abs(diffPct) < 15) return null;
  return diffPct > 0
    ? { level: 'info', text: `Costumas gastar ${diffPct}% mais aos fins de semana do que durante a semana.` }
    : { level: 'info', text: `Costumas gastar ${Math.abs(diffPct)}% menos aos fins de semana do que durante a semana.` };
}

/** Encontra a categoria cujo gasto mais cresceu este mês em relação ao mês anterior. */
function categoryGrowthInsight(mKey) {
  const prevKey = shiftMonth(mKey, -1);
  const curByCat = {}, prevByCat = {};
  txForMonth(mKey).filter((t) => t.type === 'expense').forEach((t) => { curByCat[t.category] = (curByCat[t.category] || 0) + t.amount; });
  txForMonth(prevKey).filter((t) => t.type === 'expense').forEach((t) => { prevByCat[t.category] = (prevByCat[t.category] || 0) + t.amount; });

  let best = null;
  Object.entries(curByCat).forEach(([cat, val]) => {
    const prevVal = prevByCat[cat] || 0;
    if (prevVal >= 500 && val > prevVal * 1.4 && (val - prevVal) >= 2000) {
      const pct = Math.round(((val - prevVal) / prevVal) * 100);
      if (!best || pct > best.pct) best = { cat, pct };
    }
  });
  if (!best) return null;
  return { level: 'info', text: `Gastaste ${best.pct}% mais em "${best.cat}" este mês do que no mês passado.` };
}

/** Sinaliza acumulação de pequenas compras (gastos "invisíveis") no mês. */
function frequentSmallSpendInsight(mKey) {
  const SMALL_THRESHOLD = 3000;
  const smallTx = txForMonth(mKey).filter((t) => t.type === 'expense' && t.amount > 0 && t.amount <= SMALL_THRESHOLD);
  if (smallTx.length < 8) return null;
  const total = smallTx.reduce((s, t) => s + t.amount, 0);
  return { level: 'info', text: `Já fizeste ${smallTx.length} pequenas compras este mês (até ${formatKz(SMALL_THRESHOLD)} cada), somando ${formatKz(total)}. Vale a pena reparar nestes gastos "invisíveis".` };
}

/** Reúne os insights relevantes para o mês atual, no máximo 3. */
function getInsights() {
  const mKey = currentMonthKey();
  return [spendingPaceInsight(mKey), weekendPatternInsight(), categoryGrowthInsight(mKey), frequentSmallSpendInsight(mKey)]
    .filter(Boolean)
    .slice(0, 3);
}

/** Simulador "Posso comprar isto agora?" — regras locais sobre saldo, contas e orçamento. */
function purchaseAdvice(category, amount) {
  const mKey = currentMonthKey();
  const balance = totalBalance();
  const balanceAfter = balance - amount;
  const pendingBills = STATE.bills
    .filter((b) => !(b.paidMonths || []).includes(mKey))
    .reduce((s, b) => s + b.amount, 0);
  const budgetLimit = STATE.budgets[category] || 0;
  const spentInCat = txForMonth(mKey).filter((t) => t.type === 'expense' && t.category === category).reduce((s, t) => s + t.amount, 0);

  if (balanceAfter < 0) {
    return { level: 'red', text: 'Esta compra deixaria o teu saldo negativo.', balanceAfter };
  }
  if (balanceAfter < pendingBills) {
    return { level: 'red', text: `Depois desta compra sobrariam ${formatKz(balanceAfter)} — não cobre as contas pendentes deste mês (${formatKz(pendingBills)}).`, balanceAfter };
  }
  if (budgetLimit > 0 && spentInCat + amount > budgetLimit) {
    return { level: 'yellow', text: `Isto ultrapassa o orçamento de "${category}" para este mês (limite: ${formatKz(budgetLimit)}).`, balanceAfter };
  }
  if (balanceAfter < pendingBills * 1.3) {
    return { level: 'yellow', text: `Dá para comprar, mas a folga depois de cobrir as contas fica curta (${formatKz(balanceAfter - pendingBills)}).`, balanceAfter };
  }
  return { level: 'green', text: 'Tranquilo — não compromete as contas pendentes nem o orçamento da categoria.', balanceAfter };
}

function openPurchaseAdviceSheet() {
  const expenseCats = catList('expense');
  const body = el(`
    <form class="stack" id="purchaseForm">
      <p style="font-size:12.5px;color:var(--text-dim);margin:0">Diz quanto queres gastar e em quê — o Nubolso vê se dá para respirar depois.</p>
      <div class="field">
        <label>Categoria</label>
        <select name="category">
          ${expenseCats.map((c) => `<option value="${escapeHtml(c.name)}">${escapeHtml(c.name)}</option>`).join('')}
        </select>
      </div>
      <div class="field">
        <label>Valor (Kz)</label>
        <input type="number" inputmode="decimal" step="0.01" min="0.01" name="amount" placeholder="0,00" required autofocus>
      </div>
      <button type="submit" class="btn btn-accent btn-block">Analisar</button>
      <div id="purchaseResult"></div>
    </form>
  `);
  body.addEventListener('submit', (e) => {
    e.preventDefault();
    const f = e.target;
    const amount = parseFloat(f.amount.value) || 0;
    if (amount <= 0) { showToast('Informa um valor válido'); return; }
    const advice = purchaseAdvice(f.category.value, amount);
    const title = advice.level === 'red' ? 'Vai comprometer as contas' : advice.level === 'yellow' ? 'Atenção' : 'Tranquilo';
    const resultHolder = qs('#purchaseResult', body);
    resultHolder.innerHTML = `
      <div class="advice-banner ${advice.level}">
        <span class="advice-banner__icon">${advice.level === 'red' ? '🔴' : advice.level === 'yellow' ? '🟡' : '🟢'}</span>
        <div>
          <strong>${title}</strong>
          <p>${advice.text}</p>
          <p class="mono" style="margin:4px 0 0;font-size:11.5px;color:var(--text-dim)">Saldo depois da compra: ${formatKz(advice.balanceAfter)}</p>
        </div>
      </div>
    `;
  });
  openSheet('Posso comprar isto?', body);
}

/* ----------------------- Carregamento inicial ----------------------- */
async function loadState() {
  const [transactions, budgetsArr, goals, bills, investments, categories, security, debts, debtPayments] = await Promise.all([
    DB.getAll('transactions'), DB.getAll('budgets'), DB.getAll('goals'), DB.getAll('bills'), DB.getAll('investments'),
    DB.getAll('categories'), DB.get('settings', 'security'), DB.getAll('debts'), DB.getAll('debtPayments')
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

/* ----------------------- Toast ----------------------- */
let toastTimer = null;
function showToast(msg) {
  qsa('.toast').forEach((t) => t.remove());
  const t = el(`<div class="toast">${escapeHtml(msg)}</div>`);
  document.body.appendChild(t);
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.remove(), 2200);
}

/* ----------------------- Sheet (modal inferior) ----------------------- */
function openSheet(titleHtml, bodyEl) {
  closeSheet();
  const overlay = el(`<div class="sheet-overlay" id="sheetOverlay"></div>`);
  const sheet = el(`
    <div class="sheet">
      <div class="sheet__handle"></div>
      <h2 class="sheet__title display">${titleHtml}</h2>
      <div class="sheet__body"></div>
    </div>
  `);
  qs('.sheet__body', sheet).appendChild(bodyEl);
  overlay.appendChild(sheet);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) closeSheet(); });
  document.body.appendChild(overlay);
}
function closeSheet() {
  const o = qs('#sheetOverlay');
  if (o) o.remove();
}

/* ----------------------- Cat dot (ícone circular) ----------------------- */
function catDotHtml(category, type) {
  const color = catColor(category, type);
  const letter = (category || '?').charAt(0).toUpperCase();
  return `<div class="cat-dot" style="background:${color}22;color:${color}">${letter}</div>`;
}

/* ========================================================================
   ÍCONES (SVG inline, sem dependências) — definidos antes do uso
   ======================================================================== */
function icon(paths) { return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${paths}</svg>`; }
const iconHome = icon('<path d="M3 11l9-8 9 8"/><path d="M5 10v10h14V10"/>');
const iconSwap = icon('<path d="M7 4v13M7 17l-3-3M7 17l3-3"/><path d="M17 20V7M17 7l3 3M17 7l-3 3"/>');
const iconPie = icon('<path d="M21 12A9 9 0 1 1 12 3v9z"/>');
const iconTarget = icon('<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>');
const iconMore = icon('<circle cx="5" cy="12" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="19" cy="12" r="1.5"/>');
const iconReceipt = icon('<path d="M6 2h12v20l-3-2-3 2-3-2-3 2V2z"/><path d="M9 7h6M9 11h6"/>');
const iconTrend = icon('<path d="M3 17l6-6 4 4 8-8"/><path d="M15 7h6v6"/>');
const iconChart = icon('<path d="M4 20V10M12 20V4M20 20v-7"/>');
const iconDownload = icon('<path d="M12 3v12M7 10l5 5 5-5"/><path d="M5 21h14"/>');
const iconUpload = icon('<path d="M12 21V9M7 14l5-5 5 5"/><path d="M5 3h14"/>');
const iconTrash = icon('<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/>');
const iconChevronLeft = icon('<path d="M15 18l-6-6 6-6"/>');
const iconChevronRight = icon('<path d="M9 18l6-6-6-6"/>');
const iconTag = icon('<path d="M20.59 13.41 11 3.83A2 2 0 0 0 9.59 3.24L4 3a1 1 0 0 0-1 1l.24 5.59a2 2 0 0 0 .59 1.41l9.58 9.59a2 2 0 0 0 2.83 0l4.35-4.35a2 2 0 0 0 0-2.83z"/><circle cx="7.5" cy="7.5" r="1.2" fill="currentColor" stroke="none"/>');
const iconLock = icon('<rect x="4" y="10" width="16" height="10" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/>');
const iconHandshake = icon('<path d="M8.5 14.5 3 9l4-4 3.5 3.5"/><path d="M15.5 14.5 21 9l-4-4-3.5 3.5"/><path d="M8.5 14.5 11 17l2-2 2 2 2.5-2.5"/>');
const iconSpark = icon('<path d="M12 3v3M12 18v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M3 12h3M18 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1"/><circle cx="12" cy="12" r="3"/>');

/* ========================================================================
   TOPBAR & NAVEGAÇÃO
   ======================================================================== */
function renderTopbar() {
  const bal = totalBalance();
  const topbar = qs('#topbar');
  topbar.innerHTML = `
    <div class="topbar__row">
      <p class="topbar__title">💼 Nubolso</p>
      <div class="topbar__balance">
        <span class="label">Saldo total</span>
        <span class="value mono ${bal >= 0 ? 'pos' : 'neg'}">${formatKz(bal)}</span>
      </div>
    </div>
  `;
}

const NAV_ITEMS = [
  { id: 'dashboard', label: 'Início', icon: iconHome },
  { id: 'transacoes', label: 'Lançar', icon: iconSwap },
  { id: 'orcamento', label: 'Orçamento', icon: iconPie },
  { id: 'metas', label: 'Metas', icon: iconTarget },
  { id: 'mais', label: 'Mais', icon: iconMore }
];

function renderBottomNav() {
  const nav = qs('#bottomnav');
  nav.innerHTML = NAV_ITEMS.map((item) => `
    <button class="bottomnav__item ${UI.tab === item.id ? 'active' : ''}" data-action="nav" data-tab="${item.id}">
      ${item.icon}
      <span>${item.label}</span>
    </button>
  `).join('');
}

function setTab(tab) {
  if (tab === 'mais') { openMoreSheet(); return; }
  UI.tab = tab;
  location.hash = '#/' + tab;
  render();
}

function openMoreSheet() {
  const body = el(`
    <div class="stack">
      <button class="btn btn-block" style="justify-content:flex-start" data-action="nav-more" data-tab="contas">${iconReceipt} &nbsp; Contas a pagar</button>
      <button class="btn btn-block" style="justify-content:flex-start" data-action="nav-more" data-tab="dividas">${iconHandshake} &nbsp; Dívidas & Kilapes</button>
      <button class="btn btn-block" style="justify-content:flex-start" data-action="nav-more" data-tab="investimentos">${iconTrend} &nbsp; Investimentos</button>
      <button class="btn btn-block" style="justify-content:flex-start" data-action="nav-more" data-tab="relatorios">${iconChart} &nbsp; Relatórios</button>
      <hr class="rule">
      <button class="btn btn-block" style="justify-content:flex-start" data-action="open-purchase-advice-sheet">${iconSpark} &nbsp; Posso comprar isto?</button>
      <button class="btn btn-block" style="justify-content:flex-start" data-action="open-categories-sheet">${iconTag} &nbsp; Categorias</button>
      <button class="btn btn-block" style="justify-content:flex-start" data-action="open-security-sheet">${iconLock} &nbsp; Segurança${STATE.security ? ' · PIN ativo' : ''}</button>
      <button class="btn btn-block" style="justify-content:flex-start" data-action="export-data">${iconDownload} &nbsp; Exportar dados (JSON)</button>
      <button class="btn btn-block" style="justify-content:flex-start" data-action="trigger-import">${iconUpload} &nbsp; Importar dados</button>
      <input type="file" id="importInput" accept="application/json" class="hidden">
      <button class="btn btn-block" style="justify-content:flex-start" id="installBtn" data-action="install-app" hidden>${iconDownload} &nbsp; Instalar aplicativo</button>
      <hr class="rule">
      <button class="btn btn-block btn-danger" data-action="wipe-data">${iconTrash} &nbsp; Apagar todos os dados</button>
    </div>
  `);
  openSheet('Mais opções', body);
  if (window.deferredInstallPrompt) qs('#installBtn', body).hidden = false;
}

/* ========================================================================
   CATEGORIAS (personalizáveis)
   ======================================================================== */
function categoryRow(c) {
  return el(`
    <div class="list-item" data-action="open-category-sheet" data-id="${c.id}" style="cursor:pointer">
      ${catDotHtml(c.name, c.type)}
      <div class="list-item__body"><div class="list-item__title">${escapeHtml(c.name)}</div></div>
    </div>
  `);
}

function openCategoriesSheet() {
  const body = el(`
    <div class="stack">
      <div class="row-between">
        <p class="section-title" style="margin:0">Despesas</p>
        <button type="button" class="btn btn-sm btn-ghost" data-action="open-category-sheet" data-type="expense">+ Nova</button>
      </div>
      <div class="stack" id="catExpenseList"></div>
      <hr class="rule">
      <div class="row-between">
        <p class="section-title" style="margin:0">Receitas</p>
        <button type="button" class="btn btn-sm btn-ghost" data-action="open-category-sheet" data-type="income">+ Nova</button>
      </div>
      <div class="stack" id="catIncomeList"></div>
    </div>
  `);
  const expHolder = qs('#catExpenseList', body);
  const incHolder = qs('#catIncomeList', body);
  const expCats = catList('expense');
  const incCats = catList('income');
  if (expCats.length) expCats.forEach((c) => expHolder.appendChild(categoryRow(c)));
  else expHolder.appendChild(el(`<p style="font-size:12.5px;color:var(--text-dim);margin:4px 0">Nenhuma categoria de despesa.</p>`));
  if (incCats.length) incCats.forEach((c) => incHolder.appendChild(categoryRow(c)));
  else incHolder.appendChild(el(`<p style="font-size:12.5px;color:var(--text-dim);margin:4px 0">Nenhuma categoria de receita.</p>`));
  openSheet('Categorias', body);
}

function openCategorySheet(existing, forcedType) {
  const type = forcedType || (existing ? existing.type : 'expense');
  const body = el(`
    <form class="stack" id="categoryForm">
      <div class="segmented" id="catTypeSeg">
        <button type="button" class="${type === 'expense' ? 'active expense' : ''}" data-type="expense">Despesa</button>
        <button type="button" class="${type === 'income' ? 'active income' : ''}" data-type="income">Receita</button>
      </div>
      <div class="field">
        <label>Nome da categoria</label>
        <input type="text" name="name" placeholder="Ex: Assinaturas" value="${existing ? escapeHtml(existing.name) : ''}" maxlength="24" required autofocus>
      </div>
      <div class="field">
        <label>Cor</label>
        <div class="chip-group" id="catColorChips">
          ${CATEGORY_PALETTE.map((c) => `<button type="button" class="color-swatch ${existing ? (existing.color === c ? 'active' : '') : (c === CATEGORY_PALETTE[0] ? 'active' : '')}" data-color="${c}" style="background:${c}" title="${c}"></button>`).join('')}
        </div>
      </div>
      <button type="submit" class="btn btn-accent btn-block">${existing ? 'Guardar alterações' : 'Adicionar categoria'}</button>
      ${existing ? `<button type="button" class="btn btn-danger btn-block" data-action="delete-category" data-id="${existing.id}">Eliminar categoria</button>` : ''}
    </form>
  `);

  // troca de tipo re-renderiza a sheet (mesmo padrão do formulário de lançamento)
  qsa('#catTypeSeg button', body).forEach((btn) => {
    btn.addEventListener('click', () => {
      if (btn.dataset.type === type) return;
      closeSheet();
      openCategorySheet(existing, btn.dataset.type);
    });
  });
  qsa('#catColorChips .color-swatch', body).forEach((sw) => {
    sw.addEventListener('click', () => {
      qsa('#catColorChips .color-swatch', body).forEach((s) => s.classList.remove('active'));
      sw.classList.add('active');
    });
  });

  body.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = e.target.name.value.trim();
    if (!name) { showToast('Informe um nome'); return; }
    const dup = STATE.categories.find((c) => c.type === type && c.name.toLowerCase() === name.toLowerCase() && (!existing || c.id !== existing.id));
    if (dup) { showToast('Já existe uma categoria com este nome'); return; }
    const activeColor = qs('#catColorChips .color-swatch.active', body);
    const record = {
      id: existing ? existing.id : DB.uid(),
      name,
      type,
      color: activeColor ? activeColor.dataset.color : CATEGORY_PALETTE[0]
    };
    await DB.put('categories', record);
    await loadState();
    closeSheet();
    openCategoriesSheet();
    render();
    showToast(existing ? 'Categoria atualizada' : 'Categoria adicionada');
  });

  openSheet(existing ? 'Editar categoria' : 'Nova categoria', body);
}

/* ========================================================================
   SEGURANÇA (bloqueio por PIN)
   ======================================================================== */
function openSecuritySheet() {
  if (!STATE.security) { openPinFormSheet('create'); return; }
  const body = el(`
    <div class="stack">
      <p style="font-size:12.5px;color:var(--text-dim)">O bloqueio por PIN pede um código de 4 dígitos sempre que abres o Nubolso.</p>
      <button type="button" class="btn btn-block" data-action="open-pin-form" data-mode="change">Alterar PIN</button>
      <button type="button" class="btn btn-block btn-danger" data-action="open-pin-form" data-mode="disable">Desativar bloqueio por PIN</button>
    </div>
  `);
  openSheet('Segurança', body);
}

function openPinFormSheet(mode) {
  const needsCurrent = mode === 'change' || mode === 'disable';
  const needsNew = mode === 'create' || mode === 'change';
  const body = el(`
    <form class="stack" id="pinForm">
      ${needsCurrent ? `<div class="field"><label>PIN atual</label><input type="password" inputmode="numeric" pattern="[0-9]{4}" maxlength="4" name="current" required autofocus></div>` : ''}
      ${needsNew ? `
        <div class="field"><label>${mode === 'change' ? 'Novo PIN' : 'PIN'} (4 dígitos)</label><input type="password" inputmode="numeric" pattern="[0-9]{4}" maxlength="4" name="pin1" required ${needsCurrent ? '' : 'autofocus'}></div>
        <div class="field"><label>Confirmar PIN</label><input type="password" inputmode="numeric" pattern="[0-9]{4}" maxlength="4" name="pin2" required></div>
      ` : ''}
      <button type="submit" class="btn ${mode === 'disable' ? 'btn-danger' : 'btn-accent'} btn-block">${mode === 'disable' ? 'Desativar bloqueio' : mode === 'change' ? 'Guardar novo PIN' : 'Ativar bloqueio por PIN'}</button>
    </form>
  `);

  body.addEventListener('submit', async (e) => {
    e.preventDefault();
    const f = e.target;

    if (needsCurrent) {
      const currentHash = await hashPin(f.current.value, STATE.security.pinSalt);
      if (currentHash !== STATE.security.pinHash) { showToast('PIN atual incorreto'); return; }
    }

    if (mode === 'disable') {
      await DB.delete('settings', 'security');
      STATE.security = null;
      closeSheet();
      showToast('Bloqueio por PIN desativado');
      return;
    }

    if (!/^\d{4}$/.test(f.pin1.value)) { showToast('O PIN deve ter 4 dígitos'); return; }
    if (f.pin1.value !== f.pin2.value) { showToast('Os PINs não coincidem'); return; }

    const salt = randomSalt();
    const hash = await hashPin(f.pin1.value, salt);
    const record = { key: 'security', pinHash: hash, pinSalt: salt };
    await DB.put('settings', record);
    STATE.security = record;
    closeSheet();
    showToast(mode === 'change' ? 'PIN atualizado' : 'Bloqueio por PIN ativado');
  });

  openSheet(mode === 'disable' ? 'Desativar bloqueio' : mode === 'change' ? 'Alterar PIN' : 'Ativar PIN', body);
}

/* ========================================================================
   ECRÃ DE BLOQUEIO (mostrado no arranque, se houver PIN configurado)
   ======================================================================== */
function showLockScreen() {
  document.body.classList.add('locked');
  const overlay = el(`
    <div class="lock-screen" id="lockScreen">
      <div class="lock-screen__inner">
        <p class="lock-screen__icon">${iconLock}</p>
        <h1 class="display">Nubolso</h1>
        <p class="lock-screen__sub">Introduz o teu PIN</p>
        <div class="lock-dots" id="lockDots"><span></span><span></span><span></span><span></span></div>
        <p class="lock-screen__error" id="lockError">PIN incorreto</p>
        <div class="keypad" id="lockKeypad">
          ${[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => `<button type="button" data-key="${n}">${n}</button>`).join('')}
          <span></span>
          <button type="button" data-key="0">0</button>
          <button type="button" data-key="back" aria-label="Apagar">⌫</button>
        </div>
      </div>
    </div>
  `);
  document.body.appendChild(overlay);

  let entered = '';
  const dots = qsa('#lockDots span', overlay);
  const errorEl = qs('#lockError', overlay);
  const inner = qs('.lock-screen__inner', overlay);

  function updateDots() {
    dots.forEach((d, i) => d.classList.toggle('filled', i < entered.length));
  }

  async function attempt() {
    const hash = await hashPin(entered, STATE.security.pinSalt);
    if (hash === STATE.security.pinHash) {
      overlay.remove();
      document.body.classList.remove('locked');
    } else {
      errorEl.style.visibility = 'visible';
      inner.classList.add('shake');
      setTimeout(() => inner.classList.remove('shake'), 320);
      entered = '';
      updateDots();
    }
  }

  qs('#lockKeypad', overlay).addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-key]');
    if (!btn) return;
    errorEl.style.visibility = 'hidden';
    if (btn.dataset.key === 'back') { entered = entered.slice(0, -1); updateDots(); return; }
    if (entered.length >= 4) return;
    entered += btn.dataset.key;
    updateDots();
    if (entered.length === 4) setTimeout(attempt, 140);
  });
}

/* ========================================================================
   ROUTER
   ======================================================================== */
function render() {
  renderTopbar();
  renderBottomNav();
  const main = qs('#main');
  main.innerHTML = '';
  const fab = qs('#fab');
  fab.hidden = false;

  switch (UI.tab) {
    case 'dashboard': renderDashboard(main); fab.dataset.action = 'open-tx-sheet'; fab.title = 'Novo lançamento'; break;
    case 'transacoes': renderTransactions(main); fab.dataset.action = 'open-tx-sheet'; fab.title = 'Novo lançamento'; break;
    case 'orcamento': renderBudget(main); fab.hidden = true; break;
    case 'metas': renderGoals(main); fab.dataset.action = 'open-goal-sheet'; fab.title = 'Nova meta'; break;
    case 'contas': renderBills(main); fab.dataset.action = 'open-bill-sheet'; fab.title = 'Nova conta'; break;
    case 'dividas': renderDebts(main); fab.dataset.action = 'open-debt-sheet'; fab.title = 'Novo kilape'; break;
    case 'investimentos': renderInvestments(main); fab.dataset.action = 'open-investment-sheet'; fab.title = 'Novo ativo'; break;
    case 'relatorios': renderReports(main); fab.hidden = true; break;
    default: renderDashboard(main); fab.dataset.action = 'open-tx-sheet';
  }
}

/* ========================================================================
   DASHBOARD
   ======================================================================== */
function renderDashboard(main) {
  const mKey = currentMonthKey();
  const inc = monthIncome(mKey);
  const exp = monthExpense(mKey);
  const saved = inc - exp;

  const wrap = el(`<div class="stack"></div>`);
  main.appendChild(wrap);

  const insights = getInsights();
  if (insights.length) {
    wrap.appendChild(el(`
      <div class="card">
        <p class="section-title">${iconSpark} &nbsp; Assistente Nubolso</p>
        <div class="stack" style="gap:10px">
          ${insights.map((i) => `
            <div class="row" style="align-items:flex-start;gap:8px">
              <span style="flex-shrink:0;line-height:1.4">${i.level === 'red' ? '🔴' : i.level === 'yellow' ? '🟡' : i.level === 'green' ? '🟢' : '💡'}</span>
              <span style="font-size:12.5px;color:var(--text-muted);line-height:1.4">${i.text}</span>
            </div>
          `).join('')}
        </div>
      </div>
    `));
  }

  wrap.appendChild(el(`
    <div class="grid-2">
      <div class="stat"><div class="label">Receitas · ${monthLabel(mKey)}</div><div class="value pos">${formatKz(inc)}</div></div>
      <div class="stat"><div class="label">Despesas · ${monthLabel(mKey)}</div><div class="value neg">${formatKz(exp)}</div></div>
      <div class="stat"><div class="label">Economia do mês</div><div class="value ${saved >= 0 ? 'pos' : 'neg'}">${formatKz(saved)}</div></div>
      <div class="stat"><div class="label">Patrimônio líquido</div><div class="value">${formatKz(netWorth())}</div></div>
    </div>
  `));

  // Fluxo dos últimos 6 meses
  const months = [5, 4, 3, 2, 1, 0].map((i) => shiftMonth(mKey, -i));
  const flowData = months.map((k) => ({ label: MONTH_NAMES[Number(k.split('-')[1]) - 1].slice(0, 3), income: monthIncome(k), expense: monthExpense(k) }));
  const flowCard = el(`<div class="card"><p class="section-title">Fluxo · últimos 6 meses <span></span></p><div id="flowChartHolder"></div>
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
  const billsCard = el(`<div class="card"><p class="section-title">Próximas contas <a href="#" data-action="nav" data-tab="contas" style="font-size:11px">ver todas ›</a></p><div class="stack" id="billsPreview"></div></div>`);
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
      <div class="card" data-action="nav" data-tab="dividas" style="cursor:pointer">
        <p class="section-title">Kilapes <span style="font-size:11px">ver todos ›</span></p>
        <div class="grid-2">
          <div class="stat"><div class="label">Eu devo</div><div class="value neg" style="font-size:15px">${formatKz(totalOwedByMe())}</div></div>
          <div class="stat"><div class="label">Me devem</div><div class="value pos" style="font-size:15px">${formatKz(totalOwedToMe())}</div></div>
        </div>
      </div>
    `));
  }

  // Metas em progresso
  if (STATE.goals.length) {
    const goalsCard = el(`<div class="card"><p class="section-title">Metas <a href="#" data-action="nav" data-tab="metas" style="font-size:11px">ver todas ›</a></p><div class="stack" id="goalsPreview"></div></div>`);
    const holder = qs('#goalsPreview', goalsCard);
    STATE.goals.slice(0, 3).forEach((g) => holder.appendChild(goalProgressRow(g)));
    wrap.appendChild(goalsCard);
  }
}

/* ========================================================================
   TRANSAÇÕES
   ======================================================================== */
function renderTransactions(main) {
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
  const filterCard = el(`<div class="card stack" style="gap:10px">
    <div class="segmented" id="txTypeFilter">
      <button class="${UI.txType === 'all' ? 'active neutral' : ''}" data-action="tx-filter-type" data-value="all">Tudo</button>
      <button class="${UI.txType === 'income' ? 'active income' : ''}" data-action="tx-filter-type" data-value="income">Receitas</button>
      <button class="${UI.txType === 'expense' ? 'active expense' : ''}" data-action="tx-filter-type" data-value="expense">Despesas</button>
    </div>
  </div>`);
  wrap.appendChild(filterCard);

  const list = txForMonth(UI.txMonth).filter((t) => UI.txType === 'all' || t.type === UI.txType);
  const incTotal = list.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const expTotal = list.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0);

  const listCard = el(`<div class="card"><p class="section-title">Lançamentos <span class="mono">${list.length}</span></p><div id="txList"></div></div>`);
  const holder = qs('#txList', listCard);
  if (!list.length) {
    holder.appendChild(el(`<div class="empty"><p class="display">Nada por aqui</p><p>Toque em + para adicionar um lançamento.</p></div>`));
  } else {
    list.forEach((t) => holder.appendChild(transactionRow(t)));
  }
  wrap.appendChild(listCard);

  wrap.appendChild(el(`
    <div class="grid-2">
      <div class="stat"><div class="label">Total receitas</div><div class="value pos">${formatKz(incTotal)}</div></div>
      <div class="stat"><div class="label">Total despesas</div><div class="value neg">${formatKz(expTotal)}</div></div>
    </div>
  `));

  main.appendChild(wrap);
}

function transactionRow(t) {
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

function openTransactionSheet(existing, forcedType) {
  const type = forcedType || (existing ? existing.type : 'expense');
  const cats = catList(type);
  const body = el(`
    <form class="stack" id="txForm">
      <div class="segmented" id="txTypeSeg">
        <button type="button" class="${type === 'income' ? 'active income' : ''}" data-type="income">Receita</button>
        <button type="button" class="${type === 'expense' ? 'active expense' : ''}" data-type="expense">Despesa</button>
      </div>
      <div class="field">
        <label>Categoria</label>
        <div class="chip-group" id="txCatChips">
          ${cats.map((c) => `<button type="button" class="chip ${existing && existing.category === c.name ? 'active' : (!existing && c === cats[0] ? 'active' : '')}" data-cat="${c.name}">${c.name}</button>`).join('')}
        </div>
      </div>
      <div class="field">
        <label>Valor (Kz)</label>
        <input type="number" inputmode="decimal" step="0.01" min="0" name="amount" placeholder="0,00" value="${existing ? existing.amount : ''}" required>
      </div>
      <div class="field">
        <label>Descrição (opcional)</label>
        <input type="text" name="description" placeholder="Ex: Almoço, Uber, Salário de Agosto" value="${existing ? escapeHtml(existing.description || '') : ''}">
      </div>
      <div class="field">
        <label>Data</label>
        <input type="date" name="date" value="${existing ? existing.date : todayISO()}" required>
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

/* ========================================================================
   ORÇAMENTO
   ======================================================================== */
function renderBudget(main) {
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

  const listCard = el(`<div class="card"><p class="section-title">Orçamento por categoria</p><div class="stack" id="budgetList"></div></div>`);
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
      <div class="stat"><div class="label">Orçado no mês</div><div class="value">${formatKz(totalLimit)}</div></div>
      <div class="stat"><div class="label">Gasto no mês</div><div class="value ${totalSpent > totalLimit && totalLimit > 0 ? 'neg' : ''}">${formatKz(totalSpent)}</div></div>
    </div>
  `));

  main.appendChild(wrap);
}

function openBudgetEditSheet(category) {
  const current = STATE.budgets[category] || '';
  const body = el(`
    <form class="stack" id="budgetForm">
      <div class="field">
        <label>Limite mensal para "${category}" (Kz)</label>
        <input type="number" inputmode="decimal" step="0.01" min="0" name="limit" value="${current}" placeholder="0,00" autofocus>
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

/* ========================================================================
   METAS
   ======================================================================== */
function goalProgressRow(g) {
  const pct = g.target > 0 ? Math.min(100, Math.round((g.current / g.target) * 100)) : 0;
  const done = g.current >= g.target && g.target > 0;
  return el(`
    <div class="stack" style="gap:6px;cursor:pointer" data-action="open-goal-sheet" data-id="${g.id}">
      <div class="row-between">
        <span style="font-size:13.5px;font-weight:500">${escapeHtml(g.name)}</span>
        ${done ? `<span class="stamp paid">Concluída</span>` : `<span class="mono" style="font-size:12px;color:var(--text-muted)">${pct}%</span>`}
      </div>
      <div class="progress"><div class="progress__fill" style="width:${pct}%;background:${done ? 'var(--emerald)' : 'var(--accent)'}"></div></div>
      <div class="row-between" style="font-size:11.5px;color:var(--text-dim)">
        <span class="mono">${formatKz(g.current)} de ${formatKz(g.target)}</span>
        ${g.deadline ? `<span>até ${g.deadline.split('-').reverse().join('/')}</span>` : ''}
      </div>
    </div>
  `);
}

function renderGoals(main) {
  const wrap = el(`<div class="stack"></div>`);
  if (!STATE.goals.length) {
    wrap.appendChild(el(`<div class="empty card"><p class="display">Nenhuma meta ainda</p><p>Toque em + para criar sua primeira meta de poupança.</p></div>`));
  } else {
    STATE.goals.forEach((g) => {
      const card = el(`<div class="card"></div>`);
      card.appendChild(goalProgressRow(g));
      wrap.appendChild(card);
    });
  }
  main.appendChild(wrap);
}

function openGoalSheet(existing) {
  const body = el(`
    <form class="stack" id="goalForm">
      <div class="field"><label>Nome da meta</label><input type="text" name="name" placeholder="Ex: Fundo de emergência" value="${existing ? escapeHtml(existing.name) : ''}" required></div>
      <div class="field"><label>Valor-alvo (Kz)</label><input type="number" step="0.01" min="0" name="target" value="${existing ? existing.target : ''}" required></div>
      <div class="field"><label>Valor já guardado (Kz)</label><input type="number" step="0.01" min="0" name="current" value="${existing ? existing.current : 0}"></div>
      <div class="field"><label>Prazo (opcional)</label><input type="date" name="deadline" value="${existing && existing.deadline ? existing.deadline : ''}"></div>
      <button type="submit" class="btn btn-accent btn-block">${existing ? 'Guardar alterações' : 'Criar meta'}</button>
      ${existing ? `
        <div class="row" style="gap:8px">
          <input type="number" step="0.01" id="contribInput" placeholder="Adicionar valor" style="flex:1;background:var(--surface-3);border:1px solid var(--border);border-radius:8px;padding:10px;color:var(--text)">
          <button type="button" class="btn" data-action="add-contribution" data-id="${existing.id}">Contribuir</button>
        </div>
        <button type="button" class="btn btn-danger btn-block" data-action="delete-goal" data-id="${existing.id}">Eliminar meta</button>
      ` : ''}
    </form>
  `);
  body.addEventListener('submit', async (e) => {
    e.preventDefault();
    const f = e.target;
    const record = {
      id: existing ? existing.id : DB.uid(),
      name: f.name.value.trim(),
      target: parseFloat(f.target.value) || 0,
      current: parseFloat(f.current.value) || 0,
      deadline: f.deadline.value || null
    };
    await DB.put('goals', record);
    await loadState();
    closeSheet();
    render();
    showToast(existing ? 'Meta atualizada' : 'Meta criada');
  });
  if (existing) {
    qs('[data-action="add-contribution"]', body).addEventListener('click', async () => {
      const input = qs('#contribInput', body);
      const val = parseFloat(input.value);
      if (!val || val <= 0) { showToast('Informe um valor válido'); return; }
      const g = STATE.goals.find((x) => x.id === existing.id);
      g.current += val;
      await DB.put('goals', g);
      await loadState();
      closeSheet();
      render();
      showToast('Contribuição adicionada');
    });
  }
  openSheet(existing ? 'Editar meta' : 'Nova meta', body);
}

/* ========================================================================
   CONTAS A PAGAR
   ======================================================================== */
function renderBills(main) {
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
    const card = el(`<div class="card"><p class="section-title">Contas do mês</p><div class="stack" id="billsList"></div></div>`);
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

function openBillSheet(existing) {
  const body = el(`
    <form class="stack" id="billForm">
      <div class="field"><label>Nome da conta</label><input type="text" name="name" placeholder="Ex: Renda, Internet, Água" value="${existing ? escapeHtml(existing.name) : ''}" required></div>
      <div class="field"><label>Valor (Kz)</label><input type="number" step="0.01" min="0" name="amount" value="${existing ? existing.amount : ''}" required></div>
      <div class="field"><label>Dia do vencimento (1-31)</label><input type="number" min="1" max="31" name="dueDay" value="${existing ? existing.dueDay : ''}" required></div>
      <div class="field">
        <label>Categoria</label>
        <div class="chip-group" id="billCatChips">
          ${catList('expense').map((c) => `<button type="button" class="chip ${existing && existing.category === c.name ? 'active' : (!existing && c === catList('expense')[0]) ? 'active' : ''}" data-cat="${c.name}">${c.name}</button>`).join('')}
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

/* ========================================================================
   DÍVIDAS & KILAPES
   ======================================================================== */
function sortDebtsForList(list) {
  return [...list].sort((a, b) => (a.settled === b.settled ? 0 : a.settled ? 1 : -1));
}

function debtRow(d) {
  const status = debtStatus(d);
  const stampCls = d.settled ? 'paid' : status;
  const stampLabel = d.settled ? 'Pago' : (status === 'overdue' ? 'Atrasado' : 'Em aberto');
  const sub = [];
  if (d.remainingAmount < d.originalAmount && !d.settled) sub.push(`de ${formatKz(d.originalAmount)}`);
  if (d.dueDate) sub.push(d.dueDate.split('-').reverse().join('/'));
  const trust = d.direction === 'a_receber' ? personTrustBadge(d.person) : null;
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

function renderDebts(main) {
  const wrap = el(`<div class="stack"></div>`);
  main.appendChild(wrap);

  wrap.appendChild(el(`
    <div class="grid-2">
      <div class="stat"><div class="label">Eu devo</div><div class="value neg">${formatKz(totalOwedByMe())}</div></div>
      <div class="stat"><div class="label">Me devem</div><div class="value pos">${formatKz(totalOwedToMe())}</div></div>
    </div>
  `));

  const receberList = sortDebtsForList(STATE.debts.filter((d) => d.direction === 'a_receber'));
  const receberCard = el(`<div class="card"><p class="section-title">Me devem <span class="mono">${receberList.length}</span></p><div class="stack" id="debtsReceberList"></div></div>`);
  wrap.appendChild(receberCard);
  const receberHolder = qs('#debtsReceberList', receberCard);
  if (!receberList.length) {
    receberHolder.appendChild(el(`<div class="empty"><p class="display">Ninguém te deve nada</p><p>Vendeste a fiado ou emprestaste dinheiro? Toca em + para registar.</p></div>`));
  } else {
    receberList.forEach((d) => receberHolder.appendChild(debtRow(d)));
  }

  const devoList = sortDebtsForList(STATE.debts.filter((d) => d.direction === 'devo'));
  const devoCard = el(`<div class="card"><p class="section-title">Eu devo <span class="mono">${devoList.length}</span></p><div class="stack" id="debtsDevoList"></div></div>`);
  wrap.appendChild(devoCard);
  const devoHolder = qs('#debtsDevoList', devoCard);
  if (!devoList.length) {
    devoHolder.appendChild(el(`<div class="empty"><p class="display">Não deves nada a ninguém</p><p>Se tens algum kilape em aberto, toca em + para registar.</p></div>`));
  } else {
    devoList.forEach((d) => devoHolder.appendChild(debtRow(d)));
  }
}

function openDebtSheet(existing, forcedDirection) {
  const direction = forcedDirection || (existing ? existing.direction : 'a_receber');
  const hasPayments = existing ? paymentsForDebt(existing.id).length > 0 : false;

  const body = el(`
    <div class="stack">
      <form class="stack" id="debtForm">
        <div class="segmented" id="debtDirSeg">
          <button type="button" class="${direction === 'a_receber' ? 'active income' : ''}" data-dir="a_receber">Me devem</button>
          <button type="button" class="${direction === 'devo' ? 'active expense' : ''}" data-dir="devo">Eu devo</button>
        </div>
        <div class="field">
          <label>${direction === 'devo' ? 'A quem devo' : 'Quem me deve'}</label>
          <input type="text" name="person" value="${existing ? escapeHtml(existing.person) : ''}" placeholder="Nome" required autofocus>
        </div>
        <div class="field">
          <label>Valor${hasPayments ? ' original' : ''} (Kz)</label>
          <input type="number" inputmode="decimal" step="0.01" min="0.01" name="amount" value="${existing ? existing.originalAmount : ''}" placeholder="0,00" ${hasPayments ? 'readonly' : ''} required>
          ${hasPayments ? `<span style="font-size:11px;color:var(--text-dim)">Já há abatimentos registados — usa "Registar abatimento" para atualizar o valor em falta.</span>` : ''}
        </div>
        <div class="field">
          <label>Data combinada (opcional)</label>
          <input type="date" name="dueDate" value="${existing && existing.dueDate ? existing.dueDate : ''}">
        </div>
        <div class="field">
          <label>Telefone (opcional, para lembrete via WhatsApp)</label>
          <input type="tel" name="phone" value="${existing && existing.phone ? escapeHtml(existing.phone) : ''}" placeholder="Ex: 244923456789">
        </div>
        <div class="field">
          <label>Nota (opcional)</label>
          <textarea name="note" placeholder="Ex: venda a fiado de roupa">${existing && existing.note ? escapeHtml(existing.note) : ''}</textarea>
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
      closeSheet();
      openDebtSheet(existing, btn.dataset.dir);
    });
  });

  qs('#debtForm', body).addEventListener('submit', async (e) => {
    e.preventDefault();
    const f = e.target;
    const activeDir = qs('#debtDirSeg button.active', body).dataset.dir;
    const amount = parseFloat(f.amount.value) || 0;
    if (amount <= 0) { showToast('Informa um valor válido'); return; }
    const record = existing ? { ...existing } : { id: DB.uid(), settled: false, settledAt: null, createdAt: todayISO() };
    record.direction = activeDir;
    record.person = f.person.value.trim();
    record.dueDate = f.dueDate.value || null;
    record.phone = f.phone.value.trim();
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

function openDebtPaymentSheet(debtId) {
  const debt = STATE.debts.find((d) => d.id === debtId);
  if (!debt) return;
  const body = el(`
    <form class="stack" id="debtPaymentForm">
      <p style="font-size:12.5px;color:var(--text-dim);margin:0">Falta pagar ${formatKz(debt.remainingAmount)} de ${formatKz(debt.originalAmount)}.</p>
      <div class="field">
        <label>Valor do abatimento (Kz)</label>
        <input type="number" inputmode="decimal" step="0.01" min="0.01" max="${debt.remainingAmount}" name="amount" value="${debt.remainingAmount}" required autofocus>
      </div>
      <div class="field">
        <label>Data</label>
        <input type="date" name="date" value="${todayISO()}">
      </div>
      <div class="field">
        <label>Nota (opcional)</label>
        <input type="text" name="note" placeholder="Ex: pagamento parcial em dinheiro">
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

/* ========================================================================
   INVESTIMENTOS
   ======================================================================== */
function renderInvestments(main) {
  const wrap = el(`<div class="stack"></div>`);
  main.appendChild(wrap);
  wrap.appendChild(el(`<div class="stat"><div class="label">Patrimônio investido</div><div class="value" style="font-size:22px">${formatKz(totalInvestments())}</div></div>`));

  if (STATE.investments.length) {
    const byType = {};
    STATE.investments.forEach((i) => { byType[i.type] = (byType[i.type] || 0) + i.value; });
    const colors = ['#c9a227', '#4fa37b', '#7a8fa6', '#c0563e', '#8b6dae', '#5ea8a0'];
    const donutData = Object.entries(byType).map(([label, value], idx) => ({ label, value, color: colors[idx % colors.length] }));
    const donutCard = el(`<div class="card"><p class="section-title">Distribuição por tipo</p><div id="invDonutHolder"></div></div>`);
    wrap.appendChild(donutCard);
    Charts.renderDonutChart(qs('#invDonutHolder', donutCard), donutData, 'Total', (v) => formatKz(v));
  }

  const listCard = el(`<div class="card"><p class="section-title">Ativos <span class="mono">${STATE.investments.length}</span></p><div class="stack" id="invList"></div></div>`);
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

function openInvestmentSheet(existing) {
  const body = el(`
    <form class="stack" id="invForm">
      <div class="field"><label>Nome do ativo</label><input type="text" name="name" placeholder="Ex: Poupança BAI, Tesouro..." value="${existing ? escapeHtml(existing.name) : ''}" required></div>
      <div class="field">
        <label>Tipo</label>
        <select name="type">
          ${INVESTMENT_TYPES.map((t) => `<option value="${t}" ${existing && existing.type === t ? 'selected' : ''}>${t}</option>`).join('')}
        </select>
      </div>
      <div class="field"><label>Valor atual (Kz)</label><input type="number" step="0.01" min="0" name="value" value="${existing ? existing.value : ''}" required></div>
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

/* ========================================================================
   RELATÓRIOS
   ======================================================================== */
function renderReports(main) {
  const wrap = el(`<div class="stack"></div>`);
  main.appendChild(wrap);

  wrap.appendChild(el(`
    <div class="row-between card">
      <button class="icon-btn" data-action="report-month-prev">${iconChevronLeft}</button>
      <strong class="display" style="font-size:15px">${monthLabel(UI.reportMonth)}</strong>
      <button class="icon-btn" data-action="report-month-next">${iconChevronRight}</button>
    </div>
  `));

  const monthTx = txForMonth(UI.reportMonth).filter((t) => t.type === 'expense');
  const byCat = {};
  monthTx.forEach((t) => { byCat[t.category] = (byCat[t.category] || 0) + t.amount; });
  const donutData = Object.entries(byCat).map(([label, value]) => ({ label, value, color: catColor(label, 'expense') }));

  const donutCard = el(`<div class="card"><p class="section-title">Despesas por categoria</p><div id="reportDonutHolder"></div></div>`);
  wrap.appendChild(donutCard);
  if (donutData.length) {
    Charts.renderDonutChart(qs('#reportDonutHolder', donutCard), donutData, 'Gasto', (v) => formatKz(v));
  } else {
    qs('#reportDonutHolder', donutCard).appendChild(el(`<p style="font-size:12.5px;color:var(--text-dim);text-align:center;padding:20px 0">Sem despesas neste mês.</p>`));
  }

  const mKey = currentMonthKey();
  const months = [5, 4, 3, 2, 1, 0].map((i) => shiftMonth(mKey, -i));
  const flowData = months.map((k) => ({ label: MONTH_NAMES[Number(k.split('-')[1]) - 1].slice(0, 3), income: monthIncome(k), expense: monthExpense(k) }));
  const flowCard = el(`<div class="card"><p class="section-title">Receitas × Despesas · 6 meses</p><div id="reportBarHolder"></div></div>`);
  wrap.appendChild(flowCard);
  Charts.renderBarChart(qs('#reportBarHolder', flowCard), flowData);

  const netData = months.map((k) => ({ label: MONTH_NAMES[Number(k.split('-')[1]) - 1].slice(0, 3), value: balanceUpToMonthEnd(k) + totalInvestments() }));
  const netCard = el(`<div class="card"><p class="section-title">Evolução do patrimônio</p><div id="reportLineHolder"></div></div>`);
  wrap.appendChild(netCard);
  Charts.renderLineChart(qs('#reportLineHolder', netCard), netData);
}

/* ========================================================================
   EXPORTAR / IMPORTAR / RESET
   ======================================================================== */
async function exportData() {
  const data = await DB.exportAll();
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `financas-backup-${todayISO()}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
  showToast('Backup exportado');
}
async function importDataFromFile(file) {
  try {
    const text = await file.text();
    const data = JSON.parse(text);
    await DB.importAll(data);
    await loadState();
    closeSheet();
    render();
    showToast('Dados importados com sucesso');
  } catch (err) {
    showToast('Arquivo inválido');
  }
}
async function wipeAllData() {
  if (!confirm('Isto apagará TODOS os dados do app permanentemente. Continuar?')) return;
  await Promise.all(['transactions', 'budgets', 'goals', 'bills', 'investments', 'categories', 'debts', 'debtPayments'].map((s) => DB.clear(s)));
  await loadState();
  closeSheet();
  render();
  showToast('Dados apagados');
}

/* ========================================================================
   AÇÕES (delegação de eventos)
   ======================================================================== */
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
    openDebtSheet(d);
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

  if (action === 'report-month-prev') { UI.reportMonth = shiftMonth(UI.reportMonth, -1); render(); return; }
  if (action === 'report-month-next') { UI.reportMonth = shiftMonth(UI.reportMonth, 1); render(); return; }

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
  if (action === 'open-purchase-advice-sheet') { openPurchaseAdviceSheet(); return; }
  if (action === 'open-pin-form') { openPinFormSheet(t.dataset.mode); return; }

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
    if (waitingWorker) waitingWorker.postMessage({ type: 'SKIP_WAITING' });
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

/* ========================================================================
   INICIALIZAÇÃO
   ======================================================================== */
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  window.deferredInstallPrompt = e;
});

function routeFromHash() {
  const h = location.hash.replace('#/', '');
  const valid = ['dashboard', 'transacoes', 'orcamento', 'metas', 'contas', 'dividas', 'investimentos', 'relatorios'];
  UI.tab = valid.includes(h) ? h : 'dashboard';
}
window.addEventListener('hashchange', () => { routeFromHash(); render(); });

/* ========================================================================
   ATUALIZAÇÃO DO APP (service worker)
   ======================================================================== */
let waitingWorker = null;

function showUpdateBanner(worker) {
  waitingWorker = worker;
  if (qs('#updateBanner')) return; // já visível
  const banner = el(`
    <div class="update-banner" id="updateBanner">
      <div class="update-banner__text">
        <strong class="display">Nova atualização disponível</strong>
        <span>Reinicie para obter as últimas melhorias.</span>
      </div>
      <div class="update-banner__actions">
        <button class="btn btn-ghost btn-sm" data-action="update-later">Depois</button>
        <button class="btn btn-accent btn-sm" data-action="update-now">Atualizar</button>
      </div>
    </div>
  `);
  document.body.appendChild(banner);
}
function hideUpdateBanner() {
  const b = qs('#updateBanner');
  if (b) b.remove();
}

(async function init() {
  routeFromHash();
  await loadState();
  render();

  // App Shortcuts (long-press no ícone) chegam com ?action=... na URL
  const shortcutAction = new URLSearchParams(location.search).get('action');
  if (shortcutAction === 'new-tx') openTransactionSheet();
  if (shortcutAction === 'new-goal') openGoalSheet();
  if (shortcutAction) {
    history.replaceState(null, '', location.pathname + location.hash);
  }

  if (STATE.security && STATE.security.pinHash) {
    showLockScreen();
  }

  if ('serviceWorker' in navigator) {
    try {
      const reg = await navigator.serviceWorker.register('./sw.js');

      // Já existe um SW novo à espera (ex: separador ficou aberto durante a atualização)
      if (reg.waiting && navigator.serviceWorker.controller) {
        showUpdateBanner(reg.waiting);
      }

      // Deteta quando um novo SW termina de instalar
      reg.addEventListener('updatefound', () => {
        const newWorker = reg.installing;
        if (!newWorker) return;
        newWorker.addEventListener('statechange', () => {
          // 'controller' só existe se já havia um SW ativo antes,
          // ou seja: isto é uma atualização, não a primeira instalação.
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            showUpdateBanner(newWorker);
          }
        });
      });

      // Verifica periodicamente se há uma nova versão publicada
      setInterval(() => reg.update().catch(() => {}), 60 * 60 * 1000);

      // Quando o novo SW assume o controlo, recarrega a página uma única vez
      let refreshing = false;
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (refreshing) return;
        refreshing = true;
        window.location.reload();
      });
    } catch (err) {
      console.warn('SW falhou:', err);
    }
  }
})();
