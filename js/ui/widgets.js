/* =========================================================
   ui/widgets.js — Pequenos componentes de UI reutilizáveis (bolinha de categoria, avatar, redimensionamento de imagem para avatar).
   ========================================================= */

import { personInitial } from '../core/debt-selectors.js';
import { catColor } from '../core/finance-selectors.js';
import { iconUser } from '../core/icons.js';

/* ----------------------- Cat dot (ícone circular) ----------------------- */
export function catDotHtml(category, type) {
  const color = catColor(category, type);
  const letter = (category || '?').charAt(0).toUpperCase();
  return `<div class="cat-dot" style="background:${color}22;color:${color}">${letter}</div>`;
}

/* ----------------------- Avatar (foto, iniciais ou ícone genérico) ----------------------- */
export function avatarHtml(photo, name, extraClass) {
  const cls = `avatar ${extraClass || ''}`.trim();
  if (photo) return `<div class="${cls} avatar--photo"><img src="${photo}" alt=""></div>`;
  if (name && name.trim()) return `<div class="${cls}">${personInitial(name)}</div>`;
  return `<div class="${cls}">${iconUser}</div>`;
}

/** Lê um ficheiro de imagem, redimensiona e comprime para um data-URL leve (evita encher o IndexedDB). */
export function fileToResizedDataUrl(file, maxSize, quality) {
  maxSize = maxSize || 320;
  quality = quality || 0.85;
  return new Promise((resolve, reject) => {
    if (!file || !file.type || !file.type.startsWith('image/')) { reject(new Error('invalid-file')); return; }
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error || new Error('read-error'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('image-error'));
      img.onload = () => {
        let { width, height } = img;
        if (width > height && width > maxSize) { height = Math.round(height * (maxSize / width)); width = maxSize; }
        else if (height >= width && height > maxSize) { width = Math.round(width * (maxSize / height)); height = maxSize; }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}
