/* =========================================================
   views/people.js — Gestão de pessoas associadas a dívidas.
   ========================================================= */

import { debtsForPerson, personById, personOwedByMe, personOwedToMe, sortDebtsForList } from '../core/debt-selectors.js';
import { el, escapeHtml, qs } from '../core/dom.js';
import { formatKz, todayISO } from '../core/format.js';
import { iconCamera, iconPlus } from '../core/icons.js';
import { STATE, loadState } from '../core/state.js';
import { closeSheet, openSheet } from '../ui/sheet.js';
import { showToast } from '../ui/toast.js';
import { avatarHtml, fileToResizedDataUrl } from '../ui/widgets.js';
import { debtRow } from './debts.js';

export function personRow(p) {
  const toMe = personOwedToMe(p);
  const byMe = personOwedByMe(p);
  const net = toMe - byMe;
  const sub = [];
  if (toMe > 0) sub.push(`me deve ${formatKz(toMe)}`);
  if (byMe > 0) sub.push(`devo ${formatKz(byMe)}`);
  return el(`
    <div class="list-item" data-action="open-person-detail" data-id="${p.id}" style="cursor:pointer">
      ${avatarHtml(p.photo, p.name)}
      <div class="list-item__body">
        <div class="list-item__title">${escapeHtml(p.name)}</div>
        <div class="list-item__sub">${sub.join(' · ') || 'Sem kilapes em aberto'}</div>
      </div>
      ${net !== 0 ? `<div class="list-item__amount ${net > 0 ? 'pos' : 'neg'}">${formatKz(net)}</div>` : ''}
    </div>
  `);
}

export function openPeopleSheet() {
  const body = el(`
    <div class="stack">
      <button type="button" class="btn btn-block" data-action="open-person-sheet">${iconPlus} &nbsp; Nova pessoa</button>
      <div class="stack" id="peopleList"></div>
    </div>
  `);
  const holder = qs('#peopleList', body);
  if (!STATE.people.length) {
    holder.appendChild(el(`<div class="empty"><p class="display">Ainda sem pessoas</p><p>Cria uma pessoa para atrelar kilapes que ela te deve ou que tu lhe deves.</p></div>`));
  } else {
    STATE.people.forEach((p) => holder.appendChild(personRow(p)));
  }
  openSheet('Pessoas', body);
}

export function openPersonDetailSheet(personId) {
  const person = personById(personId);
  if (!person) { openPeopleSheet(); return; }
  const debts = sortDebtsForList(debtsForPerson(person));
  const toMe = personOwedToMe(person);
  const byMe = personOwedByMe(person);

  const body = el(`
    <div class="stack">
      <div class="row" style="align-items:center;gap:12px">
        ${avatarHtml(person.photo, person.name, 'avatar--md')}
        <div class="stack" style="gap:2px">
          <strong style="font-size:15px">${escapeHtml(person.name)}</strong>
          ${person.phone ? `<span style="font-size:12px;color:var(--text-dim)">${escapeHtml(person.phone)}</span>` : ''}
        </div>
      </div>
      <div class="grid-2">
        <div class="stat glass-stat"><div class="label">Me deve</div><div class="value pos">${formatKz(toMe)}</div></div>
        <div class="stat glass-stat"><div class="label">Eu devo</div><div class="value neg">${formatKz(byMe)}</div></div>
      </div>
      <div class="row" style="gap:8px">
        <button type="button" class="btn" style="flex:1" data-action="open-debt-sheet" data-dir="a_receber" data-person-id="${person.id}">+ Me deve</button>
        <button type="button" class="btn" style="flex:1" data-action="open-debt-sheet" data-dir="devo" data-person-id="${person.id}">+ Eu devo</button>
      </div>
      ${person.note ? `<p style="font-size:12.5px;color:var(--text-muted);margin:0">${escapeHtml(person.note)}</p>` : ''}
      <hr class="rule">
      <p class="section-title" style="margin:0">Kilapes <span class="mono">${debts.length}</span></p>
      <div class="stack" id="personDebtsList"></div>
      <hr class="rule">
      <div class="row" style="gap:8px">
        <button type="button" class="btn" style="flex:1" data-action="open-person-sheet" data-id="${person.id}">Editar pessoa</button>
        <button type="button" class="btn btn-danger" style="flex:1" data-action="delete-person" data-id="${person.id}">Eliminar</button>
      </div>
    </div>
  `);
  const holder = qs('#personDebtsList', body);
  if (!debts.length) {
    holder.appendChild(el(`<div class="empty"><p>Sem kilapes registados para esta pessoa.</p></div>`));
  } else {
    debts.forEach((d) => holder.appendChild(debtRow(d)));
  }
  openSheet('Pessoa', body);
}

export function openPersonSheet(existing, onSaved) {
  let pendingPhoto = (existing && existing.photo) || null;
  const body = el(`
    <form class="stack" id="personForm">
      <div class="photo-picker">
        <div id="personPhotoPreview">${avatarHtml(pendingPhoto, existing ? existing.name : '', 'avatar--lg')}</div>
        <div class="row" style="gap:8px">
          <button type="button" class="btn btn-sm" id="personPhotoBtn">${iconCamera} &nbsp; ${pendingPhoto ? 'Trocar foto' : 'Adicionar foto'}</button>
          <button type="button" class="btn btn-sm btn-danger ${pendingPhoto ? '' : 'hidden'}" id="personPhotoRemove">Remover</button>
        </div>
        <input type="file" accept="image/*" id="personPhotoInput" class="hidden">
      </div>
      <div class="field">
        <label>Nome</label>
        <input class="glass-input" type="text" name="name" value="${existing ? escapeHtml(existing.name) : ''}" placeholder="Nome da pessoa" required autofocus>
      </div>
      <div class="field">
        <label>Telefone (opcional, para lembrete via WhatsApp)</label>
        <input class="glass-input" type="tel" name="phone" value="${existing && existing.phone ? escapeHtml(existing.phone) : ''}" placeholder="Ex: 244923456789">
      </div>
      <div class="field">
        <label>Nota (opcional)</label>
        <textarea class="glass-textarea" name="note" placeholder="Ex: colega de trabalho">${existing && existing.note ? escapeHtml(existing.note) : ''}</textarea>
      </div>
      <button type="submit" class="btn btn-accent btn-block">${existing ? 'Guardar alterações' : 'Adicionar pessoa'}</button>
    </form>
  `);

  const refreshPersonPhoto = () => {
    qs('#personPhotoPreview', body).innerHTML = avatarHtml(pendingPhoto, qs('[name="name"]', body).value, 'avatar--lg');
    qs('#personPhotoRemove', body).classList.toggle('hidden', !pendingPhoto);
    qs('#personPhotoBtn', body).innerHTML = `${iconCamera} &nbsp; ${pendingPhoto ? 'Trocar foto' : 'Adicionar foto'}`;
  };
  qs('#personPhotoBtn', body).addEventListener('click', () => qs('#personPhotoInput', body).click());
  qs('#personPhotoInput', body).addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      pendingPhoto = await fileToResizedDataUrl(file);
      refreshPersonPhoto();
    } catch (err) {
      showToast('Não foi possível carregar essa imagem');
    }
  });
  qs('#personPhotoRemove', body).addEventListener('click', () => {
    pendingPhoto = null;
    refreshPersonPhoto();
  });

  body.addEventListener('submit', async (e) => {
    e.preventDefault();
    const f = e.target;
    const name = f.name.value.trim();
    if (!name) { showToast('Informa um nome'); return; }
    const record = {
      id: existing ? existing.id : DB.uid(),
      name,
      phone: f.phone.value.trim(),
      note: f.note.value.trim(),
      photo: pendingPhoto,
      createdAt: existing ? existing.createdAt : todayISO()
    };
    await DB.put('people', record);
    await loadState();
    closeSheet();
    if (onSaved) {
      onSaved(record);
    } else {
      openPersonDetailSheet(record.id);
    }
    showToast(existing ? 'Pessoa atualizada' : 'Pessoa adicionada');
  });
  openSheet(existing ? 'Editar pessoa' : 'Nova pessoa', body);
}
