/* =========================================================
   core/format.js — Formatação e utilitários de datas/moeda. Sem acesso a DOM ou STATE.
   ========================================================= */

import { MONTH_NAMES } from './constants.js';

export function formatKz(v) {
  const sign = v < 0 ? '-' : '';
  const abs = Math.abs(v || 0);
  const parts = abs.toFixed(2).split('.');
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${sign}Kz ${parts[0]},${parts[1]}`;
}

export function todayISO() { return new Date().toISOString().slice(0, 10); }

export function currentMonthKey() { return new Date().toISOString().slice(0, 7); }

export function monthLabel(key) {
  const [y, m] = key.split('-').map(Number);
  return `${MONTH_NAMES[m - 1]} ${y}`;
}

export function shiftMonth(key, delta) {
  let [y, m] = key.split('-').map(Number);
  m += delta;
  while (m < 1) { m += 12; y--; }
  while (m > 12) { m -= 12; y++; }
  return `${y}-${String(m).padStart(2, '0')}`;
}

export function daysInMonth(key) {
  const [y, m] = key.split('-').map(Number);
  return new Date(y, m, 0).getDate();
}

export function monthsBack(n, endKey) {
  const end = endKey || currentMonthKey();
  const arr = [];
  for (let i = n - 1; i >= 0; i--) arr.push(shiftMonth(end, -i));
  return arr;
}

export function monthShortLabel(key) { return MONTH_NAMES[Number(key.split('-')[1]) - 1].slice(0, 3); }
