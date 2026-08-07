/* =========================================================
   core/theme.js — Leitura/escrita da preferência de tema e resolução claro/escuro/automático.
   ========================================================= */

import { THEME_STORAGE_KEY } from './constants.js';
import { qs } from './dom.js';
import { UI } from './state.js';
import { renderTopbar } from '../views/topbar.js';

export function getStoredThemePref() {
  try { return localStorage.getItem(THEME_STORAGE_KEY) || 'system'; } catch (e) { return 'system'; }
}

export function resolveTheme(pref) {
  if (pref === 'system') {
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
  }
  return pref;
}

export function applyTheme(pref) {
  const resolved = resolveTheme(pref);
  document.documentElement.setAttribute('data-theme', resolved);
  const meta = qs('meta[name="theme-color"]');
  if (meta) meta.content = resolved === 'light' ? '#fbfcfe' : '#121316';
  UI.themePref = pref;
  UI.themeResolved = resolved;
}

export function setThemePref(pref) {
  try { localStorage.setItem(THEME_STORAGE_KEY, pref); } catch (e) {}
  applyTheme(pref);
  renderTopbar();
}
