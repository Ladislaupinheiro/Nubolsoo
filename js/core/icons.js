/* =========================================================
   core/icons.js — Biblioteca de ícones SVG usados na interface.
   ========================================================= */

export function icon(paths) { return `<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${paths}</svg>`; }

export const iconHome = icon('<path d="M3 11l9-8 9 8"/><path d="M5 10v10h14V10"/>');

export const iconSwap = icon('<path d="M7 4v13M7 17l-3-3M7 17l3-3"/><path d="M17 20V7M17 7l3 3M17 7l-3 3"/>');

export const iconPie = icon('<path d="M21 12A9 9 0 1 1 12 3v9z"/>');

export const iconTarget = icon('<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>');

export const iconMore = icon('<circle cx="5" cy="12" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="19" cy="12" r="1.5"/>');

export const iconReceipt = icon('<path d="M6 2h12v20l-3-2-3 2-3-2-3 2V2z"/><path d="M9 7h6M9 11h6"/>');

export const iconTrend = icon('<path d="M3 17l6-6 4 4 8-8"/><path d="M15 7h6v6"/>');

export const iconChart = icon('<path d="M4 20V10M12 20V4M20 20v-7"/>');

export const iconDownload = icon('<path d="M12 3v12M7 10l5 5 5-5"/><path d="M5 21h14"/>');

export const iconUpload = icon('<path d="M12 21V9M7 14l5-5 5 5"/><path d="M5 3h14"/>');

export const iconTrash = icon('<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/>');

export const iconChevronLeft = icon('<path d="M15 18l-6-6 6-6"/>');

export const iconChevronRight = icon('<path d="M9 18l6-6-6-6"/>');

export const iconTag = icon('<path d="M20.59 13.41 11 3.83A2 2 0 0 0 9.59 3.24L4 3a1 1 0 0 0-1 1l.24 5.59a2 2 0 0 0 .59 1.41l9.58 9.59a2 2 0 0 0 2.83 0l4.35-4.35a2 2 0 0 0 0-2.83z"/><circle cx="7.5" cy="7.5" r="1.2" fill="currentColor" stroke="none"/>');

export const iconLock = icon('<rect x="4" y="10" width="16" height="10" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/>');

export const iconHandshake = icon('<path d="M8.5 14.5 3 9l4-4 3.5 3.5"/><path d="M15.5 14.5 21 9l-4-4-3.5 3.5"/><path d="M8.5 14.5 11 17l2-2 2 2 2.5-2.5"/>');

export const iconUsers = icon('<circle cx="9" cy="8" r="3.2"/><path d="M2.5 19c0-3.7 2.9-6.2 6.5-6.2s6.5 2.5 6.5 6.2"/><path d="M16.3 5c1.5.4 2.6 1.7 2.6 3.3s-1.1 2.9-2.6 3.3"/><path d="M18.5 12.9c2.1.6 3.6 2.3 3.6 4.4"/>');

export const iconPlus = icon('<path d="M12 5v14M5 12h14"/>');

export const iconUser = icon('<circle cx="12" cy="8" r="4"/><path d="M4.5 20c0-4.1 3.4-7 7.5-7s7.5 2.9 7.5 7"/>');

export const iconSun = icon('<circle cx="12" cy="12" r="4"/><path d="M12 2.5v2.5M12 19v2.5M4.9 4.9l1.8 1.8M17.3 17.3l1.8 1.8M2.5 12h2.5M19 12h2.5M4.9 19.1l1.8-1.8M17.3 6.7l1.8-1.8"/>');

export const iconMoon = icon('<path d="M20 14.5A8.5 8.5 0 1 1 9.5 4a7 7 0 0 0 10.5 10.5z"/>');

export const iconAuto = icon('<rect x="3" y="4.5" width="18" height="12" rx="2"/><path d="M8 20h8M12 16.5v3.5"/>');

export const iconCamera = icon('<path d="M4 8h3l1.5-2h7L17 8h3a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z"/><circle cx="12" cy="14" r="3.5"/>');

export const iconCheck = icon('<path d="M20 6 9 17l-5-5"/>');
