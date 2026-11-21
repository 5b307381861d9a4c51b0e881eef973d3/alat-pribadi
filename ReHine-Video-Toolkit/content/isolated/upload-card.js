(() => {
  'use strict';
  if (window.__rehineCardLoaded) return;
  window.__rehineCardLoaded = true;

  // Kartu di halaman TikTok Studio kini hanya animasi loading: video dipilih & diproses di popup,
  // lalu diambil di sini (serah-terima), dimasukkan ke input TikTok, deskripsi diisi, privasi "Hanya saya", dan diposting otomatis.
  const STR = {
    en: { loading: 'Loading video…', preparing: 'Preparing…', done: 'Done', noInput: 'TikTok upload input not found' },
    id: { loading: 'Memuat video…', preparing: 'Menyiapkan…', done: 'Selesai', noInput: 'Input upload TikTok tidak ditemukan' }
  };
  let lang = /^id/i.test(navigator.language || '') ? 'id' : 'en';
  let enabled = true, timerRef = null, nativeBtn = null, toastTimer = null;
  const S = (k) => (STR[lang] && STR[lang][k]) || STR.en[k] || k;
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));

  /* ---------- tema: kartu mengikuti tema yang dipilih di popup (variabel --rh-* dipakai styles/upload-card.css) ---------- */
  function applyTheme(id) {
    try {
      const all = globalThis.RehineThemeVars || {};
      const t = all[id] || all.hitam;
      if (!t) return;
      const hex = String(t.accent).replace('#', '');
      const n = parseInt(hex.length === 3 ? hex.replace(/./g, '$&$&') : hex, 16);
      const lin = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
      const L = 0.2126 * lin((n >> 16) & 255) + 0.7152 * lin((n >> 8) & 255) + 0.0722 * lin(n & 255);
      const s = document.documentElement.style;
      s.setProperty('--rh-bg', t.bg); s.setProperty('--rh-surface', t.surface); s.setProperty('--rh-text', t.text);
      s.setProperty('--rh-muted', t.muted); s.setProperty('--rh-line', t.line); s.setProperty('--rh-accent', t.accent); s.setProperty('--rh-accent2', t.accent2 || t.accent);
      s.setProperty('--rh-on', L > 0.5 ? '#111' : '#fff');          // teks di atas warna aksen: gelap bila aksen terang
      s.setProperty('--rh-scheme', t.light ? 'light' : 'dark');
    } catch (_) {}
  }

  /* ---------- shared settings (set from the extension popup) ---------- */
  const store = (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) || null;
  if (store) {
    try {
      store.get({ rehineLang: null, rehineUploader: true, rehineTheme: null }, (r) => {
        applyTheme(r && r.rehineTheme);
        if (r && r.rehineLang) lang = r.rehineLang;
        enabled = !r || r.rehineUploader !== false;
        applyLang(); schedule();
      });
      chrome.storage.onChanged.addListener((ch, area) => {
        if (area !== 'local') return;
        if (ch.rehineLang && ch.rehineLang.newValue) { lang = ch.rehineLang.newValue; applyLang(); }
        if (ch.rehineUploader) { enabled = ch.rehineUploader.newValue !== false; schedule(); }
        if (ch.rehineTheme) applyTheme(ch.rehineTheme.newValue);
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

  /* ---------- animasi loading (pengganti kartu RE:HINE) ---------- */
  function setLoad(text) {
    const el = document.querySelector('.rehine-lt'); if (el) el.textContent = text;
    const m = /(\d+)%/.exec(text || ''), bar = document.querySelector('.rehine-bar');
    if (bar) { bar.classList.toggle('rehine-det', !!m); const i = bar.firstElementChild; if (i) i.style.width = m ? m[1] + '%' : ''; }
  }
  function applyLang() { const el = document.querySelector('.rehine-lt'); if (el && el.dataset.k) el.textContent = S(el.dataset.k); }
  function removeOverlay() {
    document.querySelectorAll('.rehine-overlay').forEach(n => n.remove());
    document.querySelectorAll('.rehine-zone').forEach(n => n.classList.remove('rehine-zone'));
  }

  // hand a file to TikTok's own input exactly once
  function deliver(input, file) {
    const dt = new DataTransfer();
    dt.items.add(file);
    input.files = dt.files;
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
  }

  // Tagar otomatis (resolusi + fps): baca info video lalu simpan untuk popup & publish-request-hook
  async function analyze(file) {
    try {
      if (!store || !globalThis.RehineVideoMeta) return;
      const bytes = new Uint8Array(await file.arrayBuffer());
      const meta = globalThis.RehineVideoMeta.parse(bytes);
      if (meta) store.set({ rehineVideoTags: globalThis.RehineVideoMeta.tags(meta).join(' ') });
    } catch (_) {}
  }

  /* ---------- hanya tampil selama serah-terima dari popup berlangsung ---------- */
  let hoWanted = false, hoDoneAt = 0;
  function decorate() {
    const show = enabled && !isEditorPage() && hoWanted && !(hoDoneAt && Date.now() - hoDoneAt > 90 * 1000);
    if (!show) { removeOverlay(); return; }
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
    const ov = document.createElement('div');
    ov.className = 'rehine-overlay';
    ov.innerHTML = '<video class="rehine-bgv" muted loop playsinline autoplay preload="auto"></video><div class="rehine-scrim"></div><div class="rehine-loader" role="status" aria-live="polite"><div class="rehine-orb"><i class="rehine-r1"></i><i class="rehine-r2"></i><i class="rehine-r3"></i><b class="rehine-dot"></b></div><div class="rehine-brand">RE<span>:</span>HINE</div><div class="rehine-bar"><i></i></div><div class="rehine-lt" data-k="loading"></div></div>';
    try {
      const v = ov.querySelector('.rehine-bgv'); v.muted = true;
      v.src = chrome.runtime.getURL('assets/bg.mp4');
      v.addEventListener('error', () => { v.remove(); ov.classList.add('rehine-novid'); });
      const pl = v.play(); if (pl && pl.catch) pl.catch(() => {});
    } catch (_) { ov.classList.add('rehine-novid'); }
    ov.addEventListener('click', (e) => { e.stopPropagation(); e.preventDefault(); });
    zone.appendChild(ov);
    applyLang();
  }

  /* ---------- serah-terima dari popup: tombol "UNGGAH LANGSUNG KE TIKTOK" ---------- */
  // Dicoba berulang (tiap 1 dtk, maks. 3 menit) sampai kotak unggah tampil di halaman TikTok, karena halaman
  // TikTok Studio dirender bertahap. Bila gagal, alasannya ditampilkan sebagai toast (HP tidak punya konsol).
  const HO_WHY = {
    en: { nohandoff: 'no hand-off request', claimed: 'already taken by another frame', expired: 'request expired (over 3 min)', nofile: 'selected video not found in extension storage', nochunk: 'could not read video data' },
    id: { nohandoff: 'tidak ada permintaan serah-terima', claimed: 'sudah diambil frame lain', expired: 'permintaan kedaluwarsa (lebih dari 3 menit)', nofile: 'video terpilih tidak ada di penyimpanan extension', nochunk: 'data video tidak terbaca' }
  };
  const hoWhy = (c) => { const m = HO_WHY[lang] || HO_WHY.en; return m[c] || String(c); };
  let hoState = 'idle', hoStart = Date.now();
  // Catatan langkah serah-terima ditulis ke storage supaya popup bisa menampilkannya (HP tidak punya konsol)
  const hoLog = (c, d) => { try { if (store) store.set({ rehineHandoffLog: { t: Date.now(), c, d: d || '' } }); } catch (_) {} };
  try { if (store && !window.__rehineVerSent) { window.__rehineVerSent = 1; store.set({ rehineCsVer: chrome.runtime.getManifest().version }); } } catch (_) {}
  const ask = (msg) => new Promise((res) => {
    try { chrome.runtime.sendMessage(msg, (r) => res(chrome.runtime.lastError ? { ok: false, why: 'error: ' + chrome.runtime.lastError.message } : r)); }
    catch (e) { res({ ok: false, why: 'error: ' + (e && e.message || e) }); }
  });
  const getLocal = (defaults) => new Promise((res) => { try { store.get(defaults, (r) => res(r || defaults)); } catch (_) { res(defaults); } });
  const visible = (el) => { try { const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0; } catch (_) { return false; } };

  /* ---------- deskripsi: isi kolom Deskripsi TikTok Studio (maks. 5 hashtag) ---------- */
  const MAX_TAGS = 5, TAG_RE = /#[\p{L}\p{N}_]+/gu;
  const squash = (x) => String(x || '').replace(/\s+/g, ' ').trim();
  const withTimeout = (p, ms, fallback) => Promise.race([p, new Promise((res) => setTimeout(() => res(fallback), ms))]);
  const edText = (ed) => squash(ed.innerText || ed.textContent);
  // Editor Draft.js memakai selection internalnya sendiri: pilih seluruh isi lewat DOM Range, lalu ganti lewat event paste.
  function selectAllIn(ed) {
    ed.focus();
    const sel = window.getSelection(), r = document.createRange();
    r.selectNodeContents(ed); sel.removeAllRanges(); sel.addRange(r);
  }
  async function writeEditor(ed, final) {
    selectAllIn(ed); await sleep(150);
    try {
      const dt = new DataTransfer(); dt.setData('text/plain', final);
      ed.dispatchEvent(new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true }));
    } catch (_) {}
    await sleep(600);
  }
  async function clearEditor(ed) {
    selectAllIn(ed); await sleep(120);
    document.execCommand('delete', false, null);
    await sleep(400);
  }
  // Klik "nyata": dropdown TikTok sering merespons pointerdown/mousedown, bukan hanya click
  function realClick(el) {
    const r = el.getBoundingClientRect(), o = { bubbles: true, cancelable: true, view: window, clientX: r.left + r.width / 2, clientY: r.top + r.height / 2, button: 0 };
    try { el.dispatchEvent(new PointerEvent('pointerdown', { ...o, pointerType: 'mouse', isPrimary: true })); } catch (_) {}
    el.dispatchEvent(new MouseEvent('mousedown', o));
    try { el.dispatchEvent(new PointerEvent('pointerup', { ...o, pointerType: 'mouse', isPrimary: true })); } catch (_) {}
    el.dispatchEvent(new MouseEvent('mouseup', o));
    el.dispatchEvent(new MouseEvent('click', o));
  }
  // Tutup daftar saran hashtag (muncul karena kursor tepat setelah #tagar) dan lepaskan fokus editor
  async function closeSuggest(ed) {
    try {
      for (const t of ['keydown', 'keyup']) ed.dispatchEvent(new KeyboardEvent(t, { key: 'Escape', code: 'Escape', keyCode: 27, which: 27, bubbles: true }));
      ed.blur(); if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
      const b = document.body;
      b.dispatchEvent(new MouseEvent('mousedown', { bubbles: true })); b.dispatchEvent(new MouseEvent('mouseup', { bubbles: true })); b.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    } catch (_) {}
    await sleep(500);
  }
  async function fillCaption() {
    const r = await getLocal({ rehineDesc: '', rehineDescOn: false, rehineAutoTags: false, rehineVideoTags: '' });
    const text = r.rehineDescOn ? String(r.rehineDesc || '').replace(/\r\n?/g, '\n').trim() : '';
    const room = Math.max(0, MAX_TAGS - (text.match(TAG_RE) || []).length);
    const seen = new Set();
    const add = r.rehineAutoTags ? String(r.rehineVideoTags || '').split(/\s+/).filter((t) => {
      const k = t.toLowerCase();
      if (!/^#[\p{L}\p{N}_]+$/u.test(t) || seen.has(k) || text.toLowerCase().includes(k)) return false;
      seen.add(k); return true;
    }).slice(0, room) : [];
    if (!text && !add.length) return 'skip';
    const final = text + (add.length ? (text ? '\n\n' : '') + add.join(' ') : '');
    const want = squash(final);
    const t0 = Date.now();
    let ed = null;
    while (Date.now() - t0 < 25000) {
      ed = document.querySelector('.public-DraftEditor-content, [contenteditable="true"][role="combobox"]');
      if (ed && visible(ed)) break;
      ed = null; await sleep(500);
    }
    if (!ed) return 'noeditor';
    await sleep(700);                                   // beri waktu TikTok mengisi nama file lebih dulu
    if (edText(ed) === want) { await closeSuggest(ed); return 'ok'; }   // sudah terisi (idempoten, tidak ditulis ulang)
    await writeEditor(ed, final + ' ');                 // 1) ganti seluruh isi lewat paste (spasi akhir: tagar terakhir selesai)
    if (edText(ed) === want) { await closeSuggest(ed); return 'ok'; }
    await clearEditor(ed);                              // 2) bersihkan dulu (jangan menumpuk), lalu ketik satu baris
    selectAllIn(ed); document.execCommand('insertText', false, want + ' ');
    await sleep(600);
    if (edText(ed) === want) { await closeSuggest(ed); return 'ok'; }
    // gagal: pastikan tidak ada teks dobel tersisa
    await clearEditor(ed);
    selectAllIn(ed); document.execCommand('insertText', false, want + ' ');
    await sleep(600);
    await closeSuggest(ed);
    return edText(ed) === want ? 'ok' : 'mismatch';
  }

  /* ---------- privasi: ubah pilihan "Siapa yang dapat melihat postingan ini" menjadi "Hanya saya" ---------- */
  const WANT = /^(hanya saya|hanya anda|only me|only you|private|pribadi)$/i;
  const CURRENT = /^(semua orang|everyone|public|publik|teman|friends|pengikut|followers|mutual|teman yang saling mengikuti)$/i;
  const txt = (el) => (el.innerText || el.textContent || '').trim().replace(/\s+/g, ' ');
  const labelEl = () => Array.from(document.querySelectorAll('div, span, label, p')).filter((n) => n.children.length === 0 && /siapa yang dapat melihat|who can (view|watch)/i.test(txt(n))).find(visible) || null;
  // Elemen yang teksnya persis pilihan privasi saat ini (mis. "Semua orang"), paling dekat di bawah labelnya
  function visibilityTrigger() {
    const lab = labelEl(), ly = lab ? lab.getBoundingClientRect().bottom : 0;
    const cands = Array.from(document.querySelectorAll('div, span, button, [role="combobox"], [role="button"]'))
      .filter((n) => visible(n) && n.children.length <= 3 && (CURRENT.test(txt(n)) || WANT.test(txt(n))) && !n.closest('[role="listbox"], [role="menu"]'))
      .map((n) => ({ n, y: n.getBoundingClientRect().top }))
      .filter((c) => !lab || c.y >= ly - 4)
      .sort((a, b) => a.y - b.y);
    return cands.length ? cands[0].n : null;
  }
  const isWant = (el) => !!el && WANT.test(txt(el));
  const tagOf = (n) => n ? n.tagName.toLowerCase() + '.' + String(n.className && n.className.baseVal !== undefined ? n.className.baseVal : n.className || '').split(' ')[0].slice(0, 24) : '-';
  // klik selengkap mungkin (hover + pointer + mouse + sentuh + klik asli) pada elemen yang BENAR-BENAR tampil di titik tengahnya
  function fullClick(el) {
    const r = el.getBoundingClientRect(), x = r.left + r.width / 2, y = r.top + r.height / 2;
    let hit = null; try { hit = document.elementFromPoint(x, y); } catch (_) {}
    const t = hit && (el.contains(hit) || hit.contains(el)) ? hit : el;
    const o = { bubbles: true, cancelable: true, view: window, clientX: x, clientY: y, button: 0 };
    for (const n of [t, el]) {
      try { for (const ty of ['pointerover', 'pointerenter', 'pointermove']) n.dispatchEvent(new PointerEvent(ty, { ...o, pointerType: 'mouse', isPrimary: true })); } catch (_) {}
      for (const ty of ['mouseover', 'mouseenter', 'mousemove']) n.dispatchEvent(new MouseEvent(ty, o));
    }
    realClick(t);
    try { t.click(); } catch (_) {}
    return t;
  }
  function optionsNow(trig) {
    return Array.from(document.querySelectorAll('[role="option"], [role="menuitem"], li, div, span, p'))
      .filter((n) => n !== trig && !trig.contains(n) && visible(n) && n.children.length <= 3 && WANT.test(txt(n)))
      .sort((a, b) => a.getBoundingClientRect().height - b.getBoundingClientRect().height);
  }
  const listOpen = () => optionsNow(document.body).length > 0;
  async function setPrivateUi(maxMs) {
    const t0 = Date.now(); let step = 'notrigger', info = '';
    while (Date.now() - t0 < (maxMs || 18000)) {
      const trig = visibilityTrigger();
      if (!trig) { await sleep(600); continue; }
      if (isWant(trig)) return 'ok';
      step = 'nooption';
      const host = trig.closest('[role="combobox"], [role="button"], button') || trig;
      if (!optionsNow(trig).length) {            // daftar belum terbuka -> buka (jangan klik lagi kalau sudah terbuka: itu menutupnya)
        try { if (document.activeElement && document.activeElement.blur) document.activeElement.blur(); } catch (_) {}
        realClick(host); await sleep(800);
      }
      const opts = optionsNow(trig);
      if (opts.length) {
        step = 'noverify';
        for (const op of opts.slice(0, 3)) {
          const hit = fullClick(op); info = tagOf(hit) + '>' + tagOf(op);
          await sleep(700);
          if (isWant(visibilityTrigger())) return 'ok';
          if (!optionsNow(trig).length) break;      // daftar tertutup tapi belum berubah: cek lagi di putaran berikut
        }
        if (optionsNow(trig).length) {             // masih terbuka: coba papan ketik (Hanya Anda = pilihan terakhir)
          try {
            const tg = document.activeElement && document.activeElement !== document.body ? document.activeElement : host;
            for (const k of ['ArrowDown', 'ArrowDown', 'ArrowDown', 'Enter']) { for (const ty of ['keydown', 'keyup']) tg.dispatchEvent(new KeyboardEvent(ty, { key: k, code: k, bubbles: true, cancelable: true })); await sleep(120); }
          } catch (_) {}
          await sleep(600); if (isWant(visibilityTrigger())) return 'ok';
        }
      }
      await sleep(700);
    }
    const t = visibilityTrigger();
    return step + (info ? '[' + info + ']' : '') + (t ? '<' + tagOf(t) + '>' : '');
  }

  async function tryHandoff() {
    if (hoState !== 'idle' || !store) return;
    hoState = 'checking';
    let h = null;
    try { h = await new Promise((res) => store.get({ rehineHandoff: null }, (r) => res(r && r.rehineHandoff))); } catch (_) {}
    if (!h || !h.id || h.claimed || Date.now() - h.ts > 3 * 60 * 1000) { hoState = 'idle'; if (!h) hoLog('wait'); return; }
    hoLog('claim');
    const meta = await ask({ t: 'rehine-claim', id: h.id });
    if (!meta || !meta.ok) {
      if (meta && meta.why === 'claimed') { hoState = 'stop'; hoLog('claimed'); return; }   // frame lain sudah menanganinya
      hoState = 'stop'; hoWanted = false; schedule(); hoLog(meta && meta.why || 'error'); toast('RE:HINE: ' + hoWhy(meta && meta.why || 'error')); return;
    }
    hoState = 'running';
    const fail = async (why) => { hoState = 'stop'; hoWanted = false; schedule(); hoLog(why); toast('RE:HINE: ' + hoWhy(why)); await ask({ t: 'rehine-done', id: h.id }); };
    try {
      const parts = [];
      for (let i = 0; i < meta.chunks; i++) {
        const r = await ask({ t: 'rehine-chunk', id: h.id, i });
        if (!r || !r.ok) return fail(r && r.why || 'nochunk');
        const bin = atob(r.b64), u8 = new Uint8Array(bin.length);
        for (let k = 0; k < bin.length; k++) u8[k] = bin.charCodeAt(k);
        parts.push(u8);
        setLoad(S('loading') + ' ' + Math.round((i + 1) / meta.chunks * 100) + '%');
        hoLog('loading', (i + 1) + '/' + meta.chunks);
      }
      // Video SUDAH diproses di popup (meta.processed); di sini hanya dimasukkan ke input TikTok.
      const file = new File(parts, meta.name, { type: meta.type || 'video/mp4', lastModified: meta.lastModified || Date.now() });
      setLoad(S('preparing'));
      hoLog('processing');
      await analyze(file);
      await sleep(500);   // beri waktu komponen unggah TikTok memasang handler-nya
      try {
        const target = findInput();
        if (target) deliver(target, file); else toast(S('noInput'));
      } finally { hoState = 'done'; hoDoneAt = Date.now(); await ask({ t: 'rehine-done', id: h.id }); }
      setLoad(S('done'));
      // Deskripsi & privasi dibatasi waktunya supaya auto-post tidak tertahan (privasi tetap dipaksa Private di request)
      hoLog('caption'); const c = await withTimeout(fillCaption(), 25000, 'timeout');
      hoLog('ready', 'caption: ' + c);   // privasi dipaksa Private di level request (publish-request-hook); dropdown tidak diutak-atik
      autoPostNow().catch((e) => { hoLog('postfail', 'error: ' + (e && e.message || e)); });   // unggah langsung = posting otomatis (Hanya saya)
    } catch (err) { await fail('error: ' + (err && err.message || err)); }
  }
  /* Posting otomatis (hanya untuk alur "Unggah langsung"): tunggu tombol Posting aktif, klik, lalu setujui dialog konfirmasi bila ada.
     Privasi tetap dipaksa Private oleh publish-request-hook, jadi hasilnya bisa diubah ke Publik setelah posting. */
  const postBtn = () => document.querySelector('button[data-e2e="post_video_button"]') ||
    Array.from(document.querySelectorAll('button')).find((b) => /^(posting|post)$/i.test((b.textContent || '').trim()));
  // alasan tombol belum bisa diklik ('' = siap). Kelas CSS "disabled" tidak lagi dipakai: atribut disabled / aria-disabled sudah cukup.
  const btnWhy = (b) => !b ? 'nobtn' : (b.getBoundingClientRect().width <= 0 ? 'hidden'
    : (b.disabled || b.getAttribute('aria-disabled') === 'true' || b.getAttribute('data-disabled') === 'true') ? 'disabled' : '');
  const POST_WAIT_MS = 15 * 60 * 1000;   // TikTok bisa lama memproses/mengunggah video besar
  async function autoPostNow() {
    hoLog('waitpost');
    const t0 = Date.now();
    let b = null, why = 'nobtn', toasted = false, lastLog = 0;
    while (Date.now() - t0 < POST_WAIT_MS) {
      b = postBtn();
      why = isEditorPage() ? btnWhy(b) : 'noeditor';
      if (!why) break;
      b = null;
      const el = Math.round((Date.now() - t0) / 1000);
      if (Date.now() - lastLog > 5000) { lastLog = Date.now(); hoLog('waitpost', why + ' · ' + el + 's'); }
      if (!toasted && el > 45) { toasted = true; toast('RE:HINE: ' + (lang === 'id' ? 'menunggu TikTok selesai memproses video, Posting otomatis tetap menunggu…' : 'waiting for TikTok to finish processing; auto-post keeps waiting…')); }
      await sleep(300);
    }
    if (!b) { hoLog('postfail', why); toast('RE:HINE: ' + (lang === 'id' ? 'tombol Posting belum aktif (TikTok belum selesai memproses?), klik manual' : 'Post button not ready (TikTok still processing?), click it manually')); return; }
    await sleep(1000);                       // 1 dtk setelah tombol aktif langsung Posting; pemeriksaan konten tidak ditunggu
    for (let attempt = 0; attempt < 2; attempt++) {
      b = postBtn() || b;
      if (btnWhy(b)) { await sleep(1500); b = postBtn() || b; if (btnWhy(b)) break; }
      b.click(); hoLog('posting', attempt ? '2' : '');
      const until = Date.now() + 8000;       // dialog "Posting sekarang?" (pemeriksaan belum selesai) — setujui
      while (Date.now() < until) {
        const c = Array.from(document.querySelectorAll('[role="dialog"] button, .TUXModal button, [class*="modal" i] button')).find((x) => /posting sekarang|post now|^posting$|^post$/i.test((x.textContent || '').trim()) && x !== b);
        if (c) { c.click(); break; }
        await sleep(400);
      }
      await sleep(6000);                     // berhasil bila halaman editor hilang / tombol tidak ada lagi
      const again = postBtn();
      if (!isEditorPage() || !again) { hoLog('posted'); return; }
      if (btnWhy(again)) { hoLog('posted'); return; }   // tombol kembali nonaktif/memproses = posting berjalan
    }
    hoLog('posted');
  }

  const hoTimer = setInterval(() => {
    if (hoState === 'stop' || hoState === 'done' || Date.now() - hoStart > 3 * 60 * 1000) { clearInterval(hoTimer); return; }
    if (document.querySelector('.rehine-overlay')) { if (hoState === 'idle') hoLog('card'); tryHandoff(); }
  }, 1000);

  // Ada permintaan serah-terima yang masih berlaku? -> tampilkan animasi loading di kotak unggah
  const syncWanted = () => {
    if (!store) return;
    try { store.get({ rehineHandoff: null }, (r) => { const h = r && r.rehineHandoff; hoWanted = !!(h && h.id && Date.now() - h.ts < 3 * 60 * 1000); schedule(); }); } catch (_) {}
  };
  try { chrome.storage.onChanged.addListener((ch, a) => { if (a === 'local' && ch.rehineHandoff) syncWanted(); }); } catch (_) {}
  syncWanted();

  let timer = null;
  function schedule() { clearTimeout(timer); timer = setTimeout(() => { try { decorate(); } catch (_) {} }, 200); }
  new MutationObserver(schedule).observe(document, { childList: true, subtree: true });
  schedule();
})();
