/* Tiny IndexedDB wrapper. Everything is stored offline on the phone. */
const DB = (() => {
  const NAME = 'policyfinder';
  const VERSION = 4;
  const STORES = ['products', 'docs', 'files', 'grids', 'rules', 'meta', 'vehicles', 'schemes', 'cases', 'conds'];
  let dbp = null;

  function open() {
    if (dbp) return dbp;
    dbp = new Promise((resolve, reject) => {
      const req = indexedDB.open(NAME, VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        STORES.forEach(s => { if (!db.objectStoreNames.contains(s)) db.createObjectStore(s, { keyPath: 'id' }); });
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    return dbp;
  }

  async function tx(store, mode, fn) {
    const db = await open();
    return new Promise((resolve, reject) => {
      const t = db.transaction(store, mode);
      const s = t.objectStore(store);
      let out;
      const r = fn(s);
      if (r && 'onsuccess' in r) r.onsuccess = () => { out = r.result; };
      t.oncomplete = () => resolve(out);
      t.onerror = () => reject(t.error);
      t.onabort = () => reject(t.error);
    });
  }

  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

  return {
    uid,
    all: store => tx(store, 'readonly', s => s.getAll()).then(r => r || []),
    get: (store, id) => tx(store, 'readonly', s => s.get(id)),
    put: (store, obj) => { if (!obj.id) obj.id = uid(); obj.updated = Date.now(); return tx(store, 'readwrite', s => s.put(obj)).then(() => obj); },
    del: (store, id) => tx(store, 'readwrite', s => s.delete(id)),
    clear: store => tx(store, 'readwrite', s => s.clear()),
    STORES,
  };
})();
