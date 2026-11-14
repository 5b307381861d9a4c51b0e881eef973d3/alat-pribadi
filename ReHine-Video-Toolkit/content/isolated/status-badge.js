// RE:HINE — status badge (isolated world, hanya frame utama).
// Menampilkan ACTIVE / NOT ACTIVE / OFF di pojok kanan bawah TikTok dengan "bertanya" ke hook di MAIN world,
// dan meneruskan saklar UPLOADER (data-rehine-on) serta CAPTION (data-rehine-caption) dari popup ke hook lewat <html>.
(() => {
  'use strict';
  if (window.top !== window || window.__REHINE_BADGE__) return;
  window.__REHINE_BADGE__ = true;

  const NEED = ['post', 'video-url', 'caption'];
  let on = true, host = null, badge = null, label = null, timer = null;
  // Label badge mengikuti bahasa pilihan di popup (rehineLang)
  const LBL = {
    en: { checking: 'CHECKING', active: 'ACTIVE', inactive: 'NOT ACTIVE', off: 'OFF' },
    id: { checking: 'MEMERIKSA', active: 'AKTIF', inactive: 'TIDAK AKTIF', off: 'MATI' }
  };
  let lang = /^id/i.test(navigator.language || '') ? 'id' : 'en', lastKey = 'checking';

  function setOn(v) {
    on = v !== false;
    if (document.documentElement) document.documentElement.dataset.rehineOn = on ? '1' : '0';
    if (!on) show('off', 'off'); else probe();
  }
  // Saklar CAPTION diteruskan ke hook di MAIN world lewat atribut data-rehine-caption.
  function setCaption(v) {
    if (document.documentElement) document.documentElement.dataset.rehineCaption = v !== false ? '1' : '0';
  }
  // Deskripsi manual, saklar tagar otomatis, dan tagar video terakhir diteruskan ke hook publish (MAIN world).
  function setDesc(k, v) {
    const d = document.documentElement; if (!d) return;
    if (k === 'rehineDesc') d.dataset.rehineDesc = typeof v === 'string' ? v : '';
    else if (k === 'rehineDescOn') d.dataset.rehineDescOn = v === true ? '1' : '0';
    else if (k === 'rehineAutoTags') d.dataset.rehineAutoTags = v === true ? '1' : '0';
    else if (k === 'rehineVideoTags') d.dataset.rehineVideoTags = typeof v === 'string' ? v : '';
  }
  try {
    chrome.storage.local.get({ rehineUploader: true, rehineCaption: true, rehineLang: null, rehineDesc: '', rehineDescOn: false, rehineAutoTags: false, rehineVideoTags: '' }, (r) => {
      ['rehineDesc', 'rehineDescOn', 'rehineAutoTags', 'rehineVideoTags'].forEach((k) => setDesc(k, r && r[k]));
      if (r && r.rehineLang) lang = r.rehineLang;
      setOn(r && r.rehineUploader);
      setCaption(r && r.rehineCaption);
    });
    chrome.storage.onChanged.addListener((ch, area) => {
      if (area !== 'local') return;
      if (ch.rehineUploader) setOn(ch.rehineUploader.newValue);
      if (ch.rehineCaption) setCaption(ch.rehineCaption.newValue);
      ['rehineDesc', 'rehineDescOn', 'rehineAutoTags', 'rehineVideoTags'].forEach((k) => { if (ch[k]) setDesc(k, ch[k].newValue); });
      if (ch.rehineLang && ch.rehineLang.newValue) { lang = ch.rehineLang.newValue; if (label) label.textContent = (LBL[lang] || LBL.en)[lastKey]; }
    });
  } catch (_) {}
  if (document.documentElement) {
    document.documentElement.dataset.rehineOn = '1';
    document.documentElement.dataset.rehineCaption = '1';
  }

  // Status mention (uid + sec_uid sudah didapat?) dari hook di MAIN world -> chrome.storage untuk popup. Denyut tiap 15 dtk
  // supaya popup tahu halaman TikTok masih terbuka.
  function reportMention() {
    try {
      const ok = !!document.documentElement && document.documentElement.dataset.rehineMention === 'ok';
      chrome.storage.local.set({ rehineMention: { ok, ts: Date.now() } });
    } catch (_) {}
  }
  try {
    new MutationObserver(reportMention).observe(document.documentElement, { attributes: true, attributeFilter: ['data-rehine-mention'] });
  } catch (_) {}
  setInterval(reportMention, 15000);
  window.addEventListener('pagehide', () => { try { chrome.storage.local.set({ rehineMention: { ok: false, ts: Date.now() } }); } catch (_) {} });
  setTimeout(reportMention, 800);

  // Refresh halaman (F5) = deskripsi di popup ikut dikosongkan. Membuka TikTok Studio dari tombol LAUNCH tidak menghapus apa pun.
  try {
    const nav = performance.getEntriesByType('navigation')[0];
    if (nav && nav.type === 'reload') chrome.storage.local.set({ rehineDesc: '', rehineDescOn: false });
  } catch (_) {}

  function mount() {
    if (host && host.isConnected) return true;
    const root = document.documentElement;
    if (!root) return false;
    host = document.createElement('div');
    host.id = 'rehine-status';
    host.setAttribute('role', 'status');
    host.setAttribute('aria-live', 'polite');
    host.style.cssText = 'all:initial;position:fixed;right:14px;bottom:calc(14px + env(safe-area-inset-bottom,0px));z-index:2147483647;pointer-events:none';
    const sh = host.attachShadow({ mode: 'closed' });
    sh.innerHTML = `<style>
      .b{display:flex;align-items:center;gap:8px;padding:6px 10px;border:1px solid #26262b;border-radius:999px;background:#151518;color:#f4f4f5;
         font:700 10px/1 system-ui,-apple-system,"Segoe UI",sans-serif;letter-spacing:.08em;box-shadow:0 4px 14px rgba(0,0,0,.4)}
      .d{width:8px;height:8px;border-radius:50%;background:#e5484d}
      .b[data-s=checking] .d{background:#f5a524}.b[data-s=active] .d{background:#30c48d}.b[data-s=off] .d{background:#8b8b93}
    </style><div class="b" data-s="checking"><span>RE:HINE</span><i class="d"></i><span class="t">CHECKING</span></div>`;
    badge = sh.querySelector('.b'); label = sh.querySelector('.t');
    root.appendChild(host);
    return true;
  }
  function show(state, key) {
    if (!mount()) return;
    badge.dataset.s = state;
    lastKey = key;
    label.textContent = (LBL[lang] || LBL.en)[key];
  }

  function probe() {
    if (!on) return;
    const nonce = Date.now() + '-' + Math.random().toString(36).slice(2);
    const got = new Set();
    let done = false, t = 0;
    const finish = () => {
      if (done) return;
      done = true; clearTimeout(t); window.removeEventListener('message', onMsg);
      if (on) { const ok = NEED.every((h) => got.has(h)); show(ok ? 'active' : 'inactive', ok ? 'active' : 'inactive'); }
    };
    const onMsg = (e) => {
      const d = e.data;
      if (e.source !== window || !d || d.type !== '__REHINE_STATUS_READY__' || d.nonce !== nonce) return;
      if (NEED.includes(d.hook)) got.add(d.hook);
      if (got.size === NEED.length) finish();
    };
    window.addEventListener('message', onMsg);
    window.postMessage({ type: '__REHINE_STATUS_PROBE__', nonce }, location.origin);
    t = setTimeout(finish, 650);
  }

  function start() {
    if (!mount()) { requestAnimationFrame(start); return; }
    show(on ? 'checking' : 'off', on ? 'checking' : 'off');
    probe();
    timer = setInterval(probe, 5000);
  }
  start();
})();
