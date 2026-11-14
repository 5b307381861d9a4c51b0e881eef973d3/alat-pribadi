// RE:HINE — upload hook (MAIN world, document_start).
// Blob video yang dibuatkan object URL oleh halaman TikTok diganti dengan blob dummy 8-byte,
// sehingga pemrosesan/preview sisi klien TikTok tidak memakai data video asli.
// File aslinya sendiri tetap dikirim lewat alur upload TikTok. Hanya aktif saat toggle UPLOADER menyala.
// Efek samping: preview video di halaman TikTok Studio bisa tidak tampil.
(() => {
  'use strict';
  if (window.__REHINE_UPLOAD_HOOK__) return;
  window.__REHINE_UPLOAD_HOOK__ = true;

  const enabled = () => !(document.documentElement && document.documentElement.dataset.rehineOn === '0');
  const realCreate = URL.createObjectURL.bind(URL);
  const dummyUrl = realCreate(new Blob([new Uint8Array(8)], { type: 'application/octet-stream' }));

  URL.createObjectURL = function (obj) {
    if (enabled() && obj instanceof Blob && /^video\//i.test(String(obj.type || ''))) return dummyUrl;
    return realCreate(obj);
  };

  window.addEventListener('message', (e) => {
    const d = e.data;
    if (e.source !== window || !d || d.type !== '__REHINE_STATUS_PROBE__') return;
    window.postMessage({ type: '__REHINE_STATUS_READY__', nonce: d.nonce, hook: 'video-url' }, location.origin);
  });
})();
