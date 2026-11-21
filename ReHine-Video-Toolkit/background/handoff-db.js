// RE:HINE — serah-terima video dari popup ke halaman TikTok Studio.
// Video disimpan sebagai Blob di IndexedDB milik extension (dipakai popup & service worker).
(function (g) {
  'use strict';
  const DB = 'rehine-handoff', ST = 'files', KEY = 'pending';
  function open() {
    return new Promise((res, rej) => {
      const r = indexedDB.open(DB, 1);
      r.onupgradeneeded = () => { r.result.createObjectStore(ST); };
      r.onsuccess = () => res(r.result);
      r.onerror = () => rej(r.error || new Error('indexedDB'));
    });
  }
  async function tx(mode, fn) {
    const db = await open();
    try {
      return await new Promise((res, rej) => {
        const t = db.transaction(ST, mode), req = fn(t.objectStore(ST));
        t.oncomplete = () => res(req && 'result' in req ? req.result : undefined);
        t.onerror = () => rej(t.error || new Error('transaksi gagal'));
        t.onabort = () => rej(t.error || new Error('transaksi dibatalkan'));
      });
    } finally { db.close(); }
  }
  g.RehineHandoffDB = {
    put: (rec) => tx('readwrite', (s) => s.put(rec, KEY)),
    get: () => tx('readonly', (s) => s.get(KEY)),
    clear: () => tx('readwrite', (s) => s.delete(KEY))
  };
})(typeof self !== 'undefined' ? self : this);
