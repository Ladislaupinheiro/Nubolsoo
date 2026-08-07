/* =========================================================
   sw.js — Service Worker (cache-first, app shell offline)
   ========================================================= */
const CACHE_NAME = 'nubolso-v14';
const APP_SHELL = [
  './',
  './index.html',
  './manifest.json',
  './css/aura-glass.css',
  './css/styles.css',
  './js/db.js',
  './js/charts.js',
  './js/main.js',
  './js/router.js',
  './js/actions.js',
  './js/data-io.js',
  './js/app-update.js',
  './js/core/constants.js',
  './js/core/state.js',
  './js/core/theme.js',
  './js/core/security.js',
  './js/core/dom.js',
  './js/core/format.js',
  './js/core/finance-selectors.js',
  './js/core/debt-selectors.js',
  './js/core/icons.js',
  './js/ui/toast.js',
  './js/ui/sheet.js',
  './js/ui/widgets.js',
  './js/views/topbar.js',
  './js/views/nav.js',
  './js/views/profile.js',
  './js/views/theme-sheet.js',
  './js/views/categories.js',
  './js/views/security-sheet.js',
  './js/views/dashboard.js',
  './js/views/transactions.js',
  './js/views/budget.js',
  './js/views/goals.js',
  './js/views/bills.js',
  './js/views/debts.js',
  './js/views/people.js',
  './js/views/investments.js',
  './js/views/bi.js',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png',
  'https://cdn.jsdelivr.net/npm/apexcharts@3.49.0/dist/apexcharts.min.js'
];

self.addEventListener('install', (event) => {
  // Não chama self.skipWaiting() aqui: o novo SW fica em estado "waiting"
  // até a página pedir a ativação (ver listener de 'message' abaixo),
  // dando ao utilizador a oportunidade de aceitar ou adiar a atualização.
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
  );
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then((cached) => {
      const network = fetch(event.request)
        .then((response) => {
          if (response && response.status === 200 && (response.type === 'basic' || response.type === 'cors')) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() => cached || caches.match('./index.html'));
      return cached || network;
    })
  );
});
