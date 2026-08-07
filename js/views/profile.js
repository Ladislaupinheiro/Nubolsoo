/* =========================================================
   views/profile.js — Folha de edição do perfil do utilizador.
   ========================================================= */

import { el, escapeHtml, qs } from '../core/dom.js';
import { iconCamera } from '../core/icons.js';
import { STATE } from '../core/state.js';
import { closeSheet, openSheet } from '../ui/sheet.js';
import { showToast } from '../ui/toast.js';
import { avatarHtml, fileToResizedDataUrl } from '../ui/widgets.js';
import { renderTopbar } from './topbar.js';

export function openProfileSheet() {
  const profile = STATE.profile || {};
  let pendingPhoto = profile.photo || null;

  const body = el(`
    <form class="stack" id="profileForm">
      <div class="photo-picker">
        <div id="profilePhotoPreview">${avatarHtml(pendingPhoto, profile.name, 'avatar--lg')}</div>
        <div class="row" style="gap:8px">
          <button type="button" class="btn btn-sm" id="profilePhotoBtn">${iconCamera} &nbsp; ${pendingPhoto ? 'Trocar foto' : 'Adicionar foto'}</button>
          <button type="button" class="btn btn-sm btn-danger ${pendingPhoto ? '' : 'hidden'}" id="profilePhotoRemove">Remover</button>
        </div>
        <input type="file" accept="image/*" id="profilePhotoInput" class="hidden">
      </div>
      <div class="field">
        <label>O teu nome</label>
        <input class="glass-input" type="text" name="name" value="${profile.name ? escapeHtml(profile.name) : ''}" placeholder="Como te chamas?" autofocus>
      </div>
      <button type="submit" class="btn btn-accent btn-block">Guardar</button>
    </form>
  `);

  const refreshPreview = () => {
    qs('#profilePhotoPreview', body).innerHTML = avatarHtml(pendingPhoto, qs('[name="name"]', body).value, 'avatar--lg');
    qs('#profilePhotoRemove', body).classList.toggle('hidden', !pendingPhoto);
    qs('#profilePhotoBtn', body).innerHTML = `${iconCamera} &nbsp; ${pendingPhoto ? 'Trocar foto' : 'Adicionar foto'}`;
  };

  qs('#profilePhotoBtn', body).addEventListener('click', () => qs('#profilePhotoInput', body).click());
  qs('#profilePhotoInput', body).addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      pendingPhoto = await fileToResizedDataUrl(file);
      refreshPreview();
    } catch (err) {
      showToast('Não foi possível carregar essa imagem');
    }
  });
  qs('#profilePhotoRemove', body).addEventListener('click', () => {
    pendingPhoto = null;
    refreshPreview();
  });

  body.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = e.target.name.value.trim();
    const record = { key: 'profile', name, photo: pendingPhoto };
    await DB.put('settings', record);
    STATE.profile = record;
    closeSheet();
    renderTopbar();
    showToast('Perfil atualizado');
  });

  openSheet('Meu perfil', body);
}
