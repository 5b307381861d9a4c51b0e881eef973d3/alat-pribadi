// RE:HINE — pembaruan dari GitHub (dipakai popup).
// Setiap popup dibuka: baca version.json di repo lalu bandingkan dengan versi manifest.
// Bila ada versi lebih baru, tampil pop-up dengan tombol "Kembali" dan "Perbarui".
// "Perbarui": mengunduh zip terbaru (tab latar belakang) lalu membuka chrome://extensions/.
(() => {
  'use strict';
  const $ = (id) => document.getElementById(id);
  if (!$('updateModal')) return;

  /* ---------- pengaturan repo (ubah di sini) ---------- */
  const OWNER = '5b307381861d9a4c51b0e881eef973d3';
  const REPO = 'alat-pribadi';
  const BRANCH = 'main';
  const VERSION_URL = 'https://raw.githubusercontent.com/' + OWNER + '/' + REPO + '/' + BRANCH + '/version.json';
  const FALLBACK_ZIP = 'https://github.com/' + OWNER + '/' + REPO + '/raw/' + BRANCH + '/dist/rehine-extension.zip';   // zip siap pasang (manifest.json di akar)
  const TIMEOUT_MS = 15000;

  const TXT = {
    id: {
      title: 'Pembaruan tersedia', ver: 'Versi baru v{new} tersedia (versi kamu v{cur}).',
      back: 'Kembali', go: 'Perbarui'
    },
    en: {
      title: 'Update available', ver: 'New version v{new} is available (you have v{cur}).',
      back: 'Back', go: 'Update'
    }
  };
  let lang = /^id/i.test(navigator.language || '') ? 'id' : 'en';
  const T = (k) => TXT[lang][k] || TXT.en[k] || k;
  const localVersion = chrome.runtime.getManifest().version;
  let remote = null; // hanya terisi bila ada versi lebih baru

  /* ---------- util ---------- */
  function versionOrder(a, b) {
    const pa = String(a).split('.').map((n) => parseInt(n, 10) || 0);
    const pb = String(b).split('.').map((n) => parseInt(n, 10) || 0);
    for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
      const d = (pa[i] || 0) - (pb[i] || 0);
      if (d) return d > 0 ? 1 : -1;
    }
    return 0;
  }

  // download_url berasal dari file jarak jauh, jadi hanya terima https ke domain GitHub.
  function safeDownloadUrl(raw) {
    try {
      const u = new URL(String(raw || ''));
      const ok = u.protocol === 'https:' && /(^|\.)(github\.com|githubusercontent\.com)$/i.test(u.hostname);
      return ok ? u.href : null;
    } catch (_) { return null; }
  }

  async function fetchRemote() {
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), TIMEOUT_MS);
    try {
      const res = await fetch(VERSION_URL + '?t=' + Date.now(), { signal: ctl.signal, cache: 'no-store' });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const json = await res.json();
      if (!json || !json.version) throw new Error('version.json tidak valid');
      return { version: String(json.version), notes: String(json.notes || ''), url: safeDownloadUrl(json.download_url) || FALLBACK_ZIP };
    } finally { clearTimeout(timer); }
  }

  /* ---------- tampilan ---------- */
  function render() {
    $('updTitle').textContent = T('title');
    $('updBack').textContent = T('back');
    $('updGo').textContent = T('go');
    if (remote) {
      $('updVer').textContent = T('ver').replace('{new}', remote.version).replace('{cur}', localVersion);
      $('updNotes').hidden = true; // hanya tampilkan judul + versi, tanpa catatan
    }
  }
  const show = (on) => { $('updateModal').hidden = !on; if (on) $('updGo').focus(); };

  /* ---------- event ---------- */
  $('updBack').addEventListener('click', () => show(false));
  $('updateModal').addEventListener('click', (e) => { if (e.target === $('updateModal')) show(false); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') show(false); });

  $('updGo').addEventListener('click', () => {
    const url = remote && safeDownloadUrl(remote.url);
    if (!url) { show(false); return; }
    // 1) unduh zip di tab latar belakang (GitHub langsung mengunduh, tab menutup sendiri)
    try { chrome.tabs.create({ url, active: false }); } catch (_) {}
    // 2) buka halaman ekstensi untuk memuat ulang / mengganti folder
    try { chrome.tabs.create({ url: 'chrome://extensions/' }); } catch (_) {}
    show(false);
  });

  try {
    chrome.storage.local.get({ rehineLang: null }, (r) => { if (r && r.rehineLang) lang = r.rehineLang; render(); });
    chrome.storage.onChanged.addListener((ch, area) => {
      if (area === 'local' && ch.rehineLang && ch.rehineLang.newValue) { lang = ch.rehineLang.newValue; render(); }
    });
  } catch (_) {}

  // Cek otomatis setiap popup dibuka; gagal/offline = diam saja.
  // Hanya saat extension dibuka pertama kali: muat ulang (F5) halaman popup tidak memunculkan pop-up lagi.
  let skip = false;
  try {
    const nav = performance.getEntriesByType('navigation')[0];
    if (nav && nav.type === 'reload') skip = true;
    if (sessionStorage.getItem('rehineUpdChecked')) skip = true;
    sessionStorage.setItem('rehineUpdChecked', '1');
  } catch (_) {}
  (async () => {
    if (skip) return;
    try {
      const r = await fetchRemote();
      if (versionOrder(r.version, localVersion) > 0) { remote = r; render(); show(true); }
    } catch (_) {}
  })();
})();
