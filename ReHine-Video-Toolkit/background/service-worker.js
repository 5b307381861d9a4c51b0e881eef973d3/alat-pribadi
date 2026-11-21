try { if (typeof importScripts === 'function') importScripts("desktop-rule.js", "api-headers.js", "handoff-db.js", "wa-status.js"); } catch (e) {}
try {
  // Deskripsi di popup dikosongkan setiap extension di-refresh/di-reload/diperbarui.
  const RESET = ['rehineDesc', 'rehineDescOn', 'rehineAutoTags', 'rehineMention'];
  const HANDOFF = ['rehinePending', 'rehineHandoff'];
  chrome.runtime.onInstalled.addListener(() => { try { chrome.storage.local.remove(RESET); } catch (e) {} RehineDesktop.ensure(); RehineApiHeaders.ensure(); });
  chrome.runtime.onStartup.addListener(() => {
    try { chrome.storage.local.remove(RESET.concat(HANDOFF)); } catch (e) {}
    try { RehineHandoffDB.clear(); } catch (e) {}   // video yang dipilih tidak dibawa ke sesi browser berikutnya
    RehineDesktop.ensure(); RehineApiHeaders.ensure();
  });
  RehineDesktop.ensure();
  RehineApiHeaders.ensure();

  /* ---- serah-terima video: halaman TikTok Studio mengambil video yang dipilih di popup, per potongan ---- */
  const CHUNK = 4 * 1024 * 1024, TTL = 3 * 60 * 1000;
  const b64 = (u8) => { let s = ''; const C = 0x8000; for (let i = 0; i < u8.length; i += C) s += String.fromCharCode.apply(null, u8.subarray(i, i + C)); return btoa(s); };
  const getLocal = (k) => new Promise((r) => chrome.storage.local.get(k, r));
  const done = async () => { try { await RehineHandoffDB.clear(); } catch (e) {} try { await chrome.storage.local.remove(HANDOFF); } catch (e) {} };
  let claimed = null;
  async function handle(msg) {
    if (msg.t === 'rehine-claim') {
      const { rehineHandoff: h } = await getLocal({ rehineHandoff: null });
      if (!h || h.id !== msg.id) return { ok: false, why: 'nohandoff' };
      if (h.claimed || claimed === h.id) return { ok: false, why: 'claimed' };
      if (Date.now() - h.ts > TTL) return { ok: false, why: 'expired' };
      const rec = await RehineHandoffDB.get();
      if (!rec || rec.id !== h.id) return { ok: false, why: 'nofile' };
      claimed = h.id;
      await chrome.storage.local.set({ rehineHandoff: { ...h, claimed: true } });
      return { ok: true, processed: !!rec.processed, mode: rec.mode || '', name: rec.name, type: rec.type, size: rec.size, lastModified: rec.lastModified, chunks: Math.ceil(rec.size / CHUNK) };
    }
    if (msg.t === 'rehine-chunk') {
      if (claimed !== msg.id) return { ok: false };
      const rec = await RehineHandoffDB.get();
      if (!rec || rec.id !== msg.id) return { ok: false };
      const buf = await rec.blob.slice(msg.i * CHUNK, Math.min(rec.size, (msg.i + 1) * CHUNK)).arrayBuffer();
      return { ok: true, b64: b64(new Uint8Array(buf)) };
    }
    if (msg.t === 'rehine-done') { if (claimed === msg.id) { claimed = null; await done(); } return { ok: true }; }
    return null;
  }
  chrome.runtime.onMessage.addListener((msg, sender, send) => {
    if (!msg || typeof msg.t !== 'string' || msg.t.indexOf('rehine-') !== 0 || !sender || !sender.tab) return false;   // hanya dari content script
    handle(msg).then(send, (e) => send({ ok: false, why: 'error: ' + (e && e.message || e) }));
    return true;
  });
} catch (e) { console.warn('[RE:HINE] background:', e); }
