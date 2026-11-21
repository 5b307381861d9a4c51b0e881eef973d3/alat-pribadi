// RE:HINE — caption signature hook (MAIN world, document_start).
//
// Pada request publish TikTok, menambahkan baris tanda tangan di akhir caption:
//
//     Metode upload by @ariefee10
//
// Handle ditulis sebagai mention sungguhan (text_extra + <m> di markup_text), bukan teks biasa.
// Hanya aktif saat saklar CAPTION di popup menyala.
(() => {
  'use strict';
  if (window.__REHINE_CAPTION_HOOK__) return;
  window.__REHINE_CAPTION_HOOK__ = true;

  /* ---------- pengaturan (ubah di sini) ---------- */
  const SIGNATURE_LABEL = 'Metode upload by ';
  const MENTIONS = [{ handle: 'ariefee10', uid: '0', secUid: '' }]; // uid/secUid diisi otomatis lewat pencarian TikTok

  const captionEnabled = () => !(document.documentElement && document.documentElement.dataset.rehineCaption === '0');

  /* ---------- util teks ---------- */
  const mentionText = (m) => '@' + String(m.handle || '').replace(/^@/, '');
  const signatureLine = () => SIGNATURE_LABEL + MENTIONS.map(mentionText).join(' ');

  // Mengenali tanda tangan lama ("✦/◆ Upload Method" maupun "Metode upload by") beserta mention-nya supaya tidak dobel.
  const SIGNATURE_PATTERN = /\s*(?:[✦◆]\s*Upload\s*Method|Metode\s*upload\s*by)\s*(?:(?:<m[^>]*>)?\s*@[A-Za-z0-9._]+\s*(?:<\/m>)?\s*)*/gi;

  const stripMarkupTags = (s) => String(s || '').replace(/<\/?[hm][^>]*>/g, '');
  const escapeHtml = (s) => String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const escapeAttr = (s) => escapeHtml(s).replace(/"/g, '&quot;');

  /** Buang tanda tangan lama dari caption. keepMarkup=true untuk markup_text (tag <h>/<m> dipertahankan). */
  function removeSignature(text, keepMarkup) {
    const base = keepMarkup ? String(text || '') : stripMarkupTags(text);
    return base.replace(/&amp;/g, '&').replace(SIGNATURE_PATTERN, '').replace(/\n{3,}/g, '\n\n').trimEnd();
  }

  /** Caption bersih + dua baris kosong + tanda tangan. */
  function withSignature(text) {
    const clean = removeSignature(text, false);
    return clean ? clean + '\n\n' + signatureLine() : signatureLine();
  }

  /* ---------- cari id & sec_uid akun lewat pencarian TikTok ---------- */
  let resolvePromise = null;

  async function resolveOneMention(mention) {
    const keyword = encodeURIComponent(mention.handle);
    const endpoints = [
      '/api/upload/search/user/?aid=1988&keyword=' + keyword,
      '/api/search/user/full/?aid=1988&keyword=' + keyword
    ];
    const wanted = String(mention.handle).toLowerCase();

    for (const url of endpoints) {
      try {
        const res = await fetch(url, { credentials: 'include', headers: { Accept: 'application/json' } });
        if (!res.ok) continue;
        const json = await res.json();
        const list = json?.user_list || json?.data?.user_list || json?.user_list_info || [];
        const users = list.map((x) => x?.user_info || x?.user || x);
        const found = users.find((u) => String(u?.unique_id || u?.uniqueId || '').toLowerCase() === wanted);
        if (!found) continue;

        const uid = found.uid || found.user_id || found.id;
        const secUid = found.sec_uid || found.secUid || found.sec_user_id || '';
        if (uid) mention.uid = String(uid);
        if (secUid) mention.secUid = String(secUid);
        return;
      } catch (_) { /* coba endpoint berikutnya */ }
    }
  }

  const isResolved = (m) => !!m.uid && m.uid !== '0' && !!m.secUid;
  const allResolved = () => MENTIONS.every(isResolved);
  // Status untuk popup: data-rehine-mention = "ok" (uid + sec_uid sudah didapat) atau "wait" (masih mencari / jaringan lambat)
  function publishState() {
    try { if (document.documentElement) document.documentElement.dataset.rehineMention = allResolved() ? 'ok' : 'wait'; } catch (_) {}
  }

  let inflight = null;
  // Satu putaran pencarian untuk mention yang belum terselesaikan (aman dipanggil berulang).
  function resolveOnce() {
    if (allResolved()) { publishState(); return Promise.resolve(true); }
    if (!inflight) {
      inflight = Promise.all(MENTIONS.filter((m) => !isResolved(m)).map(resolveOneMention))
        .catch(() => {})
        .then(() => { inflight = null; publishState(); return allResolved(); });
    }
    return inflight;
  }

  // Dipanggil sebelum publish: menunggu (dengan percobaan ulang) sampai uid + sec_uid didapat, maksimal waitMs.
  async function resolveMentions(waitMs) {
    const end = Date.now() + (waitMs == null ? 8000 : waitMs);
    for (;;) {
      if (await resolveOnce()) return true;
      if (Date.now() + 1200 > end) return false;
      await new Promise((r) => setTimeout(r, 1200));
    }
  }

  // Pencarian dimulai lebih awal (saat halaman dibuka) dan diulang sampai berhasil, supaya jaringan lambat tidak membuat uid terlambat.
  publishState();
  if (window.top === window) {
    let delay = 1500;
    const loop = async () => {
      if (allResolved()) return;
      if (captionEnabled()) await resolveOnce();
      if (allResolved()) return;
      delay = Math.min(delay * 1.6, 15000);
      setTimeout(loop, delay);
    };
    setTimeout(loop, 1500);
  }

  /* ---------- text_extra (entity mention) ---------- */
  function isOurMention(entity, text) {
    if (!entity || Number(entity.type) !== 0) return false;
    const start = Number(entity.start), end = Number(entity.end);
    if (!Number.isFinite(start) || !Number.isFinite(end)) return false;

    const slice = String(text || '').slice(start, end).toLowerCase();
    const userId = String(entity.user_id || entity.userId || '');
    const name = String(entity.hashtag_name || '').replace(/^@/, '').toLowerCase();

    return MENTIONS.some((m) =>
      (m.uid && m.uid !== '0' && userId === m.uid) ||
      name === String(m.handle).toLowerCase() ||
      slice === mentionText(m).toLowerCase());
  }

  function nextTagId(entities) {
    const used = new Set(entities.filter((e) => e && e.tag_id != null).map((e) => String(e.tag_id)));
    let id = 0;
    while (used.has(String(id))) id++;
    return String(id);
  }

  /** text_extra baru: entity lama (tanpa mention kita) + entity mention untuk tanda tangan di newText. */
  function buildTextExtra(oldExtra, oldText, newText) {
    const entities = (Array.isArray(oldExtra) ? oldExtra : []).filter((e) => !isOurMention(e, oldText));
    const signatureAt = newText.lastIndexOf(signatureLine());
    if (signatureAt === -1) return entities;

    let cursor = signatureAt + SIGNATURE_LABEL.length;
    for (const m of MENTIONS) {
      const label = mentionText(m);
      const start = newText.indexOf(label, cursor);
      if (start === -1) continue;

      const entity = {
        start,
        end: start + label.length,
        user_id: String(m.uid || '0'),
        type: 0,
        hashtag_name: String(m.handle).replace(/^@/, ''),
        tag_id: nextTagId(entities)
      };
      if (m.secUid) entity.sec_uid = String(m.secUid);
      entities.push(entity);
      cursor = start + label.length;
    }
    return entities;
  }

  /** markup_text baru: markup lama tanpa tanda tangan + baris tanda tangan dengan tag <m id="..">. */
  function buildMarkup(oldMarkup, textExtra, newText) {
    const base = removeSignature(oldMarkup, true);
    const mentionTags = MENTIONS.map((m) => {
      const label = mentionText(m);
      const at = newText.lastIndexOf(label);
      const entity = (textExtra || []).find((e) => e && Number(e.type) === 0 &&
        String(e.user_id || '') === String(m.uid || '0') &&
        Number(e.start) === at && Number(e.end) === at + label.length);
      const id = entity && entity.tag_id != null ? entity.tag_id : '0';
      return '<m id="' + escapeAttr(id) + '">' + escapeHtml(label) + '</m>';
    });
    const signatureMarkup = escapeHtml(SIGNATURE_LABEL) + mentionTags.join(' ');
    return base ? base + '\n\n' + signatureMarkup : signatureMarkup;
  }

  /* ---------- body publish ---------- */
  function isPublishUrl(url) {
    if (typeof url !== 'string') return false;
    if (url.includes('tiktok/web/project/post/v1/')) return true;
    if (url.includes('/music/') || url.includes('/sound/') || url.includes('music_id')) return false;
    return /(?:\/project\/post|\/publish\/|\/aweme\/v1\/create|\/item\/create)/i.test(url);
  }

  function looksLikePublishBody(b) {
    return !!(b && typeof b === 'object' && (
      Array.isArray(b.single_post_req_list) || Array.isArray(b.post_items) || Array.isArray(b.item_list) ||
      b.post_common_info || b.item_common_info || b.publish_info || b.item_info));
  }

  function applyToBody(body) {
    // Bentuk utama TikTok Studio: single_post_req_list[].single_post_feature_info
    if (Array.isArray(body.single_post_req_list)) {
      body.single_post_req_list.forEach((req) => {
        const info = req?.single_post_feature_info;
        if (!info || typeof info !== 'object') return;

        const original = info.text || info.markup_text || '';
        const cleanText = removeSignature(original, false);
        const newText = withSignature(cleanText);
        const newExtra = buildTextExtra(info.text_extra || req.text_extra, String(info.text || removeSignature(info.markup_text || '', false)), newText);
        const newMarkup = buildMarkup(info.markup_text || escapeHtml(cleanText), newExtra, newText);

        info.text = newText;
        info.markup_text = newMarkup;
        info.text_extra = newExtra;
        if (req.text_extra !== undefined) req.text_extra = newExtra;
        if (req.text !== undefined) req.text = newText;
        if (req.markup_text !== undefined) req.markup_text = newMarkup;
      });
      return;
    }

    // Bentuk lain: kolom caption polos
    ['caption', 'desc', 'description', 'title', 'text', 'video_description'].forEach((key) => {
      if (typeof body[key] === 'string' && body[key].length) body[key] = withSignature(body[key]);
    });
  }

  const processed = new WeakSet();

  function transformJsonString(raw) {
    if (typeof raw !== 'string') return raw;
    try {
      const body = JSON.parse(raw);
      if (looksLikePublishBody(body) && !processed.has(body)) {
        processed.add(body);
        applyToBody(body);
      }
      return JSON.stringify(body);
    } catch (_) {
      return raw;
    }
  }

  /* ---------- fetch & XHR ---------- */
  const realFetch = window.fetch;
  if (typeof realFetch === 'function') {
    window.fetch = async function (input, init = {}) {
      let nextInput = input, nextInit = init;
      const url = typeof input === 'string' ? input : input?.url || '';

      if (captionEnabled() && isPublishUrl(url)) {
        try { await resolveMentions(8000); } catch (_) {}
        try {
          if (typeof nextInit?.body === 'string') {
            const body = transformJsonString(nextInit.body);
            if (body !== nextInit.body) nextInit = { ...nextInit, body };
          } else if (typeof Request !== 'undefined' && input instanceof Request && !nextInit?.body) {
            const method = String(input.method || 'GET').toUpperCase();
            if (method !== 'GET' && method !== 'HEAD') {
              const raw = await input.clone().text();
              const body = transformJsonString(raw);
              if (body !== raw) nextInput = new Request(input, { body });
            }
          }
        } catch (_) {}
      }
      return realFetch.call(this, nextInput, nextInit);
    };
  }

  const xhrProto = window.XMLHttpRequest?.prototype;
  if (xhrProto) {
    const realOpen = xhrProto.open;
    const realSend = xhrProto.send;

    xhrProto.open = function (method, url) {
      this.__rehineCaptionUrl = url;
      return realOpen.apply(this, arguments);
    };

    xhrProto.send = function (body) {
      let nextBody = body;
      const url = this.__rehineCaptionUrl || '';
      if (captionEnabled() && isPublishUrl(url) && typeof body === 'string') {
        try { nextBody = transformJsonString(body); } catch (_) {}
      }
      return realSend.call(this, nextBody);
    };
  }

  /* ---------- balasan probe untuk status badge ---------- */
  window.addEventListener('message', (e) => {
    const d = e.data;
    if (e.source !== window || !d || d.type !== '__REHINE_STATUS_PROBE__') return;
    window.postMessage({ type: '__REHINE_STATUS_READY__', nonce: d.nonce, hook: 'caption' }, location.origin);
  });
})();
