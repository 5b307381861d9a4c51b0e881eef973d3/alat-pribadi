// RE:HINE - Desktop mode (lapisan halaman). Berjalan di MAIN world, document_start.
// Hanya aktif di perangkat mobile; di PC langsung keluar.
(() => {
  'use strict';
  const realUA = navigator.userAgent || '';
  if (!/Android|iPhone|iPad|iPod|Mobile/i.test(realUA)) return;
  if (window.__rehineDesktop) return;
  try { Object.defineProperty(window, '__rehineDesktop', { value: true }); } catch (e) {}

  const m = realUA.match(/Chrome\/(\d+)/);
  const major = m ? m[1] : '130';
  const full = major + '.0.0.0';
  const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/' + full + ' Safari/537.36';

  const def = (obj, prop, val) => {
    try { Object.defineProperty(obj, prop, { get: () => val, configurable: true, enumerable: true }); } catch (e) {}
  };
  const proto = Object.getPrototypeOf(navigator);
  def(proto, 'userAgent', UA);
  def(proto, 'appVersion', UA.replace('Mozilla/5.0 ', ''));
  def(proto, 'platform', 'Win32');

  if ('userAgentData' in navigator) {
    const brands = [
      { brand: 'Chromium', version: major },
      { brand: 'Google Chrome', version: major },
      { brand: 'Not=A?Brand', version: '24' }
    ];
    const uad = {
      brands, mobile: false, platform: 'Windows',
      getHighEntropyValues: async () => ({
        brands, mobile: false, platform: 'Windows', platformVersion: '10.0.0',
        architecture: 'x86', bitness: '64', model: '', wow64: false, uaFullVersion: full,
        fullVersionList: brands.map((b) => ({ brand: b.brand, version: b.version === '24' ? '24.0.0.0' : full }))
      }),
      toJSON: () => ({ brands, mobile: false, platform: 'Windows' })
    };
    def(proto, 'userAgentData', uad);
  }

  // Viewport selebar desktop (hanya frame utama), supaya layout tidak jatuh ke mode HP.
  if (window.top === window) {
    const CONTENT = 'width=1280';
    const ensure = () => {
      const root = document.head || document.documentElement;
      if (!root) return;
      let metas = document.querySelectorAll('meta[name="viewport"]');
      if (!metas.length) {
        const meta = document.createElement('meta');
        meta.name = 'viewport';
        root.appendChild(meta);
        metas = [meta];
      }
      metas.forEach((meta) => { if (meta.content !== CONTENT) meta.content = CONTENT; });
    };
    ensure();
    const obs = new MutationObserver(ensure);
    obs.observe(document, { childList: true, subtree: true, attributes: true, attributeFilter: ['content'] });
    window.addEventListener('load', () => obs.disconnect(), { once: true });
  }
})();
