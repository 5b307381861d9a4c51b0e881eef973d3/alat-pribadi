// RE:HINE - pilihan tema popup.
// Tema disimpan di localStorage (supaya terpasang sebelum halaman tampil, tanpa berkedip)
// dan di chrome.storage.local (sebagai cadangan).
(() => {
  'use strict';
  const KEY = 'rehineTheme';
  const THEMES = [
    { id: 'hitam',  id_name: 'Hitam',  en_name: 'Black',  bg: '#0D0D0F', accent: '#FE2B54' },
    { id: 'putih',  id_name: 'Putih',  en_name: 'White',  bg: '#f6f6f7', accent: '#FE2B54' },
    { id: 'ungu',   id_name: 'Ungu',   en_name: 'Purple', bg: '#0f0a1f', accent: '#a855f7' },
    { id: 'laut',   id_name: 'Laut',   en_name: 'Ocean',  bg: '#07131f', accent: '#22b8f0' },
    { id: 'hijau',  id_name: 'Hijau',  en_name: 'Green',  bg: '#08140e', accent: '#2ecc71' },
    { id: 'sunset', id_name: 'Senja', en_name: 'Sunset', bg: '#1a0d0a', accent: '#ff7a2f' },
    { id: 'neon',      id_name: 'Neon',       en_name: 'Neon',       bg: '#05020f', accent: '#00f0ff' },
    { id: 'neonhijau', id_name: 'Neon Hijau', en_name: 'Neon Green', bg: '#020a05', accent: '#39ff14' },
    { id: 'rose',   id_name: 'Mawar',  en_name: 'Rose',   bg: '#fff0f4', accent: '#e11d63' }
  ];
  const valid = (id) => THEMES.some((t) => t.id === id);

  function apply(id) {
    const theme = valid(id) ? id : 'hitam';
    if (theme === 'hitam') document.documentElement.removeAttribute('data-theme');
    else document.documentElement.setAttribute('data-theme', theme);
    document.querySelectorAll('.theme-dot').forEach((b) => b.setAttribute('aria-checked', String(b.dataset.theme === theme)));
    return theme;
  }

  let saved = null;
  try { saved = localStorage.getItem(KEY); } catch (_) {}
  apply(saved);

  document.addEventListener('DOMContentLoaded', () => {
    const row = document.getElementById('themeRow');
    if (!row) return;
    const lang = () => (document.documentElement.lang === 'id' ? 'id' : 'en');
    const label = document.getElementById('themeLabel');

    function build() {
      if (label) label.textContent = lang() === 'id' ? 'TEMA' : 'THEME';
      row.replaceChildren();
      THEMES.forEach((t) => {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'theme-dot';
        b.dataset.theme = t.id;
        b.setAttribute('role', 'radio');
        b.title = b.ariaLabel = t[lang() + '_name'];
        b.style.setProperty('--sw-bg', t.bg);
        b.style.setProperty('--sw-accent', t.accent);
        b.addEventListener('click', () => {
          const id = apply(t.id);
          try { localStorage.setItem(KEY, id); } catch (_) {}
          try { chrome.storage.local.set({ [KEY]: id }); } catch (_) {}
        });
        row.append(b);
      });
      apply(document.documentElement.getAttribute('data-theme') || 'hitam');
    }
    build();
    // bahasa bisa berubah dari popup.js; bangun ulang label saat atribut lang berubah
    new MutationObserver(build).observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] });

    try {
      chrome.storage.local.get({ [KEY]: null }, (r) => {
        if (r && valid(r[KEY]) && r[KEY] !== (saved || 'hitam')) { apply(r[KEY]); try { localStorage.setItem(KEY, r[KEY]); } catch (_) {} }
      });
    } catch (_) {}
  });
})();
