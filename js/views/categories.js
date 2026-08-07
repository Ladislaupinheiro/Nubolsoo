/* =========================================================
   views/categories.js — Gestão de categorias: listagem e formulário de criação/edição.
   ========================================================= */

import { CATEGORY_PALETTE } from '../core/constants.js';
import { el, escapeHtml, qs, qsa } from '../core/dom.js';
import { catList } from '../core/finance-selectors.js';
import { STATE, loadState } from '../core/state.js';
import { render } from '../router.js';
import { closeSheet, openSheet } from '../ui/sheet.js';
import { showToast } from '../ui/toast.js';
import { catDotHtml } from '../ui/widgets.js';

export function categoryRow(c) {
  return el(`
    <div class="list-item" data-action="open-category-sheet" data-id="${c.id}" style="cursor:pointer">
      ${catDotHtml(c.name, c.type)}
      <div class="list-item__body"><div class="list-item__title">${escapeHtml(c.name)}</div></div>
    </div>
  `);
}

export function openCategoriesSheet() {
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

export function openCategorySheet(existing, forcedType) {
  const type = forcedType || (existing ? existing.type : 'expense');
  const body = el(`
    <form class="stack" id="categoryForm">
      <div class="segmented glass-segmented" id="catTypeSeg">
        <button type="button" class="${type === 'expense' ? 'active expense' : ''}" data-type="expense">Despesa</button>
        <button type="button" class="${type === 'income' ? 'active income' : ''}" data-type="income">Receita</button>
      </div>
      <div class="field">
        <label>Nome da categoria</label>
        <input class="glass-input" type="text" name="name" placeholder="Ex: Assinaturas" value="${existing ? escapeHtml(existing.name) : ''}" maxlength="24" required autofocus>
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
