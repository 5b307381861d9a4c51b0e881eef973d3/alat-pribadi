// RE:HINE — klik versi 3x: tampil QR + tombol salin untuk URL unduhan repo.
(() => {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const data = window.REHINE_QR;
  const ver = $('footVer'), modal = $('qrModal');
  if (!data || !ver || !modal) return;
  const NS = 'http://www.w3.org/2000/svg';
  const L = {
    id: { close: 'Tutup', copy: 'Salin', copied: 'Tersalin!' },
    en: { close: 'Close', copy: 'Copy', copied: 'Copied!' }
  };
  const lang = () => (document.documentElement.lang === 'id' ? 'id' : 'en');

  // QR: kotak putih + zona tenang 4 modul supaya mudah dipindai
  const svg = $('qrSvg'), q = 4, n = data.size;
  svg.setAttribute('viewBox', '0 0 ' + (n + 2 * q) + ' ' + (n + 2 * q));
  const bg = document.createElementNS(NS, 'rect');
  bg.setAttribute('width', n + 2 * q); bg.setAttribute('height', n + 2 * q); bg.setAttribute('fill', '#fff');
  const p = document.createElementNS(NS, 'path');
  p.setAttribute('d', data.path); p.setAttribute('transform', 'translate(' + q + ' ' + q + ')'); p.setAttribute('fill', '#000'); p.setAttribute('shape-rendering', 'crispEdges');
  svg.append(bg, p);

  const labels = () => { $('qrClose').textContent = L[lang()].close; $('qrCopy').textContent = L[lang()].copy; };
  const show = (on) => { modal.hidden = !on; if (on) { labels(); $('qrCopy').focus(); } };

  let taps = 0, timer = null;
  ver.addEventListener('click', () => {
    taps++; clearTimeout(timer); timer = setTimeout(() => { taps = 0; }, 2000);
    if (taps >= 3) { taps = 0; show(true); }
  });
  // QR hanya ditutup lewat tombol Tutup (klik di luar kartu / Esc tidak menutup)
  $('qrClose').addEventListener('click', () => show(false));

  $('qrCopy').addEventListener('click', async () => {
    let ok = false;
    try { await navigator.clipboard.writeText(data.url); ok = true; } catch (_) {}
    if (!ok) {
      try {
        const ta = document.createElement('textarea'); ta.value = data.url; ta.style.position = 'fixed'; ta.style.opacity = '0';
        document.body.append(ta); ta.select(); ok = document.execCommand('copy'); ta.remove();
      } catch (_) {}
    }
    if (ok) { const b = $('qrCopy'); b.textContent = L[lang()].copied; setTimeout(labels, 1500); }
  });
})();
