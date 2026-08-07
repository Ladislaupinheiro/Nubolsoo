/* =========================================================
   views/goals.js — Vista de Metas de poupança.
   ========================================================= */

import { el, escapeHtml, qs } from '../core/dom.js';
import { formatKz } from '../core/format.js';
import { STATE, loadState } from '../core/state.js';
import { render } from '../router.js';
import { closeSheet, openSheet } from '../ui/sheet.js';
import { showToast } from '../ui/toast.js';

export function goalProgressRow(g) {
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

export function renderGoals(main) {
  const wrap = el(`<div class="stack"></div>`);
  if (!STATE.goals.length) {
    wrap.appendChild(el(`<div class="empty card"><p class="display">Nenhuma meta ainda</p><p>Toque em + para criar sua primeira meta de poupança.</p></div>`));
  } else {
    STATE.goals.forEach((g) => {
      const card = el(`<div class="card glass-card"></div>`);
      card.appendChild(goalProgressRow(g));
      wrap.appendChild(card);
    });
  }
  main.appendChild(wrap);
}

export function openGoalSheet(existing) {
  const body = el(`
    <form class="stack" id="goalForm">
      <div class="field"><label>Nome da meta</label><input class="glass-input" type="text" name="name" placeholder="Ex: Fundo de emergência" value="${existing ? escapeHtml(existing.name) : ''}" required></div>
      <div class="field"><label>Valor-alvo (Kz)</label><input class="glass-input" type="number" step="0.01" min="0" name="target" value="${existing ? existing.target : ''}" required></div>
      <div class="field"><label>Valor já guardado (Kz)</label><input class="glass-input" type="number" step="0.01" min="0" name="current" value="${existing ? existing.current : 0}"></div>
      <div class="field"><label>Prazo (opcional)</label><input class="glass-input" type="date" name="deadline" value="${existing && existing.deadline ? existing.deadline : ''}"></div>
      <button type="submit" class="btn btn-accent btn-block">${existing ? 'Guardar alterações' : 'Criar meta'}</button>
      ${existing ? `
        <div class="row" style="gap:8px">
          <input class="glass-input" type="number" step="0.01" id="contribInput" placeholder="Adicionar valor" style="flex:1;background:var(--surface-3);border:1px solid var(--border);border-radius:8px;padding:10px;color:var(--text)">
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
