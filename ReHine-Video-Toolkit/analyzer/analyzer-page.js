(() => {
  'use strict';
  const input = document.getElementById('tiktok-url');
  const root = document.getElementById('analyzer');
  if (!input || !root || !window.ReHineCuteFishAnalyzer) {
    console.error('[ReHine] Analyzer initialization failed: required element or module missing.');
    return;
  }
  window.ReHineCuteFishAnalyzer.mount(root, () => {
    const value = input.value.trim();
    if (!value) { input.focus(); return ''; }
    return value;
  });
  input.addEventListener('keydown', event => {
    if (event.key === 'Enter') {
      event.preventDefault();
      root.querySelector('button.rh-primary')?.click();
    }
  });
})();
