/* =========================================================
   views/nav.js — Navegação principal: barra lateral, barra inferior, troca de separador e menu "mais".
   ========================================================= */

import { NAV_ITEMS, SIDEBAR_ITEMS, THEME_LABELS } from '../core/constants.js';
import { el, escapeHtml, qs } from '../core/dom.js';
import { iconChevronRight, iconDownload, iconHandshake, iconLock, iconMoon, iconMore, iconReceipt, iconSun, iconTag, iconTarget, iconTrash, iconTrend, iconUpload, iconUsers } from '../core/icons.js';
import { STATE, UI } from '../core/state.js';
import { render } from '../router.js';
import { openSheet } from '../ui/sheet.js';
import { avatarHtml } from '../ui/widgets.js';

export function renderSidebar() {
  const sidebar = qs('#sidebar');
  if (!sidebar) return;
  sidebar.innerHTML = `
    <div class="sidebar__brand">💼 Nubolso</div>
    <div class="sidebar__nav">
      ${SIDEBAR_ITEMS.map((item) => `
        <button class="sidebar__item ${UI.tab === item.id ? 'active' : ''}" data-action="nav" data-tab="${item.id}">
          ${item.icon}<span>${item.label}</span>
        </button>
      `).join('')}
    </div>
    <div class="sidebar__footer">
      <button class="sidebar__item ${UI.tab === 'mais' ? 'active' : ''}" data-action="nav" data-tab="mais">${iconMore}<span>Mais</span></button>
    </div>
  `;
}

export function renderBottomNav() {
  const nav = qs('#bottomnav');
  nav.innerHTML = NAV_ITEMS.map((item) => `
    <button class="bottomnav__item ${UI.tab === item.id ? 'active' : ''}" data-action="nav" data-tab="${item.id}">
      ${item.icon}
      <span>${item.label}</span>
    </button>
  `).join('');
}

export function setTab(tab) {
  if (tab === 'mais') { openMoreSheet(); return; }
  UI.tab = tab;
  location.hash = '#/' + tab;
  render();
}

export function moreRow(iconSvg, label, dataAttrs, meta) {
  const attrs = Object.entries(dataAttrs).map(([k, v]) => `data-${k}="${v}"`).join(' ');
  return `
    <button type="button" class="menu-row" ${attrs}>
      <span class="menu-row__icon">${iconSvg}</span>
      <span class="menu-row__label">${label}</span>
      ${meta ? `<span class="menu-row__meta">${meta}</span>` : ''}
      ${iconChevronRight}
    </button>
  `;
}

export function openMoreSheet() {
  const profile = STATE.profile || {};
  const body = el(`
    <div class="stack">
      <button type="button" class="profile-card" data-action="open-profile-sheet">
        ${avatarHtml(profile.photo, profile.name, 'avatar--md')}
        <div class="profile-card__body">
          <strong>${profile.name ? escapeHtml(profile.name) : 'Adicionar o teu nome'}</strong>
          <span>Editar perfil</span>
        </div>
        ${iconChevronRight}
      </button>

      <div class="menu-group">
        <p class="menu-group__title">Navegação</p>
        <div class="menu-list glass-menu">
          ${moreRow(iconReceipt, 'Contas a pagar', { action: 'nav-more', tab: 'contas' })}
          ${moreRow(iconHandshake, 'Dívidas & Kilapes', { action: 'nav-more', tab: 'dividas' })}
          ${moreRow(iconUsers, 'Pessoas', { action: 'open-people-sheet' }, STATE.people.length ? String(STATE.people.length) : '')}
          ${moreRow(iconTrend, 'Investimentos', { action: 'nav-more', tab: 'investimentos' })}
          ${moreRow(iconTarget, 'Metas', { action: 'nav-more', tab: 'metas' })}
        </div>
      </div>

      <div class="menu-group">
        <p class="menu-group__title">Preferências</p>
        <div class="menu-list glass-menu">
          ${moreRow(UI.themeResolved === 'light' ? iconSun : iconMoon, 'Aparência', { action: 'open-theme-sheet' }, THEME_LABELS[UI.themePref] || '')}
          ${moreRow(iconTag, 'Categorias', { action: 'open-categories-sheet' })}
          ${moreRow(iconLock, 'Segurança', { action: 'open-security-sheet' }, STATE.security ? 'PIN ativo' : '')}
        </div>
      </div>

      <div class="menu-group">
        <p class="menu-group__title">Dados</p>
        <div class="menu-list glass-menu">
          ${moreRow(iconDownload, 'Exportar dados (JSON)', { action: 'export-data' })}
          ${moreRow(iconUpload, 'Importar dados', { action: 'trigger-import' })}
          <button type="button" class="menu-row hidden" id="installBtn" data-action="install-app">
            <span class="menu-row__icon">${iconDownload}</span>
            <span class="menu-row__label">Instalar aplicativo</span>
            ${iconChevronRight}
          </button>
        </div>
        <input type="file" id="importInput" accept="application/json" class="hidden">
      </div>

      <div class="menu-group">
        <div class="menu-list glass-menu">
          <button type="button" class="menu-row danger" data-action="wipe-data">
            <span class="menu-row__icon">${iconTrash}</span>
            <span class="menu-row__label">Apagar todos os dados</span>
          </button>
        </div>
      </div>
    </div>
  `);
  openSheet('Mais opções', body);
  if (window.deferredInstallPrompt) qs('#installBtn', body).classList.remove('hidden');
}
