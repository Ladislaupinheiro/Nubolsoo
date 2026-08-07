/* =========================================================
   views/topbar.js — Renderização da barra superior (perfil + saldo total).
   ========================================================= */

import { escapeHtml, qs } from '../core/dom.js';
import { totalBalance } from '../core/finance-selectors.js';
import { formatKz } from '../core/format.js';
import { STATE } from '../core/state.js';
import { avatarHtml } from '../ui/widgets.js';

export function renderTopbar() {
  const bal = totalBalance();
  const topbar = qs('#topbar');
  const profile = STATE.profile || {};
  topbar.innerHTML = `
    <div class="topbar__row">
      <button type="button" class="topbar__profile" data-action="open-profile-sheet">
        ${avatarHtml(profile.photo, profile.name, 'avatar--sm')}
        <span class="topbar__profile-name">${profile.name ? escapeHtml(profile.name) : 'Meu perfil'}</span>
      </button>
      <div class="topbar__actions">
        <div class="topbar__balance">
          <span class="label">Saldo total</span>
          <span class="value mono ${bal >= 0 ? 'pos' : 'neg'}">${formatKz(bal)}</span>
        </div>
      </div>
    </div>
  `;
}
