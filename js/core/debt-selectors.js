/* =========================================================
   core/debt-selectors.js — Cálculos e helpers derivados do STATE relativos a dívidas/kilapes e pessoas.
   ========================================================= */

import { formatKz, todayISO } from './format.js';
import { STATE } from './state.js';

/* ----------------------- Dívidas & Kilapes ----------------------- */
export function debtsByDirection(direction) { return STATE.debts.filter((d) => d.direction === direction && !d.settled); }

export function totalOwedByMe() { return debtsByDirection('devo').reduce((s, d) => s + d.remainingAmount, 0); }

export function totalOwedToMe() { return debtsByDirection('a_receber').reduce((s, d) => s + d.remainingAmount, 0); }

export function paymentsForDebt(debtId) {
  return STATE.debtPayments.filter((p) => p.debtId === debtId).sort((a, b) => b.date.localeCompare(a.date));
}

export function debtStatus(d) {
  if (d.settled) return 'paid';
  if (!d.dueDate) return 'pending';
  return d.dueDate < todayISO() ? 'overdue' : 'pending';
}

/** Score de confiança: com base no histórico de kilapes já liquidados desta pessoa (só faz sentido para "a_receber") */
export function personTrustBadge(d) {
  const settledOnes = STATE.debts.filter((x) => x.direction === 'a_receber' && x.settled &&
    (d.personId ? x.personId === d.personId : x.person === d.person));
  if (settledOnes.length < 2) return null; // histórico curto demais para dizer algo útil
  const onTime = settledOnes.filter((x) => !x.dueDate || !x.settledAt || x.settledAt <= x.dueDate).length;
  const ratio = onTime / settledOnes.length;
  if (ratio >= 0.8) return { label: 'Bom pagador', cls: 'paid' };
  if (ratio >= 0.5) return { label: 'Pagamentos irregulares', cls: 'pending' };
  return { label: 'Atrasos frequentes', cls: 'overdue' };
}

/* ----------------------- Pessoas ----------------------- */
export function personById(id) { return STATE.people.find((p) => p.id === id) || null; }

/** Dívidas ligadas a uma pessoa — por personId (novos registos) ou por nome (registos antigos, sem pessoa formal). */
export function debtsForPerson(person) {
  return STATE.debts.filter((d) => (d.personId ? d.personId === person.id : d.person === person.name));
}

export function personOwedToMe(person) {
  return debtsForPerson(person).filter((d) => d.direction === 'a_receber' && !d.settled).reduce((s, d) => s + d.remainingAmount, 0);
}

export function personOwedByMe(person) {
  return debtsForPerson(person).filter((d) => d.direction === 'devo' && !d.settled).reduce((s, d) => s + d.remainingAmount, 0);
}

export function personInitial(name) { return (name || '?').trim().charAt(0).toUpperCase(); }

export function whatsappReminderUrl(debt) {
  const valor = formatKz(debt.remainingAmount);
  const prazo = debt.dueDate ? ` combinado para ${debt.dueDate.split('-').reverse().join('/')}` : ' que ficou combinado';
  const msg = `Olá ${debt.person}! Só a passar para lembrar do valor de ${valor}${prazo}. Qualquer coisa, fala comigo. Obrigado(a)! 🙂`;
  const digits = (debt.phone || '').replace(/\D/g, '');
  return digits ? `https://wa.me/${digits}?text=${encodeURIComponent(msg)}` : `https://wa.me/?text=${encodeURIComponent(msg)}`;
}

export function sortDebtsForList(list) {
  return [...list].sort((a, b) => (a.settled === b.settled ? 0 : a.settled ? 1 : -1));
}
