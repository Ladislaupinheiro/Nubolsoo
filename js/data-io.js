/* =========================================================
   data-io.js — Exportação, importação e limpeza de todos os dados da app.
   ========================================================= */

import { todayISO } from './core/format.js';
import { loadState } from './core/state.js';
import { render } from './router.js';
import { closeSheet } from './ui/sheet.js';
import { showToast } from './ui/toast.js';

export async function exportData() {
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

export async function importDataFromFile(file) {
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

export async function wipeAllData() {
  if (!confirm('Isto apagará TODOS os dados do app permanentemente. Continuar?')) return;
  await Promise.all(['transactions', 'budgets', 'goals', 'bills', 'investments', 'categories', 'debts', 'debtPayments', 'people'].map((s) => DB.clear(s)));
  await loadState();
  closeSheet();
  render();
  showToast('Dados apagados');
}
