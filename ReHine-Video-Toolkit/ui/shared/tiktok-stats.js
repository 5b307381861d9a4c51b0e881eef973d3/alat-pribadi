// RE:HINE — TikTok Statistics (dipakai popup).
// Alur: tempel link video -> SCAN -> panggil API tiktok-resolve (data video) dan tiktok-fps (stream),
// lalu tampilkan ringkasan. Semua teks dari API dipasang lewat textContent (aman dari injeksi HTML).
(() => {
  'use strict';
  const $ = (id) => document.getElementById(id);
  if (!$('statsBtn')) return;

  const API_BASE = 'https://cutefish.my.id/api';
  const MEDIA_URL = (id) => 'https://www.tikwm.com/video/media/play/' + id + '.mp4';
  const TIMEOUT_MS = 25000;

  const TXT = {
    id: {
      button: 'STATISTIK TIKTOK', sub: 'Penganalisis Metadata & Stream',
      placeholder: 'Tempel link video TikTok', scan: 'PINDAI', paste: 'TEMPEL', clear: 'HAPUS', pasteFail: 'Tidak bisa membaca clipboard. Tempel manual (Ctrl+V).', scanning: 'MEMINDAI…',
      badUrl: 'Masukkan link video TikTok yang valid.', failed: 'Gagal memindai: ', partial: 'Sebagian data tidak tersedia dari sumber ini.',
      creator: 'Kreator', uploaded: 'Tanggal Upload', region: 'Wilayah', shadowban: 'Shadowban',
      safe: 'Aman', banned: 'Dibatasi',
      resolution: 'Resolusi', fps: 'Frame Rate (FPS)', bitrate: 'Bitrate', duration: 'Durasi', size: 'Ukuran File', method: 'Metode',
      views: 'Tayangan', likes: 'Suka', comments: 'Komentar', shares: 'Dibagikan', saves: 'Disimpan', engagement: 'Interaksi'
    },
    en: {
      button: 'TIKTOK STATISTICS', sub: 'Metadata & Stream Analyser',
      placeholder: 'Paste a TikTok video link', scan: 'SCAN', paste: 'PASTE', clear: 'CLEAR', pasteFail: 'Cannot read the clipboard. Paste manually (Ctrl+V).', scanning: 'SCANNING…',
      badUrl: 'Enter a valid TikTok video link.', failed: 'Scan failed: ', partial: 'Some data is not available from this source.',
      creator: 'Creator', uploaded: 'Upload Date', region: 'Region', shadowban: 'Shadowban',
      safe: 'Safe', banned: 'Restricted',
      resolution: 'Resolution', fps: 'Frame Rate (FPS)', bitrate: 'Bitrate', duration: 'Duration', size: 'File Size', method: 'Method',
      views: 'Views', likes: 'Likes', comments: 'Comments', shares: 'Shares', saves: 'Saves', engagement: 'Engagement'
    }
  };
  let lang = /^id/i.test(navigator.language || '') ? 'id' : 'en';
  const T = (k) => TXT[lang][k] || TXT.en[k] || k;
  const DASH = '—';

  /* ---------- baca field dari respons (nama field bisa berbeda antar sumber) ---------- */
  const get = (obj, path) => path.split('.').reduce((o, k) => (o == null ? undefined : o[k]), obj);
  function pick(roots, paths) {
    for (const root of roots) {
      if (!root || typeof root !== 'object') continue;
      for (const p of paths) {
        const v = get(root, p);
        if (v !== undefined && v !== null && v !== '') return v;
      }
    }
    return undefined;
  }
  const num = (v) => { const n = Number(v); return Number.isFinite(n) ? n : undefined; };

  /* ---------- format ---------- */
  const fmtInt = (n) => (n === undefined ? DASH : n.toLocaleString(lang === 'id' ? 'id-ID' : 'en-US'));
  function fmtSize(b) {
    if (!b) return DASH;
    const u = ['B', 'KB', 'MB', 'GB']; let i = 0, x = b;
    while (x >= 1024 && i < 3) { x /= 1024; i++; }
    return x.toFixed(i ? 2 : 0) + ' ' + u[i];
  }
  function fmtBitrate(bps) {
    if (!bps) return DASH;
    return bps >= 1e6 ? (bps / 1e6).toFixed(2) + ' Mbps' : Math.round(bps / 1e3) + ' kbps';
  }
  function fmtDuration(s) {
    if (!s) return DASH;
    const m = Math.floor(s / 60), r = Math.round(s % 60);
    return m + ':' + String(r).padStart(2, '0');
  }
  function fmtDate(unix) {
    if (!unix) return DASH;
    return new Date(unix * 1000).toLocaleString(lang === 'id' ? 'id-ID' : 'en-US', { dateStyle: 'medium', timeStyle: 'short' });
  }
  // ID video TikTok menyimpan waktu upload (detik unix) di 32 bit teratasnya.
  function uploadTimeFromId(id) {
    try { return Number(BigInt(id) >> 32n); } catch (_) { return undefined; }
  }

  /* ---------- jaringan ---------- */
  async function getJson(url) {
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), TIMEOUT_MS);
    try {
      const res = await fetch(url, { signal: ctl.signal, cache: 'no-store', headers: { Accept: 'application/json' } });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return await res.json();
    } finally { clearTimeout(timer); }
  }

  const isTikTokUrl = (s) => {
    try { const u = new URL(s); return u.protocol.startsWith('http') && /(^|\.)tiktok\.com$/i.test(u.hostname); }
    catch (_) { return false; }
  };

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const isEmpty = (v) => v === undefined || v === null || v === '' || v === 0 || v === '0';

  // Isi nilai yang kosong di `base` dari `extra` (tanpa menimpa nilai yang sudah ada).
  function fillGaps(base, extra) {
    if (!extra || typeof extra !== 'object') return base;
    for (const k of Object.keys(extra)) {
      const v = extra[k];
      if (v && typeof v === 'object' && !Array.isArray(v)) {
        if (!base[k] || typeof base[k] !== 'object') base[k] = {};
        fillGaps(base[k], v);
      } else if (isEmpty(base[k]) && !isEmpty(v)) base[k] = v;
    }
    return base;
  }

  // Respons dianggap lengkap bila statistik dan data creator ada.
  function isComplete(r, latest) {
    const roots = [r, r && r.data, r && r.stats, r && r.statistics];
    const hasStats = pick(roots, ['play_count', 'playCount', 'views']) !== undefined;
    const hasCreator = !!pick(roots, ['author_unique_id', 'author.unique_id', 'author.uniqueId', 'unique_id']);
    return hasStats && hasCreator && !(latest && latest.is_fallback);
  }

  // Sumber data kadang membalas sebagian (mis. method fallback). Ulang beberapa kali lalu gabungkan.
  async function resolveWithRetry(link) {
    const merged = {};
    let lastErr = null;
    for (let i = 0; i < 3; i++) {
      try {
        const r = await getJson(API_BASE + '/tiktok-resolve?url=' + encodeURIComponent(link) + '&nocache=1');
        fillGaps(merged, r);
        if (isComplete(merged, r)) break;
      } catch (err) { lastErr = err; }
      if (i < 2) await sleep(700);
    }
    if (!Object.keys(merged).length) throw lastErr || new Error('respons kosong');
    return merged;
  }

  // tiktok-fps membaca file videonya langsung, jadi dipakai link video dari resolve (hdplay/play),
  // dengan cadangan link tikwm berdasarkan ID.
  async function readStream(resolved, id) {
    const roots = [resolved, resolved && resolved.data];
    const candidates = [pick(roots, ['hdplay']), pick(roots, ['play']), id ? MEDIA_URL(id) : null]
      .filter((u, i, a) => typeof u === 'string' && /^https?:\/\//.test(u) && a.indexOf(u) === i);
    let best = null;
    for (const u of candidates) {
      try {
        const r = await getJson(API_BASE + '/tiktok-fps?url=' + encodeURIComponent(u));
        best = best ? fillGaps(best, r) : r;
        if (best && best.width && best.height && best.fps) break;
      } catch (_) { /* coba link berikutnya */ }
    }
    return best;
  }

  async function scan(link) {
    // Pastikan Referer = https://cutefish.my.id/ (sama seperti situsnya); service worker di HP sering tidak aktif.
    try { if (globalThis.RehineApiHeaders) await RehineApiHeaders.ensure(); } catch (_) {}
    const resolved = await resolveWithRetry(link);
    const roots = [resolved, resolved && resolved.data, resolved && resolved.stats, resolved && resolved.statistics];
    const id = String(pick(roots, ['id', 'aweme_id', 'video_id']) || (link.match(/\/(?:video|photo)\/(\d+)/) || [])[1] || '');
    const stream = await readStream(resolved, id);

    const duration = num(pick(roots, ['duration']));
    const size = num(stream && stream.size) || num(pick(roots, ['size']));
    const w = num(stream && stream.width) || num(pick(roots, ['w', 'width']));
    const h = num(stream && stream.height) || num(pick(roots, ['h', 'height']));
    const views = num(pick(roots, ['play_count', 'playCount', 'views']));
    const likes = num(pick(roots, ['digg_count', 'diggCount', 'like_count', 'likes']));
    const comments = num(pick(roots, ['comment_count', 'commentCount']));
    const shares = num(pick(roots, ['share_count', 'shareCount']));
    const saves = num(pick(roots, ['collect_count', 'collectCount', 'favorite_count']));
    const nff = pick(roots, ['is_nff_or_nr', 'isNffOrNr']);

    let engagement;
    if (views) engagement = ((likes || 0) + (comments || 0) + (shares || 0) + (saves || 0)) / views * 100;

    const username = pick(roots, ['author_unique_id', 'author.unique_id', 'author.uniqueId', 'unique_id']);
    return {
      username: username ? '@' + String(username).replace(/^@/, '') : DASH,
      nickname: pick(roots, ['author_nickname', 'author.nickname', 'nickname']) || '',
      title: pick(roots, ['title', 'desc']) || '',
      uploaded: num(pick(roots, ['create_time', 'createTime'])) || uploadTimeFromId(id),
      region: pick(roots, ['region']) || DASH,
      shadowban: nff === undefined ? DASH : (nff === true || nff === 'true' ? 'banned' : 'safe'),
      resolution: w && h ? w + '×' + h : DASH,
      fps: stream && stream.fps ? String(Math.round(stream.fps * 100) / 100) : DASH,
      bitrate: size && duration ? size * 8 / duration : 0,
      duration, size,
      method: (stream && stream.comment) || pick(roots, ['comment']) || pick(roots, ['method']) || DASH,
      views, likes, comments, shares, saves, engagement
    };
  }

  /* ---------- tampilan ---------- */
  const el = (tag, cls, text) => { const n = document.createElement(tag); if (cls) n.className = cls; if (text !== undefined) n.textContent = text; return n; };
  let last = null;

  function cell(label, value, extraClass) {
    const c = el('div', 'stats-cell' + (extraClass ? ' ' + extraClass : ''));
    c.append(el('span', '', label), el('b', '', value));
    return c;
  }

  function render() {
    $('statsSub').textContent = T('sub');
    $('statsUrl').placeholder = T('placeholder');
    if (!$('statsScan').disabled) $('statsScan').textContent = T('scan');
    $('statsPaste').textContent = T('paste');
    $('statsClear').textContent = T('clear');
    $('statsText').textContent = T('button');

    const box = $('statsResult');
    box.replaceChildren();
    if (!last) { box.hidden = true; return; }
    const d = last;

    const creator = el('div', 'stats-creator');
    creator.append(el('span', '', T('creator')), el('b', '', d.username));
    if (d.nickname) creator.append(el('em', '', d.nickname));
    if (d.title) creator.append(el('small', '', d.title));

    const shadow = d.shadowban === 'safe' ? T('safe') : d.shadowban === 'banned' ? T('banned') : DASH;
    const info = el('div', 'stats-grid');
    info.append(
      cell(T('uploaded'), fmtDate(d.uploaded), 'wide'),
      cell(T('region'), String(d.region)),
      cell(T('shadowban'), shadow, 'shadow-' + d.shadowban)
    );

    const stream = el('div', 'stats-grid');
    stream.append(
      cell(T('resolution'), d.resolution), cell(T('fps'), d.fps), cell(T('bitrate'), fmtBitrate(d.bitrate)),
      cell(T('duration'), fmtDuration(d.duration)), cell(T('size'), fmtSize(d.size)), cell(T('method'), String(d.method))
    );

    const eng = el('div', 'stats-grid');
    eng.append(
      cell(T('views'), fmtInt(d.views)), cell(T('likes'), fmtInt(d.likes)), cell(T('comments'), fmtInt(d.comments)),
      cell(T('shares'), fmtInt(d.shares)), cell(T('saves'), fmtInt(d.saves)),
      cell(T('engagement'), d.engagement === undefined ? DASH : d.engagement.toFixed(2) + '%')
    );

    box.append(creator, info, stream, eng);
    if (d.views === undefined) box.append(el('div', 'stats-note', T('partial')));
    box.hidden = false;
  }

  function message(text, isError) {
    const m = $('statsMsg');
    m.textContent = text || '';
    m.classList.toggle('error', !!isError);
  }

  /* ---------- event ---------- */
  $('statsBtn').addEventListener('click', () => {
    const panel = $('statsPanel');
    panel.hidden = !panel.hidden;
    $('statsBtn').setAttribute('aria-expanded', String(!panel.hidden));
    // Saat TIKTOK STATISTICS terbuka, kartu pengaturan uploader disembunyikan supaya tampilan bersih.
    const ctrl = $('ctrlCard'); if (ctrl) ctrl.hidden = !panel.hidden;
    if (!panel.hidden) $('statsUrl').focus();
  });

  $('statsPaste').addEventListener('click', async () => {
    try {
      const text = (await navigator.clipboard.readText()).trim();
      if (text) { $('statsUrl').value = text; message(''); }
    } catch (_) { message(T('pasteFail'), true); }
  });

  $('statsClear').addEventListener('click', () => {
    $('statsUrl').value = '';
    last = null;
    message('');
    render();
    $('statsUrl').focus();
  });

  $('statsForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const link = $('statsUrl').value.trim();
    if (!isTikTokUrl(link)) { message(T('badUrl'), true); return; }

    message('');
    const btn = $('statsScan');
    btn.disabled = true; btn.textContent = T('scanning');
    try {
      last = await scan(link);
    } catch (err) {
      last = null;
      message(T('failed') + (err && err.name === 'AbortError' ? 'timeout' : (err && err.message) || err), true);
    } finally {
      btn.disabled = false;
      render();
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
