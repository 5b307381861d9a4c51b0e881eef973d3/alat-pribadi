(() => {
  if (window.__waStatusUploader) return;
  window.__waStatusUploader = true;

  /* ===== KONFIGURASI SELECTOR =====
     WhatsApp Web sering mengubah DOM. Kalau ada langkah gagal, edit daftar
     label/icon di bawah ini (cek lewat Inspect Element: aria-label / data-icon). */
  const CFG = {
    statusTab: { labels: ["status"], icons: ["status-refreshed", "status-outline", "status", "status-v3"] },
    addStatus: { labels: ["add status", "tambahkan status", "tambah status"], icons: ["plus-refreshed", "plus", "add-refreshed"] },
    mediaItem: { labels: ["photos & videos", "photos and videos", "foto & video", "foto dan video"] },
    addMore:   { labels: ["add file", "tambahkan file", "tambah file", "add more"], icons: ["plus", "plus-refreshed", "add-more-media-icon"] },
    del:       { labels: ["delete", "hapus", "remove"], icons: ["delete", "delete-refreshed", "trash", "wds-ic-delete-filled"] },
    send:      { labels: ["send", "kirim"], icons: ["wds-ic-send-filled", "send", "send-refreshed"] },
    caption:   '[aria-label*="caption" i],[aria-label*="keterangan" i]',
  };

  /* ===== UTIL ===== */
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  async function waitFor(fn, timeout = 15000, what = "elemen") {
    const t0 = Date.now();
    while (Date.now() - t0 < timeout) {
      const v = fn();
      if (v) return v;
      await sleep(250);
    }
    throw new Error("Timeout menunggu " + what);
  }

  /* ===== OVERLAY LOADING (menutupi langkah-langkah otomatis) ===== */
  const OVL_ID = "rehine-wa-ovl";
  let ovl = null;
  function ensureOverlay() {
    if (ovl && ovl.isConnected) return ovl;
    const st = document.createElement("style");
    st.textContent = `#${OVL_ID}{position:fixed;inset:0;z-index:999998;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:18px;background:radial-gradient(circle at 50% 35%,#2a0a14 0%,#0b0b0f 70%);color:#fff;font-family:system-ui,sans-serif;text-align:center;padding:24px}
#${OVL_ID} .o{width:84px;height:84px;border-radius:50%;border:3px solid rgba(255,255,255,.12);border-top-color:#ff2d55;border-right-color:#ff2d55;animation:rhwa 1s linear infinite;box-shadow:0 0 30px rgba(255,45,85,.45)}
#${OVL_ID} .w{position:relative;width:84px;height:84px}#${OVL_ID} .w .o{position:absolute;inset:0}#${OVL_ID} .p{position:absolute;inset:0;display:grid;place-items:center;font-weight:800;font-size:20px}
#${OVL_ID} .b{font-weight:800;letter-spacing:.18em;font-size:20px}#${OVL_ID} .b i{font-style:normal;color:#ff2d55}
#${OVL_ID} .t{font-size:13px;opacity:.8;min-height:22px;font-size:18px;font-weight:700}
#${OVL_ID} .bar{width:min(260px,70vw);height:6px;border-radius:99px;background:rgba(255,255,255,.12);overflow:hidden}
#${OVL_ID} .bar i{display:block;height:100%;width:5%;background:linear-gradient(90deg,#ff2d55,#ff7a93);border-radius:99px;transition:width .5s ease}
#${OVL_ID} .h{font-size:11px;opacity:.55}
@keyframes rhwa{to{transform:rotate(360deg)}}`;
    ovl = document.createElement("div");
    ovl.id = OVL_ID;
    ovl.innerHTML = '<div class="w"><div class="o"></div><div class="p">0%</div></div><div class="b">RE<i>:</i>HINE</div><div class="t"></div>';
    ovl.appendChild(st);
    document.documentElement.appendChild(ovl);
    return ovl;
  }
  let shown = 0, target = 0, tick = null;
  function setOverlay(text, pct) {
    const o = ensureOverlay();
    o.querySelector(".t").textContent = text;
    if (pct != null) target = Math.max(target, pct);
    if (!tick) tick = setInterval(() => {
      if (!ovl) { clearInterval(tick); tick = null; return; }
      if (shown < target) shown = Math.min(target, shown + 1);
      else if (shown < 97 && target < 100 && shown < target + 6) shown += 0.15;   // merayap pelan agar terlihat hidup
      ovl.querySelector(".p").textContent = Math.floor(shown) + "%";
    }, 90);
  }
  function removeOverlay() { if (ovl) { ovl.remove(); ovl = null; } shown = 0; target = 0; }

  function say(msg, port) {
    console.log("[WA-Status]", msg);
    const m = /^(\d)\/7/.exec(msg);
    if (/^(GAGAL|Keterangan gagal|Selesai\. Hanya)/.test(msg)) removeOverlay();
    else if (/^Selesai: status terkirim/.test(msg)) { target = 100; shown = 100; setOverlay("Selesai ✅", 100); setTimeout(removeOverlay, 1500); }
    else setOverlay("", m ? [5, 15, 30, 55, 70, 85, 95][+m[1] - 1] : null);   // animasi bersih: tanpa teks langkah
    try { port && port.postMessage({ log: msg }); } catch (_) {}
  }

  function realClick(el) {
    ["pointerdown", "mousedown", "pointerup", "mouseup", "click"].forEach((t) =>
      el.dispatchEvent(new MouseEvent(t, { bubbles: true, cancelable: true, view: window }))
    );
  }

  const clickable = (el) =>
    el.closest('button,[role="button"],[role="menuitem"],li,[tabindex]') || el;

  function find({ labels = [], icons = [] }) {
    const L = labels.map((l) => l.toLowerCase());
    const withLabel = [...document.querySelectorAll("[aria-label]")];
    // 1) aria-label persis
    for (const el of withLabel) {
      const a = el.getAttribute("aria-label").trim().toLowerCase();
      if (L.includes(a)) return clickable(el);
    }
    // 2) data-icon
    for (const ic of icons) {
      const el = document.querySelector(`[data-icon="${ic}"]`);
      if (el) return clickable(el);
    }
    // 3) teks persis
    if (L.length) {
      for (const el of document.querySelectorAll('button,[role="button"],[role="menuitem"],li,span,div')) {
        if (el.children.length > 2) continue;
        const t = (el.textContent || "").trim().toLowerCase();
        if (t && L.includes(t)) return clickable(el);
      }
    }
    // 4) aria-label mengandung
    for (const el of withLabel) {
      const a = el.getAttribute("aria-label").toLowerCase();
      if (L.some((l) => a.includes(l))) return clickable(el);
    }
    return null;
  }

  function mediaInput() {
    const list = [...document.querySelectorAll('input[type="file"]')].filter((i) => {
      const a = (i.accept || "").toLowerCase();
      return a.includes("image") || a.includes("video");
    });
    return list[list.length - 1] || null;
  }

  function setFile(input, file) {
    const dt = new DataTransfer();
    dt.items.add(file);
    input.files = dt.files;
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));
  }

  // PNG 1x1 piksel (ukuran terkecil, ~70 byte)
  const TINY_PNG_B64 =
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==";
  function makePlaceholderPhoto() {
    const bin = atob(TINY_PNG_B64);
    const u8 = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
    return Promise.resolve(new File([u8], "tmp-placeholder.png", { type: "image/png" }));
  }

  // Pencarian tombol yang lebih longgar
  function findStatusTab() {
    return (
      find(CFG.statusTab) ||
      (() => {
        const el = document.querySelector('[data-icon*="status" i]');
        return el ? clickable(el) : null;
      })()
    );
  }

  function findAddStatus() {
    const exact = find(CFG.addStatus);
    if (exact) return exact;
    const kw = /(add|tambah|new|baru|create|buat)/i;
    for (const el of document.querySelectorAll("[aria-label]")) {
      const a = el.getAttribute("aria-label");
      if (/status/i.test(a) && kw.test(a)) return clickable(el);
    }
    for (const el of document.querySelectorAll("[data-icon]")) {
      const r = el.getBoundingClientRect();
      if (r.width && /plus|add|create/i.test(el.getAttribute("data-icon"))) return clickable(el);
    }
    for (const el of document.querySelectorAll('button,[role="button"],[role="listitem"],[role="row"],div,span')) {
      if (el.children.length > 4) continue;
      const t = (el.textContent || "").trim();
      if (/^(my status|status saya|add status|tambah(kan)? status)/i.test(t) && t.length < 40) return clickable(el);
    }
    return null;
  }

  // Daftar elemen yang terlihat, untuk diagnosa bila selector gagal
  function dumpDebug() {
    const rows = [];
    document.querySelectorAll("[aria-label],[data-icon]").forEach((el) => {
      const r = el.getBoundingClientRect();
      if (!r.width || !r.height) return;
      rows.push(
        [el.tagName.toLowerCase(), el.getAttribute("aria-label") || "", el.getAttribute("data-icon") || "",
         (el.textContent || "").trim().slice(0, 30), Math.round(r.left) + "," + Math.round(r.top)].join(" | ")
      );
    });
    const box = document.createElement("div");
    box.style.cssText = "position:fixed;left:16px;top:16px;width:560px;z-index:1000000;background:#fff;color:#000;padding:10px;border-radius:10px;box-shadow:0 4px 24px rgba(0,0,0,.5);font:12px system-ui";
    const ta = document.createElement("textarea");
    ta.style.cssText = "width:100%;height:320px;font:11px monospace";
    const inputs = [...document.querySelectorAll('input[type="file"]')].map((i) => "INPUT file accept=" + i.accept + " multiple=" + i.multiple).join("\n");
    ta.value = "tag | aria-label | data-icon | teks | posisi\n" + inputs + "\n" + rows.slice(0, 250).join("\n");
    const b = document.createElement("button");
    b.textContent = "Tutup";
    b.onclick = () => box.remove();
    box.append("Salin semua teks ini dan kirim ke Claude:", ta, b);
    document.body.appendChild(box);
    ta.select();
  }

  function captionBox() {
    const vis = (e) => { const r = e.getBoundingClientRect(); return r.width > 40 && r.height > 8; };
    const all = [...document.querySelectorAll('[contenteditable="true"],[contenteditable="plaintext-only"],[role="textbox"]')]
      .filter((e) => vis(e) && !e.closest("#side,#pane-side,header,[aria-label*='Cari' i],[aria-label*='Search' i]") && !/(cari|search)/i.test(e.getAttribute("aria-label") || ""));
    const byLabel = all.find((e) => /(caption|keterangan)/i.test(e.getAttribute("aria-label") || ""));
    return byLabel || all[all.length - 1] || null;
  }
  const norm = (t) => (t || "").replace(/\s+/g, " ").trim();

  async function typeCaption(text) {
    if (!text) return true;
    const box = await waitFor(captionBox, 10000, "kolom keterangan");
    const ok = () => norm(box.textContent).includes(norm(text).slice(0, 20));
    const lines = text.split(/\r?\n/);
    for (let attempt = 0; attempt < 3; attempt++) {
      realClick(box); box.focus(); await sleep(300);
      document.execCommand("selectAll", false, null);
      if (attempt === 0) {
        lines.forEach((ln, i) => { if (i) document.execCommand("insertLineBreak"); if (ln) document.execCommand("insertText", false, ln); });
      } else if (attempt === 1) {
        try {
          const dt = new DataTransfer(); dt.setData("text/plain", text);
          box.dispatchEvent(new ClipboardEvent("paste", { clipboardData: dt, bubbles: true, cancelable: true }));
        } catch (_) {}
      } else {
        try { box.dispatchEvent(new InputEvent("beforeinput", { inputType: "insertText", data: text, bubbles: true, cancelable: true })); } catch (_) {}
        if (!ok()) box.textContent = text;
        box.dispatchEvent(new InputEvent("input", { inputType: "insertText", data: text, bubbles: true }));
      }
      await sleep(600);
      if (ok()) return true;
    }
    return false;
  }

  function smallThumbs() {
    return [...document.querySelectorAll('img[src^="blob:"],canvas')]
      .filter((el) => {
        const r = el.getBoundingClientRect();
        return r.width > 20 && r.width < 160 && r.height > 20 && r.height < 160;
      })
      .sort((a, b) => a.getBoundingClientRect().left - b.getBoundingClientRect().left);
  }

  /* ===== ALUR UTAMA ===== */
  const ITEM_RE = /item\s+\d+\s+(dari|of)\s+\d+/i;
  const PH_RE = /tmp-placeholder/i;

  // Lampiran di bawah pratinjau: label "Buka foto, nama.png, item 1 dari 2"
  function thumbItems() {
    const seen = new Set();
    return [...document.querySelectorAll("[aria-label]")]
      .filter((el) => {
        const a = el.getAttribute("aria-label");
        if (!ITEM_RE.test(a) || seen.has(a)) return false;
        seen.add(a);
        return true;
      })
      .sort((x, y) => x.getBoundingClientRect().left - y.getBoundingClientRect().left);
  }

  function findSend() {
    const el = [...document.querySelectorAll("[aria-label]")].find((e) => {
      const r = e.getBoundingClientRect();
      return r.width && r.height && /^(kirim|send)\b/i.test(e.getAttribute("aria-label"));
    });
    return el ? clickable(el) : null;
  }

  function mediaInputs() {
    return [...document.querySelectorAll('input[type="file"]')]
      .filter((i) => {
        const a = (i.accept || "").toLowerCase();
        return a.includes("image") || a.includes("video");
      })
      .reverse();
  }

  async function addVideo(file, port) {
    const before = thumbItems().length;
    const added = async (ms) => {
      try { await waitFor(() => thumbItems().length > before, ms, "video"); return true; }
      catch (_) { return false; }
    };

    // 1) input file yang sudah ada
    say("4/7 Menambahkan video (input file)...", port);
    for (const inp of mediaInputs()) {
      setFile(inp, file);
      if (await added(20000)) return;
    }

    // 2) paste ke kolom keterangan
    say("4/7 Menambahkan video (paste)...", port);
    try {
      const dt = new DataTransfer();
      dt.items.add(file);
      const target = document.querySelector(CFG.caption) || document.activeElement || document.body;
      target.dispatchEvent(new ClipboardEvent("paste", { clipboardData: dt, bubbles: true, cancelable: true }));
    } catch (_) {}
    if (await added(7000)) return;

    // 3) drag & drop ke area pratinjau
    say("4/7 Menambahkan video (drop)...", port);
    try {
      const dt = new DataTransfer();
      dt.items.add(file);
      const target = (document.elementsFromPoint(window.innerWidth * 0.6, window.innerHeight * 0.4).find((e) => !e.closest('#' + OVL_ID)) || document.body);
      ["dragenter", "dragover", "drop"].forEach((t) =>
        target.dispatchEvent(new DragEvent(t, { dataTransfer: dt, bubbles: true, cancelable: true }))
      );
    } catch (_) {}
    if (await added(7000)) return;

    // 4) klik "Tambahkan file" lalu coba input yang baru muncul
    say("4/7 Menambahkan video (tombol Tambahkan file)...", port);
    const more = find(CFG.addMore);
    if (more) {
      realClick(more); // bisa memunculkan dialog file native -> tutup saja (Cancel)
      await sleep(1000);
      await sleep(800);
      const pv = find(CFG.mediaItem);
      if (pv) { realClick(pv); await sleep(800); }
      for (const inp of mediaInputs()) {
        setFile(inp, file);
        if (await added(20000)) return;
      }
    }
    throw new Error("video tidak bisa ditambahkan ke pratinjau");
  }

  async function deletePhoto() {
    const items = thumbItems();
    const photo = items.find((el) => PH_RE.test(el.getAttribute("aria-label"))) || items[0];
    if (!photo) throw new Error("thumbnail foto tidak ditemukan");
    realClick(photo);
    ["mouseover", "mouseenter", "mousemove"].forEach((t) =>
      photo.dispatchEvent(new MouseEvent(t, { bubbles: true }))
    );
    await sleep(700);
    const pr = photo.getBoundingClientRect();
    const cx = pr.left + pr.width / 2, cy = pr.top + pr.height / 2;
    const dels = [...document.querySelectorAll("[aria-label]")]
      .filter((el) => /(hapus lampiran|delete attachment|remove attachment)/i.test(el.getAttribute("aria-label")))
      .map((el) => {
        const r = el.getBoundingClientRect();
        return { el, d: Math.hypot(r.left + r.width / 2 - cx, r.top + r.height / 2 - cy) };
      })
      .sort((x, y) => x.d - y.d);
    if (!dels.length) throw new Error("tombol Hapus lampiran tidak ditemukan");
    realClick(clickable(dels[0].el));
    await sleep(800);
    const confirm = [...document.querySelectorAll('[role="dialog"] button')].find((b) =>
      /delete|hapus|remove/i.test(b.textContent)
    );
    if (confirm) { realClick(confirm); await sleep(600); }
    await waitFor(
      () => !thumbItems().some((el) => PH_RE.test(el.getAttribute("aria-label"))),
      6000,
      "foto sementara terhapus"
    );
  }

  async function dropOnStatusZone(file) {
    const zones = [...document.querySelectorAll('[aria-label*="lepas file status" i],[aria-label*="status drop" i],[aria-label*="drop" i]')];
    for (const z of zones) {
      try {
        const dt = new DataTransfer();
        dt.items.add(file);
        ["dragenter", "dragover", "drop"].forEach((t) =>
          z.dispatchEvent(new DragEvent(t, { dataTransfer: dt, bubbles: true, cancelable: true }))
        );
      } catch (_) { continue; }
      try { await waitFor(() => thumbItems().length >= 1 || findSend(), 15000, "pratinjau video"); await sleep(1500); return true; }
      catch (_) {}
    }
    return false;
  }

  async function run(file, caption, autoSend, port) {
    try {
      say("1/7 Membuka tab Status...", port);
      const st = await waitFor(findStatusTab, 10000, "tab Status");
      realClick(st);
      await sleep(1200);

      // Jalur utama: lepas (drop) video langsung ke "Area lepas file status"
      let capOk = true;
      let direct = false;   // alur tetap: foto 1x1 -> video (+keterangan) -> hapus foto -> kirim
      if (!direct) {
        say("2/7 Klik Buat status...", port);
        const add = await waitFor(findAddStatus, 10000, "tombol tambah status");
        realClick(add);
        await sleep(800);

        say("3/7 Menambahkan foto sementara (1x1 px)...", port);
        let input = mediaInput();
        if (!input) {
          const item = await waitFor(() => find(CFG.mediaItem), 5000, "menu Foto & video");
          realClick(item);
          input = await waitFor(mediaInput, 8000, "input file");
        }
        setFile(input, await makePlaceholderPhoto());
        await waitFor(() => thumbItems().length >= 1, 15000, "pratinjau foto");
        await sleep(1000);

        await addVideo(file, port);
        await sleep(1500);

        say("5/7 Mengisi keterangan (pada video)...", port);
        capOk = await typeCaption(caption);
        await sleep(500);

        say("6/7 Menghapus foto sementara...", port);
        await deletePhoto();
        await sleep(500);
      }

      if (direct) { capOk = await typeCaption(caption); await sleep(500); }
      if (!capOk) {
        say("Keterangan gagal terisi. Video sudah siap: isi keterangan lalu klik Kirim sendiri.", port);
        done(port, true, true);
        return;
      }

      if (!autoSend) {
        say("Selesai. Hanya video yang tersisa. Cek lalu klik Kirim sendiri.", port);
        done(port, true, true);
        return;
      }
      say("7/7 Mengirim...", port);
      const send = await waitFor(findSend, 8000, "tombol kirim");
      realClick(send);
      await waitFor(() => thumbItems().length === 0, 30000, "pratinjau tertutup setelah kirim");
      say("Selesai: status terkirim ✅", port);
      done(port, true);
    } catch (e) {
      say("GAGAL: " + e.message + " (daftar elemen ditampilkan, salin & kirim ke Claude)", port);
      dumpDebug();
      done(port, false);
    }
  }

  /* ===== TERIMA DATA DARI POPUP ===== */
  // Deteksi status halaman WA Web: chats (sudah login) | qr (belum login) | conflict | loading
  function waState() {
    const q = (x) => document.querySelector(x);
    if (q("#pane-side") || q('[aria-label="Daftar chat"]') || q('[aria-label="Chat list"]')) return "chats";
    if (q('button[aria-label="Status"]') && q('button[aria-label="Chat"]')) return "chats";
    if (q('canvas[aria-label*="qr" i]') || q("[data-ref]")) return "qr";
    const t = (document.body.innerText || "").slice(0, 3000);
    if (/(digunakan di jendela|open in another window|use here|gunakan di sini)/i.test(t)) return "conflict";
    if (/(pindai|scan the qr|scan qr|tautkan dengan nomor|link with phone number|masuk ke whatsapp web|log into whatsapp web)/i.test(t)) return "qr";
    return "loading";
  }
  function done(port, ok, manual) {
    try { port && port.postMessage({ done: true, ok, manual: !!manual }); } catch (_) {}
  }

  chrome.runtime.onMessage.addListener((m, _s, reply) => {
    if (m && m.type === "ping") reply({ ok: true, state: waState() });
  });

  chrome.runtime.onConnect.addListener((port) => {
    if (port.name !== "wa-upload") return;
    let meta, parts = [];
    port.onMessage.addListener((m) => {
      if (m.type === "meta") { meta = m; parts = new Array(m.total); }
      else if (m.type === "chunk") {
        const bin = atob(m.data);
        const u8 = new Uint8Array(bin.length);
        for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
        parts[m.index] = u8;
      } else if (m.type === "run") {
        const file = new File(parts, meta.name, { type: meta.mime });
        run(file, m.caption, m.autoSend, port);
      }
    });
  });
})();
