(() => {
  'use strict';
  if (window.__rehineCardLoaded) return;
  window.__rehineCardLoaded = true;

  const STR = {
    en: { prompt: 'DROP VIDEO IN HERE', pick: 'Select Video', change: 'Change Video',
          ready: 'Ready', patching: 'Patching…', reading: 'Reading…', analyzing: 'Analyzing…', preparing: 'Preparing…', done: 'Done', original: 'Original',
          res: 'Resolution', fps: 'FPS', size: 'Size', bitrate: 'Bitrate', codec: 'Codec',
          busy: 'Still processing a video…', noInput: 'TikTok upload input not found', fail: 'Could not read video info, original video sent: ', patchFail: 'Patch failed, original video sent: ',
          fellBack: 'High was not suitable for this video, used Standar instead. Reason: ',
          bigFile: 'Large file (%s MB): this mode loads the whole video into memory and may lag on a phone. High is lighter.' },
    id: { prompt: 'MASUKKAN VIDEO DI SINI', pick: 'Pilih Video', change: 'Ganti Video',
          ready: 'Siap', patching: 'Memproses…', reading: 'Membaca…', analyzing: 'Analisis…', preparing: 'Menyiapkan…', done: 'Selesai', original: 'Asli',
          res: 'Resolusi', fps: 'FPS', size: 'Ukuran', bitrate: 'Bitrate', codec: 'Codec',
          busy: 'Masih memproses video…', noInput: 'Input upload TikTok tidak ditemukan', fail: 'Info video gagal dibaca, video asli dikirim: ', patchFail: 'Patch gagal, video asli dikirim: ',
          fellBack: 'High tidak cocok untuk video ini, otomatis memakai Standar. Alasan: ',
          bigFile: 'File besar (%s MB): mode ini memuat seluruh video ke memori dan bisa lag di HP. High lebih ringan.' }
  };
  let lang = /^id/i.test(navigator.language || '') ? 'id' : 'en';
  let enabled = true, mode = 'standar', fakeSize = 6, busy = false, passThrough = false, toastTimer = null, shown = 0, nativeBtn = null;
  const S = (k) => (STR[lang] && STR[lang][k]) || STR.en[k] || k;
  // Pesan galat dari mesin patch diterjemahkan ke bahasa pilihan (core/i18n-errors.js)
  const E = (m) => { try { return globalThis.RehineCore.errText(m, lang); } catch (_) { return String(m); } };
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));

  /* ---------- shared settings (set from the extension popup) ---------- */
  const store = (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) || null;
  if (store) {
    try {
      store.get({ rehineLang: null, rehineUploader: true, rehineMode: 'standar', rehineFakeSize: 6 }, (r) => {
        if (r && r.rehineLang) lang = r.rehineLang;
        if (r && r.rehineMode) mode = r.rehineMode;
        if (r && r.rehineFakeSize) fakeSize = r.rehineFakeSize;
        enabled = !r || r.rehineUploader !== false;
        applyLang(); schedule();
      });
      chrome.storage.onChanged.addListener((ch, area) => {
        if (area !== 'local') return;
        if (ch.rehineLang && ch.rehineLang.newValue) { lang = ch.rehineLang.newValue; applyLang(); }
        if (ch.rehineUploader) { enabled = ch.rehineUploader.newValue !== false; schedule(); }
        if (ch.rehineMode && ch.rehineMode.newValue) mode = ch.rehineMode.newValue;
        if (ch.rehineFakeSize && ch.rehineFakeSize.newValue) fakeSize = ch.rehineFakeSize.newValue;
      });
    } catch (_) {}
  }

  const isVideoInput = (el) => el && el.tagName === 'INPUT' && el.type === 'file' &&
    (!el.accept || /video|mp4|mov/i.test(el.accept));
  const findInput = () => Array.from(document.querySelectorAll('input[type="file"]')).find(isVideoInput) || null;

  function toast(msg) {
    let el = document.querySelector('.rehine-toast');
    if (!el) { el = document.createElement('div'); el.className = 'rehine-toast'; (document.body || document.documentElement).appendChild(el); }
    el.textContent = msg;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.remove(), 3500);
  }
  function isEditorPage() {
    return !!document.querySelector('.public-DraftEditor-content, [data-contents="true"], [contenteditable="true"][role="combobox"], [class*="caption-editor" i]');
  }
  function dashed(el) {
    try { const s = getComputedStyle(el); return ['Top','Right','Bottom','Left'].some(k => s['border' + k + 'Style'] === 'dashed'); }
    catch (_) { return false; }
  }
  function findZone(start) {
    let cur = start, fallback = null;
    for (let i = 0; i < 14 && cur && cur !== document.body; i++, cur = cur.parentElement) {
      if (dashed(cur)) return cur;
      const r = cur.getBoundingClientRect();
      if (r.width >= 240 && r.height >= 140 && r.height < 900 &&
          !cur.querySelector('header, nav, [role="tablist"]') && !fallback) fallback = cur;
    }
    return fallback;
  }

  /* ---------- card helpers (all null-safe: the card may not exist yet) ---------- */
  const q = (card, s) => card.querySelector(s);
  function applyLang() {
    const card = document.querySelector('.rehine-card');
    if (!card) return;
    card.querySelectorAll('[data-i]').forEach(n => { n.textContent = S(n.dataset.i); });
    q(card, '.rehine-state').textContent = S(card.dataset.state || 'ready');
    q(card, '.rehine-btn').textContent = S(card.dataset.btn || 'pick');
  }
  function setState(card, key) {
    if (!card) return;
    card.dataset.state = key;
    q(card, '.rehine-state').textContent = S(key);
  }
  function paint(card, n) {
    shown = n;
    if (!card) return;
    q(card, '.rehine-pct').textContent = n + '%';
    q(card, '.rehine-track i').style.width = n + '%';
  }
  async function go(card, to) {            // count up smoothly 1..100
    if (!card) { shown = to; return; }
    while (shown < to) { paint(card, shown + 1); await sleep(to - shown > 25 ? 5 : 11); }
  }
  function setField(card, k, v) { if (card) q(card, '[data-f="' + k + '"]').textContent = v; }
  function markChips(card, meta) {
    if (!card) return;
    card.querySelectorAll('.rehine-chips i').forEach(c => {
      const k = c.dataset.k;
      c.classList.toggle('on', !!meta && (k === meta.codecKey || k === meta.container.toLowerCase()));
    });
  }
  function showInfo(card, file, meta) {
    if (!card) return;
    const F = globalThis.RehineVideoMeta.fmt;
    q(card, '.rehine-file').textContent = file.name;
    setField(card, 'res', F.res(meta));
    setField(card, 'fps', F.fps(meta));
    setField(card, 'size', F.size(file.size));
    setField(card, 'bitrate', F.bitrate(meta));
    setField(card, 'codec', meta ? meta.codec : '—');
    card.classList.add('has-file');
  }
  async function readAll(file, card) {
    const out = new Uint8Array(file.size), CH = 8 * 1024 * 1024;
    for (let o = 0; o < file.size; o += CH) {
      out.set(new Uint8Array(await file.slice(o, Math.min(o + CH, file.size)).arrayBuffer()), o);
      await go(card, Math.round(Math.min(o + CH, file.size) / file.size * 45));
    }
    return out;
  }

  // hand a file to TikTok's own input exactly once
  function deliver(input, file) {
    const dt = new DataTransfer();
    dt.items.add(file);
    input.files = dt.files;
    passThrough = true;
    try {
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
    } finally { passThrough = false; }
  }

  async function processFile(file, pickedInput) {
    if (busy) { toast(S('busy')); return; }
    busy = true;
    const card = document.querySelector('.rehine-card');
    if (card) {
      card.classList.add('busy', 'has-file');
      q(card, '.rehine-file').textContent = file.name;
      ['res','fps','bitrate','codec'].forEach(k => setField(card, k, '…'));
      setField(card, 'size', globalThis.RehineVideoMeta ? globalThis.RehineVideoMeta.fmt.size(file.size) : '…');
      markChips(card, null);
    }
    paint(card, 0);

    let out = file, note = '', checked = null;

    // Langkah 1 — MODE patch, dijalankan SEBELUM video dibaca/dianalisis. Hanya saat saklar UPLOADER aktif.
    // Bila patch gagal, video asli tetap dikirim (pilihan tidak hilang).
    if (enabled) {
      setState(card, 'patching');
      // Peringatan: Standar & Custom membaca seluruh file ke memori
      if (mode !== 'high' && file.size > 300 * 1024 * 1024) toast(S('bigFile').replace('%s', Math.round(file.size / 1048576)));
      try {
        const core = globalThis.RehineCore;
        if (!core || !core.modes) throw new Error('modul patch tidak termuat');
        const patched = await core.modes.run(mode, file, { fakeSize });
        out = new File([patched], file.name, { type: file.type || 'video/mp4', lastModified: file.lastModified });
        const info = patched.rehine;
        if (info) {
          checked = info.check;
          if (info.fellBack) note = S('fellBack') + E(info.reason || '');
        }
      } catch (err) {
        out = file;
        note = S('patchFail') + E(err && err.message ? err.message : err);
      }
    }
    await go(card, 30);

    // Langkah 2 — baca video (hasil patch) & tampilkan resolusi, FPS, ukuran, bitrate, codec.
    setState(card, 'reading');
    try {
      const bytes = await readAll(out, card);
      setState(card, 'analyzing');
      let meta = null;
      try { meta = globalThis.RehineVideoMeta.parse(bytes); } catch (_) {}
      showInfo(card, out, meta);
      try { if (store && meta) store.set({ rehineVideoTags: globalThis.RehineVideoMeta.tags(meta).join(' ') }); } catch (_) {}
      // Hasil pemeriksaan struktur (hanya bila patch berhasil): mis. "name.mp4 · ✓ 1V+2A"
      if (checked && checked.ok) q(card, '.rehine-file').textContent = file.name + ' · ✓ ' + checked.video + 'V+' + checked.audio + 'A';
      markChips(card, meta);
      await go(card, 55);

      setState(card, 'preparing');
      await go(card, 95);
    } catch (err) {
      note = (note ? note + ' | ' : '') + S('fail') + E(err && err.message ? err.message : err);
    }

    // Selalu teruskan file ke TikTok (walau gagal membaca info video) supaya pilihan tidak hilang
    try {
      const target = (pickedInput && pickedInput.isConnected) ? pickedInput : (findInput() || pickedInput);
      if (target) deliver(target, out); else toast(S('noInput'));
    } catch (err) { toast(String(err && err.message || err)); }

    await go(card, 100);
    setState(card, out === file && enabled ? 'original' : 'done');
    if (note) toast(note);
    busy = false;
    if (card) {
      card.classList.remove('busy');
      card.dataset.btn = 'change';
      q(card, '.rehine-btn').textContent = S('change');
    }
    setTimeout(() => { if (isEditorPage()) removeOverlay(); }, 800);
  }

  /* Intercept at the very top of the capture path (window), registered at document_start,
     so TikTok tidak pernah menerima file langsung dari input — untuk event "input" dan "change". */
  function onPick(e) {
    const t = e.target;
    if (!enabled || passThrough || !isVideoInput(t) || !t.files || !t.files.length) return;
    e.stopImmediatePropagation();
    if (e.type === 'change') processFile(t.files[0], t);
  }
  window.addEventListener('change', onPick, true);
  window.addEventListener('input', onPick, true);

  function removeOverlay() {
    document.querySelectorAll('.rehine-overlay').forEach(n => n.remove());
    document.querySelectorAll('.rehine-zone').forEach(n => n.classList.remove('rehine-zone'));
  }

  function openPicker() {
    // use TikTok's own button when possible so its internal state is set up normally
    if (nativeBtn && nativeBtn.isConnected) { nativeBtn.click(); return; }
    const i = findInput();
    if (i) i.click();
  }

  function decorate() {
    if (!enabled || isEditorPage()) { removeOverlay(); return; }
    if (document.querySelector('.rehine-overlay')) return;
    const input = findInput();
    const btn = Array.from(document.querySelectorAll('button')).find(b =>
      /pilih video|select video|choose video|unggah video|upload video/i.test((b.textContent || '').trim()));
    const start = (btn && btn.parentElement) || (input && input.parentElement);
    if (!start) return;
    nativeBtn = btn || null;
    const zone = findZone(start) || start;
    if (getComputedStyle(zone).position === 'static') zone.style.position = 'relative';
    zone.classList.add('rehine-zone');

    let bgUrl = '';
    try { bgUrl = chrome.runtime.getURL('assets/bg.mp4'); } catch (_) {}
    const ov = document.createElement('div');
    ov.className = 'rehine-overlay';
    ov.innerHTML = `
      ${bgUrl ? `<video class="rehine-bgvideo" src="${bgUrl}" autoplay muted loop playsinline webkit-playsinline preload="auto"></video><div class="rehine-bgdim"></div>` : ''}
      <div class="rehine-card" data-state="ready" data-btn="pick">
        <div class="rehine-head"><b>RE:HINE</b><span class="rehine-state"></span></div>
        <div class="rehine-chips">
          <i data-k="avc">H.264/AVC</i><i data-k="hevc">H.265/HEVC</i><i data-k="mp4">MP4</i><i data-k="mov">MOV</i>
        </div>
        <div class="rehine-prompt" data-i="prompt"></div>
        <button type="button" class="rehine-btn"></button>
        <div class="rehine-file"></div>
        <div class="rehine-grid">
          <div><span data-i="res"></span><b data-f="res">—</b></div>
          <div><span data-i="fps"></span><b data-f="fps">—</b></div>
          <div><span data-i="size"></span><b data-f="size">—</b></div>
          <div><span data-i="bitrate"></span><b data-f="bitrate">—</b></div>
          <div class="wide"><span data-i="codec"></span><b data-f="codec">—</b></div>
        </div>
        <div class="rehine-prog"><div class="rehine-track"><i></i></div><span class="rehine-pct">0%</span></div>
      </div>`;
    const bg = ov.querySelector('.rehine-bgvideo');
    if (bg) {
      bg.addEventListener('error', () => { bg.remove(); const d = ov.querySelector('.rehine-bgdim'); if (d) d.remove(); });
      bg.addEventListener('loadeddata', () => { const p = bg.play(); if (p && p.catch) p.catch(() => {}); });
    }
    // our click must not also reach TikTok's own zone handlers (would open/handle twice)
    ov.addEventListener('click', (e) => { e.stopPropagation(); e.preventDefault(); if (!busy) openPicker(); });
    ov.addEventListener('dragenter', () => zone.classList.add('rehine-drag'));
    ov.addEventListener('dragover', (e) => e.preventDefault());
    ov.addEventListener('dragleave', (e) => { if (!ov.contains(e.relatedTarget)) zone.classList.remove('rehine-drag'); });
    ov.addEventListener('drop', (e) => {
      e.preventDefault(); e.stopPropagation();
      zone.classList.remove('rehine-drag');
      const f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
      if (f) processFile(f, findInput());
    });
    zone.appendChild(ov);
    applyLang();
  }

  let timer = null;
  function schedule() { clearTimeout(timer); timer = setTimeout(() => { try { decorate(); } catch (_) {} }, 200); }
  new MutationObserver(schedule).observe(document, { childList: true, subtree: true });
  schedule();
})();
