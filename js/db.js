/* =========================================================
   db.js — camada de persistência (IndexedDB)
   Sem dependências externas. API baseada em Promises.
   ========================================================= */
const DB_NAME = 'financas-db';
const DB_VERSION = 3;

const STORES = {
  transactions: 'id',
  budgets: 'category',
  goals: 'id',
  bills: 'id',
  investments: 'id',
  categories: 'id',
  debts: 'id',
  debtPayments: 'id',
  settings: 'key'
};

let _dbPromise = null;

function openDB() {
  if (_dbPromise) return _dbPromise;
  _dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      Object.entries(STORES).forEach(([name, keyPath]) => {
        if (!db.objectStoreNames.contains(name)) {
          db.createObjectStore(name, { keyPath });
        }
      });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return _dbPromise;
}

function tx(storeName, mode = 'readonly') {
  return openDB().then((db) => db.transaction(storeName, mode).objectStore(storeName));
}

function reqToPromise(req) {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

const DB = {
  async getAll(storeName) {
    const store = await tx(storeName, 'readonly');
    return reqToPromise(store.getAll());
  },
  async get(storeName, key) {
    const store = await tx(storeName, 'readonly');
    return reqToPromise(store.get(key));
  },
  async put(storeName, value) {
    const store = await tx(storeName, 'readwrite');
    return reqToPromise(store.put(value));
  },
  async delete(storeName, key) {
    const store = await tx(storeName, 'readwrite');
    return reqToPromise(store.delete(key));
  },
  async clear(storeName) {
    const store = await tx(storeName, 'readwrite');
    return reqToPromise(store.clear());
  },
  uid() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  },
  async exportAll() {
    const out = {};
    for (const name of Object.keys(STORES)) {
      out[name] = await DB.getAll(name);
    }
    return out;
  },
  async importAll(data) {
    for (const name of Object.keys(STORES)) {
      if (!Array.isArray(data[name])) continue;
      await DB.clear(name);
      const store = await tx(name, 'readwrite');
      for (const item of data[name]) store.put(item);
    }
  }
};

window.DB = DB;
