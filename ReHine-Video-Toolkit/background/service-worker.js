try { if (typeof importScripts === 'function') importScripts("desktop-rule.js", "api-headers.js"); } catch (e) {}
try {
  // Deskripsi di popup dikosongkan setiap extension di-refresh/di-reload/diperbarui.
  chrome.runtime.onInstalled.addListener(() => { try { chrome.storage.local.remove(['rehineDesc', 'rehineDescOn', 'rehineMention']); } catch (e) {} RehineDesktop.ensure(); RehineApiHeaders.ensure(); });
  chrome.runtime.onStartup.addListener(() => { try { chrome.storage.local.remove(['rehineDesc', 'rehineDescOn', 'rehineMention']); } catch (e) {} RehineDesktop.ensure(); RehineApiHeaders.ensure(); });
  RehineDesktop.ensure();
  RehineApiHeaders.ensure();
} catch (e) { console.warn('[RE:HINE] background:', e); }
