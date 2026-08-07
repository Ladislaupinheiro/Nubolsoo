/* =========================================================
   views/security-sheet.js — Definições de segurança (PIN) e ecrã de bloqueio.
   ========================================================= */

import { el, qs, qsa } from '../core/dom.js';
import { iconLock } from '../core/icons.js';
import { hashPin, randomSalt } from '../core/security.js';
import { STATE } from '../core/state.js';
import { closeSheet, openSheet } from '../ui/sheet.js';
import { showToast } from '../ui/toast.js';

export function openSecuritySheet() {
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

export function openPinFormSheet(mode) {
  const needsCurrent = mode === 'change' || mode === 'disable';
  const needsNew = mode === 'create' || mode === 'change';
  const body = el(`
    <form class="stack" id="pinForm">
      ${needsCurrent ? `<div class="field"><label>PIN atual</label><input class="glass-input" type="password" inputmode="numeric" pattern="[0-9]{4}" maxlength="4" name="current" required autofocus></div>` : ''}
      ${needsNew ? `
        <div class="field"><label>${mode === 'change' ? 'Novo PIN' : 'PIN'} (4 dígitos)</label><input class="glass-input" type="password" inputmode="numeric" pattern="[0-9]{4}" maxlength="4" name="pin1" required ${needsCurrent ? '' : 'autofocus'}></div>
        <div class="field"><label>Confirmar PIN</label><input class="glass-input" type="password" inputmode="numeric" pattern="[0-9]{4}" maxlength="4" name="pin2" required></div>
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

export function showLockScreen() {
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
