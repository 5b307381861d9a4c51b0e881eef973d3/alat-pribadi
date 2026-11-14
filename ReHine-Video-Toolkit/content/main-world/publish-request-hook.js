// RE:HINE — publish request hook (MAIN world, document_start).
// Pada request publish TikTok:
//   1. menambahkan hashtag ke caption   -> aktif saat saklar CAPTION menyala
//   2. memaksa post jadi Private        -> aktif saat saklar UPLOADER menyala
// Tanda tangan "Metode upload by @ariefee10" ditambahkan terpisah oleh caption-signature-hook.js.
(() => {
  'use strict';
  if (window.__REHINE_REQUEST_HOOK__) return;
  window.__REHINE_REQUEST_HOOK__ = true;

  /* ---------- pengaturan (ubah di sini) ---------- */
  const HASHTAG_LIST = []; // kosong = tidak ada hashtag; isi mis. ['#contoh'] untuk menambahkan
  const FORCE_PRIVATE = true;                             // false = jangan ubah privasi

  const flag = (name) => !(document.documentElement && document.documentElement.dataset[name] === '0');
  const uploaderEnabled = () => flag('rehineOn');
  const captionEnabled = () => flag('rehineCaption');
  const ds = (k) => (document.documentElement && document.documentElement.dataset[k]) || '';
  // Tagar otomatis (resolusi + fps) dari popup: aktif bila saklar TAGAR OTOMATIS menyala (tidak butuh CAPTION)
  const autoTags = () => (ds('rehineAutoTags') === '1' ? ds('rehineVideoTags').split(/\s+/).filter((t) => /^#[\p{L}\p{N}_]+$/u.test(t)) : []);
  const hashtags = () => (captionEnabled() ? HASHTAG_LIST : []).concat(autoTags());
  // Deskripsi manual dari popup: menggantikan caption yang diketik di TikTok Studio (kosong = caption Studio dipakai)
  const description = () => ds('rehineDescOn') !== '1' ? '' : ds('rehineDesc').replace(/\r\n?/g, '\n').trim();
  const wantsEdit = () => uploaderEnabled() || captionEnabled() || !!description() || autoTags().length > 0;
  const escHtml = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  // Teks deskripsi -> {text, markup, extra}; #tagar di dalamnya jadi entity hashtag sungguhan
  function richFromDesc(desc) {
    const extra = [], re = /#[\p{L}\p{N}_]+/gu;
    let markup = '', last = 0, m;
    while ((m = re.exec(desc))) {
      const id = String(extra.length);
      extra.push({ start: m.index, end: m.index + m[0].length, type: 1, hashtag_name: m[0].slice(1), user_id: '', tag_id: id });
      markup += escHtml(desc.slice(last, m.index)) + '<h id="' + id + '">' + m[0] + '</h>';
      last = m.index + m[0].length;
    }
    return { text: desc, markup: markup + escHtml(desc.slice(last)), extra };
  }

  /* ---------- util ---------- */
  const norm = (k) => String(k).replace(/[-_]/g, '').toLowerCase();
  const isObj = (v) => v !== null && typeof v === 'object';
  const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const CAPTION_KEYS = new Set(['title', 'description', 'desc', 'caption', 'captiontext', 'postdescription', 'postdesc', 'text']);
  const CONTAINER_KEYS = new Set(['postinfo', 'publishinfo', 'post', 'publish', 'creationinfo', 'videopostinfo', 'photopostinfo',
    'data', 'payload', 'params', 'singlepostreqlist', 'singlepostfeatureinfo', 'featurecommoninfolist', 'privacysettinginfo']);
  const POST_URL = /project\/post|post\/(?:publish|create|item)|creator\/(?:post|publish)|aweme\/v1\/create|item\/create/i;

  function isPostUrl(u) {
    try {
      const x = new URL(String(u || ''), location.href);
      return /(^|\.)tiktok\.com$/i.test(x.hostname) && POST_URL.test(x.pathname + x.search);
    } catch (_) { return false; }
  }
  const tryParse = (s) => { try { return JSON.parse(s); } catch (_) { return null; } };
  const tagRe = (t) => new RegExp('(^|[^\\p{L}\\p{M}\\p{N}_#])(' + esc(t) + ')(?=$|[^\\p{L}\\p{M}\\p{N}_])', 'iu');
  const hasTag = (s, t) => tagRe(t).test(s);

  /* ---------- privasi ---------- */
  function forcePrivate(p) {
    let ch = false;
    if (Object.prototype.hasOwnProperty.call(p, 'visibility_type') && String(p.visibility_type) !== '1') {
      p.visibility_type = typeof p.visibility_type === 'string' ? '1' : 1; ch = true;
    }
    if (typeof p.privacy_level === 'string' && p.privacy_level !== 'SELF_ONLY') { p.privacy_level = 'SELF_ONLY'; ch = true; }
    return ch;
  }

  /* ---------- caption ---------- */
  const appendPlain = (s0) => {
    const s = description() || s0;
    const miss = hashtags().filter((t) => !hasTag(s, t));
    if (!miss.length) return s;
    const base = s.replace(/\s+$/u, '');
    return base ? base + '\n\n' + miss.join(' ') : miss.join(' ');
  };

  // caption "kaya": text + markup_text + text_extra (hashtag harus jadi entity sungguhan)
  function addRich(o) {
    let replaced = false;
    const desc = description();
    if (desc) {
      const r = richFromDesc(desc);
      const same = o.text === r.text && o.markup_text === r.markup;
      if (!same) {
        o.text = r.text; o.markup_text = r.markup;
        o.text_extra = typeof o.text_extra === 'string' ? JSON.stringify(r.extra) : r.extra;
        replaced = true;
      }
    }
    const text = o.text;
    const markup = typeof o.markup_text === 'string' ? o.markup_text : text;
    const plainMarkup = markup.replace(/<\/?[hm]\b[^>]*>/gi, '');
    const missText = hashtags().filter((t) => !hasTag(text, t));
    const missMarkup = hashtags().filter((t) => !hasTag(plainMarkup, t));
    const todo = hashtags().filter((t) => missText.includes(t) || missMarkup.includes(t));
    if (!todo.length) return replaced;

    const newText = missText.length ? (text ? text + '\n\n' : '') + missText.join(' ') : text;
    const asString = typeof o.text_extra === 'string';
    let extra = o.text_extra == null ? [] : o.text_extra;
    if (asString) { extra = tryParse(extra); }
    if (!Array.isArray(extra)) return replaced;

    const used = new Set(extra.map((e) => String(e && e.tag_id)));
    for (const m of markup.matchAll(/<[hm]\b[^>]*\bid=["']([^"']+)["']/gi)) used.add(m[1]);
    let next = 0;
    const tail = [];
    for (const t of todo) {
      const m = tagRe(t).exec(newText);
      if (!m) continue;
      const start = m.index + m[1].length;
      let ent = extra.find((e) => e && e.type === 1 && e.start === start && String(e.hashtag_name).toLowerCase() === t.slice(1).toLowerCase());
      if (!ent) {
        const inMarkup = new RegExp('<h\\b[^>]*\\bid=["\']([^"\']+)["\'][^>]*>' + esc(t) + '</h>', 'i').exec(markup);
        let id;
        if (inMarkup) id = inMarkup[1];
        else { while (used.has(String(next))) next++; id = String(next++); }
        used.add(id);
        ent = { start, end: start + t.length, type: 1, hashtag_name: t.slice(1), user_id: '', tag_id: id };
        extra.push(ent);
      }
      if (missMarkup.includes(t)) tail.push('<h id="' + ent.tag_id + '">' + t + '</h>');
    }
    o.text = newText;
    o.markup_text = markup + (tail.length ? (markup ? '\n\n' : '') + tail.join(' ') : '');
    o.text_extra = asString ? JSON.stringify(extra) : extra;
    return true;
  }

  const isRich = (o, key) => typeof o.text === 'string' &&
    (norm(key) === 'singlepostfeatureinfo' || typeof o.markup_text === 'string' || Array.isArray(o.text_extra));

  /* ---------- telusuri body ---------- */
  function walk(node, key, st) {
    if (!isObj(node) || st.seen.has(node)) return false;
    st.seen.add(node);
    let ch = false;
    if (Array.isArray(node)) { for (const v of node) ch = walk(v, key, st) || ch; return ch; }
    for (const [k, v] of Object.entries(node)) {
      if (FORCE_PRIVATE && uploaderEnabled() && norm(k) === 'privacysettinginfo' && isObj(v)) ch = forcePrivate(v) || ch;
      if (isObj(v)) ch = walk(v, k, st) || ch;
      else if (typeof v === 'string' && CONTAINER_KEYS.has(norm(k))) {
        const inner = tryParse(v);
        if (isObj(inner) && walk(inner, k, st)) { node[k] = JSON.stringify(inner); ch = true; }
      }
    }
    if ((hashtags().length || description()) && isRich(node, key)) { st.rich = true; ch = addRich(node) || ch; }
    return ch;
  }

  // caption polos (tanpa markup_text/text_extra): cari kolom caption pertama
  function findPlain(node, seen) {
    if (!isObj(node) || seen.has(node)) return null;
    seen.add(node);
    if (!Array.isArray(node)) {
      for (const [k, v] of Object.entries(node)) {
        if (CONTAINER_KEYS.has(norm(k))) {
          if (isObj(v)) { const r = findPlain(v, seen); if (r) return r; }
          else if (typeof v === 'string') {
            const inner = tryParse(v);
            const r = isObj(inner) ? findPlain(inner, seen) : null;
            if (r) return { ...r, commit: () => { r.commit && r.commit(); node[k] = JSON.stringify(inner); } };
          }
        }
      }
      const keys = Object.keys(node).filter((k) => typeof node[k] === 'string' && CAPTION_KEYS.has(norm(k)))
        .sort((a, b) => (norm(a) === 'title' ? -1 : norm(b) === 'title' ? 1 : 0));
      if (keys.length) return { owner: node, key: keys[0] };
    }
    for (const v of (Array.isArray(node) ? node : Object.values(node))) {
      if (isObj(v)) { const r = findPlain(v, seen); if (r) return r; }
    }
    return null;
  }

  function transform(root) {
    if (!isObj(root)) return false;
    const st = { seen: new Set(), rich: false };
    let ch = walk(root, '', st);
    if ((hashtags().length || description()) && !st.rich) {
      const f = findPlain(root, new Set());
      if (f) {
        const old = f.owner[f.key], neu = appendPlain(old);
        if (neu !== old) {
          for (const [k, v] of Object.entries(f.owner)) if (CAPTION_KEYS.has(norm(k)) && v === old) f.owner[k] = neu;
          f.commit && f.commit();
          ch = true;
        }
      }
    }
    return ch;
  }

  /* ---------- format body ---------- */
  function fromString(s) {
    if (typeof s !== 'string' || !s) return { body: s, changed: false };
    const j = tryParse(s);
    if (isObj(j)) return transform(j) ? { body: JSON.stringify(j), changed: true } : { body: s, changed: false };
    try {
      const p = new URLSearchParams(s), o = Object.fromEntries(p);
      if (!transform(o)) return { body: s, changed: false };
      for (const [k, v] of Object.entries(o)) if (v !== p.get(k)) p.set(k, typeof v === 'string' ? v : JSON.stringify(v));
      return { body: p.toString(), changed: true };
    } catch (_) { return { body: s, changed: false }; }
  }
  function fromForm(fd) {
    const o = {}, out = new FormData();
    for (const [k, v] of fd.entries()) { if (typeof v === 'string') o[k] = v; out.append(k, v); }
    if (!transform(o)) return { body: fd, changed: false };
    for (const [k, v] of Object.entries(o)) if (v !== fd.get(k)) out.set(k, typeof v === 'string' ? v : JSON.stringify(v));
    return { body: out, changed: true };
  }
  function fromSync(b) {
    if (typeof b === 'string') return fromString(b);
    if (b instanceof URLSearchParams) { const r = fromString(b.toString()); return r.changed ? { body: new URLSearchParams(r.body), changed: true } : { body: b, changed: false }; }
    if (typeof FormData !== 'undefined' && b instanceof FormData) return fromForm(b);
    return { body: b, changed: false };
  }
  async function fromAny(b) {
    const r = fromSync(b);
    if (r.changed || r.body !== b) return r;
    if (typeof Blob !== 'undefined' && b instanceof Blob && /json|text|javascript/i.test(b.type || '')) {
      const t = fromString(await b.text());
      return t.changed ? { body: new Blob([t.body], { type: b.type }), changed: true } : { body: b, changed: false };
    }
    return { body: b, changed: false };
  }

  /* ---------- fetch & XHR ---------- */
  const realFetch = window.fetch;
  if (typeof realFetch === 'function') {
    window.fetch = async function (input, init) {
      try {
        const req = typeof Request !== 'undefined' && input instanceof Request ? input : null;
        const url = req ? req.url : input;
        const method = String((init && init.method) || (req && req.method) || 'GET').toUpperCase();
        if (method === 'POST' && wantsEdit() && isPostUrl(url)) {
          if (init && init.body !== undefined) {
            const r = await fromAny(init.body);
            if (r.changed) return realFetch.call(this, input, { ...init, body: r.body });
          } else if (req) {
            const r = fromString(await req.clone().text());
            if (r.changed) return realFetch.call(this, new Request(req, { body: r.body }));
          }
        }
      } catch (_) {}
      return realFetch.apply(this, arguments);
    };
  }
  const XP = window.XMLHttpRequest && XMLHttpRequest.prototype;
  if (XP) {
    const open = XP.open, send = XP.send;
    XP.open = function (method, url) {
      this.__rehineReq = { m: String(method || 'GET').toUpperCase(), u: String(url || '') };
      return open.apply(this, arguments);
    };
    XP.send = function (body) {
      try {
        const q = this.__rehineReq;
        if (q && q.m === 'POST' && wantsEdit() && isPostUrl(q.u)) {
          const r = fromSync(body);
          if (r.changed) return send.call(this, r.body);
        }
      } catch (_) {}
      return send.apply(this, arguments);
    };
  }

  /* ---------- balasan probe untuk status badge ---------- */
  window.addEventListener('message', (e) => {
    const d = e.data;
    if (e.source !== window || !d || d.type !== '__REHINE_STATUS_PROBE__') return;
    window.postMessage({ type: '__REHINE_STATUS_READY__', nonce: d.nonce, hook: 'post' }, location.origin);
  });
})();
