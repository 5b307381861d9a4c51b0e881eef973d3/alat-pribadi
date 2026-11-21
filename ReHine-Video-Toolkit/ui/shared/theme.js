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
    { id: 'rose',   id_name: 'Mawar',  en_name: 'Rose',   bg: '#fff0f4', accent: '#e11d63' },
    { id: 'merah',    id_name: 'Merah',    en_name: 'Crimson',  bg: '#150808', accent: '#ef4444' },
    { id: 'emas',     id_name: 'Emas',     en_name: 'Gold',     bg: '#14110a', accent: '#f5b301' },
    { id: 'pink',     id_name: 'Pink',     en_name: 'Pink',     bg: '#1a0a14', accent: '#ff4fa3' },
    { id: 'mint',     id_name: 'Mint',     en_name: 'Mint',     bg: '#06161a', accent: '#2dd4bf' },
    { id: 'indigo',   id_name: 'Indigo',   en_name: 'Indigo',   bg: '#0a0d1f', accent: '#6366f1' },
    { id: 'abu',      id_name: 'Abu',      en_name: 'Slate',    bg: '#101214', accent: '#94a3b8' },
    { id: 'kopi',     id_name: 'Kopi',     en_name: 'Coffee',   bg: '#16100c', accent: '#c98a4b' },
    { id: 'dracula',  id_name: 'Dracula',  en_name: 'Dracula',  bg: '#1e1f29', accent: '#bd93f9' },
    { id: 'langit',   id_name: 'Langit',   en_name: 'Sky',      bg: '#eef7ff', accent: '#0ea5e9' },
    { id: 'lavender', id_name: 'Lavender', en_name: 'Lavender', bg: '#f5f0ff', accent: '#8b5cf6' },
    { id: 'neonpink', id_name: 'Neon Pink', en_name: 'Neon Pink', bg: '#0f0210', accent: '#ff2bd6' },
    // --- Desain AI modern (latar gradasi + permukaan kaca) ---
    { id: 'aurora',   ai: 1, id_name: 'Aurora',   en_name: 'Aurora',   bg: '#0b1d2e', accent: '#5eead4' },
    { id: 'nebula',   ai: 1, id_name: 'Nebula',   en_name: 'Nebula',   bg: '#1a0f33', accent: '#c084fc' },
    { id: 'prisma',   ai: 1, id_name: 'Prisma',   en_name: 'Prisma',   bg: '#12142b', accent: '#7c9cff' },
    { id: 'kuantum',  ai: 1, id_name: 'Kuantum',  en_name: 'Quantum',  bg: '#06202e', accent: '#22d3ee' },
    { id: 'zamrud',   ai: 1, id_name: 'Zamrud',   en_name: 'Emerald',  bg: '#0d1714', accent: '#10a37f' },
    { id: 'grafit',   ai: 1, id_name: 'Grafit',   en_name: 'Graphite', bg: '#17181b', accent: '#e5e7eb' },
    { id: 'clay',     ai: 1, id_name: 'Tanah Liat', en_name: 'Clay',   bg: '#f4efe7', accent: '#d97757' },
    { id: 'kaca',     ai: 1, id_name: 'Kaca',     en_name: 'Glass',    bg: '#e6ecff', accent: '#6366f1' }
  ];
  const valid = (id) => THEMES.some((t) => t.id === id);

  function apply(id) {
    const theme = valid(id) ? id : 'hitam';
    if (theme === 'hitam') document.documentElement.removeAttribute('data-theme');
    else document.documentElement.setAttribute('data-theme', theme);
    document.querySelectorAll('.theme-item').forEach((b) => b.setAttribute('aria-checked', String(b.dataset.theme === theme)));
    const cur = THEMES.find((t) => t.id === theme);
    const sw = document.getElementById('themeBtnSw');
    if (sw && cur) { sw.style.setProperty('--sw-bg', cur.bg); sw.style.setProperty('--sw-accent', cur.accent); }
    return theme;
  }

  let saved = null;
  try { saved = localStorage.getItem(KEY); } catch (_) {}
  apply(saved);

  document.addEventListener('DOMContentLoaded', () => {
    const grid = document.getElementById('themeRow');
    if (!grid) return;
    const btn = document.getElementById('themeBtn');
    const pop = document.getElementById('themePop');
    const lang = () => (document.documentElement.lang === 'id' ? 'id' : 'en');

    const setOpen = (open) => {
      if (!pop || !btn) return;
      pop.hidden = !open;
      document.body.classList.toggle('theme-open', open);
      btn.setAttribute('aria-expanded', String(open));
    };

    function build() {
      const btnText = document.getElementById('themeBtnText');
      if (btnText) btnText.textContent = lang() === 'id' ? 'Tema' : 'Theme';
      grid.replaceChildren();
      const heading = (txt) => { const h = document.createElement('div'); h.className = 'theme-group'; h.textContent = txt; grid.append(h); };
      const ordered = THEMES.filter((t) => t.ai).concat(THEMES.filter((t) => !t.ai));
      let lastAi = null;
      ordered.forEach((t) => {
        if (lastAi !== !!t.ai) { lastAi = !!t.ai; heading(t.ai ? (lang() === 'id' ? 'DESAIN AI MODERN' : 'MODERN AI DESIGN') : (lang() === 'id' ? 'KLASIK' : 'CLASSIC')); }
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'theme-item';
        b.dataset.theme = t.id;
        b.setAttribute('role', 'radio');
        b.title = b.ariaLabel = t[lang() + '_name'];
        const dot = document.createElement('span');
        dot.className = 'theme-dot';
        dot.style.setProperty('--sw-bg', t.bg);
        dot.style.setProperty('--sw-accent', t.accent);
        const name = document.createElement('span');
        name.className = 'theme-name';
        name.textContent = t[lang() + '_name'];
        b.append(dot, name);
        b.addEventListener('click', () => {
          const id = apply(t.id);
          try { localStorage.setItem(KEY, id); } catch (_) {}
          try { chrome.storage.local.set({ [KEY]: id }); } catch (_) {}
          setOpen(false);
        });
        grid.append(b);
      });
      apply(document.documentElement.getAttribute('data-theme') || 'hitam');
    }
    build();
    // bahasa bisa berubah dari popup.js; bangun ulang label saat atribut lang berubah
    new MutationObserver(build).observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] });

    if (btn && pop) {
      btn.addEventListener('click', (e) => { e.stopPropagation(); setOpen(pop.hidden); });
      document.addEventListener('click', (e) => { if (!pop.hidden && !pop.contains(e.target) && !btn.contains(e.target)) setOpen(false); });
      document.addEventListener('keydown', (e) => { if (e.key === 'Escape') setOpen(false); });
    }

    try {
      chrome.storage.local.get({ [KEY]: null }, (r) => {
        if (r && valid(r[KEY]) && r[KEY] !== (saved || 'hitam')) { apply(r[KEY]); try { localStorage.setItem(KEY, r[KEY]); } catch (_) {} }
      });
    } catch (_) {}
  });
})();
