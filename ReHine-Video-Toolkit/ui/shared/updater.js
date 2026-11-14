// RE:HINE — pembaruan dari GitHub (dipakai popup).
// "Periksa pembaruan": baca version.json di repo lalu bandingkan dengan versi manifest.
// "Download versi terbaru": buka download_url dari version.json (zip) di tab baru.
(() => {
  'use strict';
  const $ = (id) => document.getElementById(id);
  if (!$('checkUpdateBtn')) return;

  /* ---------- pengaturan repo (ubah di sini) ---------- */
  const OWNER = '5b307381861d9a4c51b0e881eef973d3';
  const REPO = 'alat-pribadi';
  const BRANCH = 'main';
  const VERSION_URL = 'https://raw.githubusercontent.com/' + OWNER + '/' + REPO + '/' + BRANCH + '/version.json';
  const FALLBACK_ZIP = 'https://github.com/' + OWNER + '/' + REPO + '/archive/refs/heads/' + BRANCH + '.zip';
  const TIMEOUT_MS = 15000;

  const TXT = {
    id: {
      check: 'Periksa', download: 'Perbarui', checking: 'Memeriksa…',
      current: 'Versi', latest: 'Sudah versi terbaru', available: 'Pembaruan tersedia',
      failed: 'Gagal memeriksa pembaruan: ', badLink: 'Link unduhan tidak valid.'
    },
    en: {
      check: 'Check', download: 'Update', checking: 'Checking…',
      current: 'Version', latest: 'You are on the latest version', available: 'Update available',
      failed: 'Update check failed: ', badLink: 'Invalid download link.'
    }
  };
  let lang = /^id/i.test(navigator.language || '') ? 'id' : 'en';
  const T = (k) => TXT[lang][k] || TXT.en[k] || k;
  const localVersion = chrome.runtime.getManifest().version;
  let remote = null;        // hasil pemeriksaan terakhir
  let statusKey = 'current'; // untuk render ulang saat bahasa berubah

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
  function setStatus(text, kind) {
    const s = $('updateStatus');
    s.textContent = text;
    s.dataset.kind = kind || '';
  }

  function render() {
    $('checkUpdateText').textContent = T('check');
    $('downloadUpdateText').textContent = T('download');
    if (statusKey === 'current') setStatus(T('current') + ' v' + localVersion, '');
    else if (statusKey === 'latest') setStatus(T('latest') + ' (v' + localVersion + ')', 'ok');
    else if (statusKey === 'available' && remote) setStatus(T('available') + ': v' + remote.version + (remote.notes ? ' — ' + remote.notes : ''), 'new');
  }

  /* ---------- event ---------- */
  $('checkUpdateBtn').addEventListener('click', async () => {
    const btn = $('checkUpdateBtn');
    btn.disabled = true;
    setStatus(T('checking'), '');
    try {
      remote = await fetchRemote();
      statusKey = versionOrder(remote.version, localVersion) > 0 ? 'available' : 'latest';
      render();
    } catch (err) {
      remote = null; statusKey = 'current';
      setStatus(T('failed') + (err && err.name === 'AbortError' ? 'timeout' : (err && err.message) || err), 'error');
    } finally { btn.disabled = false; }
  });

  $('downloadUpdateBtn').addEventListener('click', async () => {
    try {
      if (!remote) remote = await fetchRemote();
      const url = safeDownloadUrl(remote.url);
      if (!url) { setStatus(T('badLink'), 'error'); return; }
      chrome.tabs.create({ url });
    } catch (err) {
      setStatus(T('failed') + ((err && err.message) || err), 'error');
    }
  });

  try {
    chrome.storage.local.get({ rehineLang: null }, (r) => { if (r && r.rehineLang) lang = r.rehineLang; render(); });
    chrome.storage.onChanged.addListener((ch, area) => {
      if (area === 'local' && ch.rehineLang && ch.rehineLang.newValue) { lang = ch.rehineLang.newValue; render(); }
    });
  } catch (_) {}
  render();
})();
