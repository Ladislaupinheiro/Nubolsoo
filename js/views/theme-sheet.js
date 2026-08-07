/* =========================================================
   views/theme-sheet.js — Folha de seleção de tema (Aparência), acedida a partir das definições.
   ========================================================= */

import { el } from '../core/dom.js';
import { iconAuto, iconCheck, iconMoon, iconSun } from '../core/icons.js';
import { getStoredThemePref } from '../core/theme.js';
import { openSheet } from '../ui/sheet.js';

export function openThemeSheet() {
  const pref = getStoredThemePref();
  const options = [
    { key: 'light', label: 'Claro', icon: iconSun },
    { key: 'dark', label: 'Escuro', icon: iconMoon },
    { key: 'system', label: 'Automático', icon: iconAuto, sub: 'Segue o sistema' }
  ];
  const body = el(`
    <div class="stack">
      <p style="font-size:12.5px;color:var(--text-dim)">Escolhe a aparência do Nubolso neste dispositivo.</p>
      <div class="menu-list glass-menu">
        ${options.map((o) => `
          <button type="button" class="menu-row ${pref === o.key ? 'active-row' : ''}" data-action="set-theme" data-theme="${o.key}">
            <span class="menu-row__icon">${o.icon}</span>
            <span class="menu-row__label">${o.label}${o.sub ? `<span>${o.sub}</span>` : ''}</span>
            ${pref === o.key ? iconCheck : ''}
          </button>
        `).join('')}
      </div>
    </div>
  `);
  openSheet('Aparência', body);
}
