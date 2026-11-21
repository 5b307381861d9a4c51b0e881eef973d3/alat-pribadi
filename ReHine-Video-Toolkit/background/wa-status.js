// Unggah video ke Status WhatsApp Web (mode W). Diadaptasi dari WA Status Video Uploader.
(() => {
try {
const WA_URL = "https://web.whatsapp.com/";
let busy = false;
let popupPort = null;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const ICON = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==";
function notify(msg) {
  try { chrome.notifications.create({ type: "basic", iconUrl: ICON, title: "RE:HINE · WhatsApp", message: String(msg).slice(0, 180), priority: 2 }); } catch (_) {}
}

async function report(msg) {
  try { await chrome.storage.session.set({ lastLog: { msg, ts: Date.now() } }); } catch (_) {}
  try { popupPort && popupPort.postMessage({ log: msg }); } catch (_) {}
}

async function openWa() {
  const tabs = await chrome.tabs.query({ url: WA_URL + "*" });
  if (tabs.length) return { tabId: tabs[0].id, windowId: tabs[0].windowId, created: false };
  try {
    const w = await chrome.windows.create({ url: WA_URL, type: "popup", focused: true, width: 1100, height: 800 });
    return { tabId: w.tabs[0].id, windowId: w.id, created: true };
  } catch (_) {   // mis. Kiwi/Android: tanpa jendela popup -> buka tab biasa di depan
    const t = await chrome.tabs.create({ url: WA_URL, active: true });
    return { tabId: t.id, windowId: t.windowId, created: true, isTab: true, ownTab: t.id };
  }

}

async function ensureContent(tabId) {
  try {
    const r = await chrome.tabs.sendMessage(tabId, { type: "ping" });
    if (r && r.ok) return r;
  } catch (_) {}
  try { await chrome.scripting.executeScript({ target: { tabId }, files: ["content/isolated/wa-status.js"] }); } catch (_) {}
  try { return await chrome.tabs.sendMessage(tabId, { type: "ping" }); } catch (_) { return null; }
}

// Tunggu sampai WA Web selesai memuat dan statusnya jelas
async function waitState(tabId, timeout = 45000) {
  report("Menunggu WhatsApp Web selesai dimuat...");
  const t0 = Date.now();
  let last = null;
  while (Date.now() - t0 < timeout) {
    const r = await ensureContent(tabId);
    const st = r && r.state;
    if (st === "chats") return "chats";
    if ((st === "qr" || st === "conflict") && st === last) return st;
    last = st || null;
    await sleep(1000);
  }
  return "unknown";
}

async function runJob(meta, chunks, caption, autoSend, focusWindow) {
  if (busy) return report("Masih ada proses berjalan, tunggu selesai.");
  busy = true;
  const keepAlive = setInterval(() => chrome.runtime.getPlatformInfo(), 20000);
  let o = null;
  let keepOpen = false, lastFail = '';
  try {
    await report("Membuka WhatsApp Web...");
    o = await openWa();
    const st = await waitState(o.tabId);
    if (st !== "chats") {
      keepOpen = true; notify(st === "qr" ? "Belum login WhatsApp Web. Scan QR di halaman WhatsApp, lalu unggah lagi." : "WhatsApp Web tidak siap. Lihat halaman WhatsApp.");
      throw new Error(
        st === "qr" ? "WhatsApp Web BELUM login. Login dulu (scan QR) lalu coba lagi."
        : st === "conflict" ? "WhatsApp Web sedang dipakai di jendela lain. Klik 'Gunakan di sini' lalu coba lagi."
        : "WhatsApp Web tidak selesai dimuat. Cek koneksi internet."
      );
    }
    if (true) {   // WhatsApp Web harus tampil di depan, kalau tidak browser menahan prosesnya
      await chrome.windows.update(o.windowId, { focused: true });
      await chrome.tabs.update(o.tabId, { active: true });
    }
    await report("Login terdeteksi. Mengirim video ke Status WhatsApp...");

    const port = chrome.tabs.connect(o.tabId, { name: "wa-upload" });
    const result = await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error("Proses terlalu lama (timeout 4 menit).")), 240000);
      port.onMessage.addListener((m) => {
        if (m.log) { report(m.log); if (/^GAGAL/.test(m.log)) lastFail = m.log.replace(/ \(daftar elemen.*$/, ''); }
        if (m.done) { clearTimeout(timer); resolve(m); }
      });
      port.onDisconnect.addListener(() => { clearTimeout(timer); reject(new Error("Koneksi ke WhatsApp Web terputus.")); });
      port.postMessage({ type: "meta", name: meta.name, mime: meta.mime, total: meta.total });
      chunks.forEach((data, index) => port.postMessage({ type: "chunk", index, data }));
      port.postMessage({ type: "run", caption, autoSend });
    });

    if (result.ok && !result.manual) {
      await report("Selesai: status terkirim ✅"); notify("Status WhatsApp terkirim ✅");
    } else {
      keepOpen = true; // gagal / mode cek manual: biarkan jendela terlihat
      if (o.created) chrome.windows.update(o.windowId, { focused: true });
      if (!result.ok) await report("Gagal di WhatsApp Web" + (lastFail ? " — " + lastFail : "") + ". Jendela WA dibiarkan terbuka untuk diagnosa.");
    }
  } catch (e) {
    await report("Error: " + e.message); if (!keepOpen) notify("Error: " + e.message);
  } finally {
    clearInterval(keepAlive);
    busy = false;
    if (o && o.created && !keepOpen) setTimeout(() => (o.isTab ? chrome.tabs.remove(o.tabId) : chrome.windows.remove(o.windowId)).catch(() => {}), 2500);
  }
}

chrome.runtime.onConnect.addListener((port) => {
  if (port.name !== "rehine-wa-upload") return;
  popupPort = port;
  let meta, chunks = [];
  port.onDisconnect.addListener(() => { if (popupPort === port) popupPort = null; });
  port.onMessage.addListener((m) => {
    if (m.type === "meta") { meta = m; chunks = new Array(m.total); }
    else if (m.type === "chunk") chunks[m.index] = m.data;
    else if (m.type === "run") runJob(meta, chunks, m.caption, m.autoSend, m.focusWindow);
  });
});


} catch (e) { console.warn('[RE:HINE] wa-status:', e); }
})();
