/* =========================================================
   app.js — lógica principal do PWA de Finanças Pessoais
   Vanilla JS puro. Sem dependências externas.
   ========================================================= */

/* ----------------------- Constantes ----------------------- */
const EXPENSE_CATS = [
  { name: 'Alimentação', color: '#c9a227' },
  { name: 'Transporte', color: '#4fa37b' },
  { name: 'Moradia', color: '#7a8fa6' },
  { name: 'Saúde', color: '#c0563e' },
  { name: 'Educação', color: '#8b6dae' },
  { name: 'Lazer', color: '#d4915d' },
  { name: 'Compras', color: '#5ea8a0' },
  { name: 'Outros', color: '#8fa396' }
];
const INCOME_CATS = [
  { name: 'Salário', color: '#4fa37b' },
  { name: 'Freelance', color: '#6fb88a' },
  { name: 'Investimentos', color: '#c9a227' },
  { name: 'Outros', color: '#8fa396' }
];
const INVESTMENT_TYPES = ['Poupança', 'Ações', 'Fundos', 'Imóveis', 'Criptomoeda', 'Outros'];
const MONTH_NAMES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

/* ----------------------- Estado global ----------------------- */
let STATE = { transactions: [], budgets: {}, goals: [], bills: [], investments: [] };
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
  const list = type === 'income' ? INCOME_CATS : EXPENSE_CATS;
  const found = list.find((c) => c.name === name);
  return found ? found.color : '#8fa396';
}
function catList(type) { return type === 'income' ? INCOME_CATS : EXPENSE_CATS; }

/* ----------------------- Consultas derivadas do estado ----------------------- */
function txForMonth(key) { return STATE.transactions.filter((t) => t.date.slice(0, 7) === key); }
function monthIncome(key) { return txForMonth(key).filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0); }
function monthExpense(key) { return txForMonth(key).filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0); }
function totalBalance() { return STATE.transactions.reduce((s, t) => s + (t.type === 'income' ? t.amount : -t.amount), 0); }
function totalInvestments() { return STATE.investments.reduce((s, i) => s + i.value, 0); }
function netWorth() { return totalBalance() + totalInvestments(); }
function balanceUpToMonthEnd(key) {
  return STATE.transactions
    .filter((t) => t.date.slice(0, 7) <= key)
    .reduce((s, t) => s + (t.type === 'income' ? t.amount : -t.amount), 0);
}

/* ----------------------- Carregamento inicial ----------------------- */
async function loadState() {
  const [transactions, budgetsArr, goals, bills, investments] = await Promise.all([
    DB.getAll('transactions'), DB.getAll('budgets'), DB.getAll('goals'), DB.getAll('bills'), DB.getAll('investments')
  ]);
  STATE.transactions = transactions.sort((a, b) => (b.date + b.id).localeCompare(a.date + a.id));
  STATE.budgets = {};
  budgetsArr.forEach((b) => { STATE.budgets[b.category] = b.limit; });
  STATE.goals = goals;
  STATE.bills = bills.sort((a, b) => a.dueDay - b.dueDay);
  STATE.investments = investments;
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
      <button class="btn btn-block" style="justify-content:flex-start" data-action="nav-more" data-tab="investimentos">${iconTrend} &nbsp; Investimentos</button>
      <button class="btn btn-block" style="justify-content:flex-start" data-action="nav-more" data-tab="relatorios">${iconChart} &nbsp; Relatórios</button>
      <hr class="rule">
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
  qs('#flowChartHolder', flowCard).appendChild(Charts.buildBarChart(flowData));

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

  // Metas em progresso
  if (STATE.goals.length) {
    const goalsCard = el(`<div class="card"><p class="section-title">Metas <a href="#" data-action="nav" data-tab="metas" style="font-size:11px">ver todas ›</a></p><div class="stack" id="goalsPreview"></div></div>`);
    const holder = qs('#goalsPreview', goalsCard);
    STATE.goals.slice(0, 3).forEach((g) => holder.appendChild(goalProgressRow(g)));
    wrap.appendChild(goalsCard);
  }

  main.appendChild(wrap);
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

  EXPENSE_CATS.forEach((cat) => {
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
          ${EXPENSE_CATS.map((c) => `<button type="button" class="chip ${existing && existing.category === c.name ? 'active' : (!existing && c === EXPENSE_CATS[0]) ? 'active' : ''}" data-cat="${c.name}">${c.name}</button>`).join('')}
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
      category: activeChip ? activeChip.dataset.cat : EXPENSE_CATS[0].name,
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
   INVESTIMENTOS
   ======================================================================== */
function renderInvestments(main) {
  const wrap = el(`<div class="stack"></div>`);
  wrap.appendChild(el(`<div class="stat"><div class="label">Patrimônio investido</div><div class="value" style="font-size:22px">${formatKz(totalInvestments())}</div></div>`));

  if (STATE.investments.length) {
    const byType = {};
    STATE.investments.forEach((i) => { byType[i.type] = (byType[i.type] || 0) + i.value; });
    const colors = ['#c9a227', '#4fa37b', '#7a8fa6', '#c0563e', '#8b6dae', '#5ea8a0'];
    const donutData = Object.entries(byType).map(([label, value], idx) => ({ label, value, color: colors[idx % colors.length] }));
    const donutCard = el(`<div class="card"><p class="section-title">Distribuição por tipo</p><div id="invDonutHolder"></div></div>`);
    wrap.appendChild(donutCard);
    donutCard.querySelector('#invDonutHolder').appendChild(Charts.buildDonutChart(donutData, 'Total', (v) => formatKz(v)));
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
  main.appendChild(wrap);
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
    qs('#reportDonutHolder', donutCard).appendChild(Charts.buildDonutChart(donutData, 'Gasto', (v) => formatKz(v)));
  } else {
    qs('#reportDonutHolder', donutCard).appendChild(el(`<p style="font-size:12.5px;color:var(--text-dim);text-align:center;padding:20px 0">Sem despesas neste mês.</p>`));
  }

  const mKey = currentMonthKey();
  const months = [5, 4, 3, 2, 1, 0].map((i) => shiftMonth(mKey, -i));
  const flowData = months.map((k) => ({ label: MONTH_NAMES[Number(k.split('-')[1]) - 1].slice(0, 3), income: monthIncome(k), expense: monthExpense(k) }));
  const flowCard = el(`<div class="card"><p class="section-title">Receitas × Despesas · 6 meses</p><div id="reportBarHolder"></div></div>`);
  wrap.appendChild(flowCard);
  qs('#reportBarHolder', flowCard).appendChild(Charts.buildBarChart(flowData));

  const netData = months.map((k) => ({ label: MONTH_NAMES[Number(k.split('-')[1]) - 1].slice(0, 3), value: balanceUpToMonthEnd(k) + totalInvestments() }));
  const netCard = el(`<div class="card"><p class="section-title">Evolução do patrimônio</p><div id="reportLineHolder"></div></div>`);
  wrap.appendChild(netCard);
  qs('#reportLineHolder', netCard).appendChild(Charts.buildLineChart(netData));

  main.appendChild(wrap);
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
  await Promise.all(['transactions', 'budgets', 'goals', 'bills', 'investments'].map((s) => DB.clear(s)));
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
  const valid = ['dashboard', 'transacoes', 'orcamento', 'metas', 'contas', 'investimentos', 'relatorios'];
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
