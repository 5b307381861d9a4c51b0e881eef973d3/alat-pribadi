(() => {
  'use strict';
  const $ = (id) => document.getElementById(id);
  // Mode desktop / layar lebar (popup dibuka sebagai tab): perbesar tampilan supaya tidak terlalu kecil.
  // Popup asli Chrome/Kiwi lebarnya ~380px, jadi tidak diubah (zoom 1).
  function fitZoom() {
    const w = window.innerWidth || 0;
    const z = w <= 460 ? 1 : Math.min(w / 400, 2.6);
    document.body.style.zoom = z === 1 ? '' : String(Math.round(z * 100) / 100);
  }
  fitZoom();
  window.addEventListener('resize', fitZoom);

  const WHATSAPP_URL = 'https://web.whatsapp.com/';
  const STUDIO_URL = 'https://www.tiktok.com/tiktokstudio/upload?from=upload';
  const TXT = {
    en: { subtitle: 'Upload to TikTok Studio with original video quality, automatic captions, and video statistics',
          launch: 'LAUNCH TIKTOK STUDIO', wa: 'WHATSAPP WEB', menu: 'QUICK ACTIONS DASHBOARD', mode: 'MODE:', modeOff: 'needs UPLOADER ON', ctrl: 'UPLOADER SETTINGS', upl: 'UPLOADER:', updLabel: 'UPDATE BAR', segStandar: 'Standard', segHigh: 'High', segCustom: 'Custom (Beta)', stOn: 'ON', stOff: 'OFF', info: 'Mode info', fake: 'FAKE SAMPLE SIZE', bytes: 'bytes', official: 'OFFICIAL', langLabel: 'Language',
          clear: 'CLEAR', descOn: 'Description', descOff: 'Description', desc: 'DESCRIPTION', descPh: 'Type the description here. If filled, it replaces the caption typed in TikTok Studio. Leave empty to keep the Studio caption.', tagsOn: 'Auto Tags (resolution + fps)', tagsOff: 'Auto Tags (resolution + fps)',
          hintStandar: 'Standard: Lightweight and device-friendly, but limited features.', hintHigh: 'High: Full support for HDR & Dolby Vision formats.', hintCustom: 'Custom (Beta): Still in testing and not fully stable yet.', on: 'UPLOADER ON', off: 'UPLOADER OFF', capOn: 'Creator Credit', capOff: 'Creator Credit', },
    id: { subtitle: 'Upload ke TikTok Studio dengan kualitas video asli, caption otomatis, dan statistik video',
          launch: 'LUNCURKAN TIKTOK STUDIO', wa: 'WHATSAPP WEB', menu: 'DASBOR AKSI CEPAT', mode: 'MODE:', modeOff: 'butuh UPLOADER AKTIF', ctrl: 'PENGATURAN UPLOADER', upl: 'UPLOADER:', updLabel: 'PEMBARUAN', segStandar: 'Standar', segHigh: 'High', segCustom: 'Kustom (Beta)', stOn: 'AKTIF', stOff: 'MATI', info: 'Info mode', fake: 'UKURAN SAMPEL PALSU', bytes: 'byte', official: 'RESMI', langLabel: 'Bahasa',
          clear: 'HAPUS', descOn: 'Deskripsi', descOff: 'Deskripsi', desc: 'DESKRIPSI', descPh: 'Tulis deskripsi di sini. Bila diisi, menggantikan caption yang diketik di TikTok Studio. Kosongkan untuk memakai caption dari Studio.', tagsOn: 'Tagar Otomatis (resolusi + fps)', tagsOff: 'Tagar Otomatis (resolusi + fps)',
          hintStandar: 'Standar: Ringan dan ramah perangkat, namun fitur terbatas.', hintHigh: 'High: Mendukung penuh format HDR & Dolby Vision.', hintCustom: 'Kustom (Beta): Masih tahap uji coba & belum stabil sepenuhnya.', on: 'UPLOADER AKTIF', off: 'UPLOADER MATI', capOn: 'Kredit Pembuat', capOff: 'Kredit Pembuat', }
  };
  const store = chrome.storage.local;
  let lang = /^id/i.test(navigator.language || '') ? 'id' : 'en';
  let uploaderOn = true;
  let captionOn = true;
  const MODES = ['standar', 'high', 'custom'];
  const LEGACY = { v1: 'standar', lite: 'standar', 'audio-only': 'standar', v2: 'high', combo: 'high' }; // nama lama (nilai yang sudah dihapus jatuh ke standar)
  const normMode = (m) => (MODES.includes(m) ? m : LEGACY[m] || 'standar');
  let mode = 'standar';
  let fakeSize = 6;
  let descOn = false, desc = '', autoTags = false, videoTags = '', mention = null;
  const mentionOk = () => !!(mention && mention.ok);
  const clampFake = (v) => { v = Math.round(Number(v)); return Number.isFinite(v) ? Math.max(6, Math.min(60, v)) : 6; };

  function render() {
    const t = TXT[lang];
    document.documentElement.lang = lang;
    $('subtitle').textContent = t.subtitle;
    $('launchText').textContent = t.launch;
    $('waText').textContent = t.wa;
    $('menuLabel').textContent = t.menu;
    $('hint').textContent = t['hint' + mode.charAt(0).toUpperCase() + mode.slice(1)];
    $('uploaderText').textContent = t.upl;
    document.querySelector('#modeSeg [data-mode="standar"]').textContent = t.segStandar;
    document.querySelector('#modeSeg [data-mode="high"]').textContent = t.segHigh;
    document.querySelector('#modeSeg [data-mode="custom"]').textContent = t.segCustom;
    $('updateLabel').textContent = t.updLabel;
    $('uploaderBtn').classList.toggle('on', uploaderOn);
    $('uploaderBtn').setAttribute('aria-pressed', String(uploaderOn));
    $('captionText').textContent = captionOn ? t.capOn : t.capOff;
    $('captionBtn').classList.toggle('on', captionOn);
    $('captionBtn').setAttribute('aria-pressed', String(captionOn));
    $('captionBtn').classList.toggle('mention-ok', captionOn && mentionOk());
    $('captionBtn').classList.toggle('mention-wait', captionOn && !mentionOk());
    // MODE hanya berlaku saat UPLOADER aktif
    $('modeLabel').textContent = t.mode;
    // MODE (pilihan, keterangan, slider Custom) hanya tampil saat UPLOADER aktif
    $('modeBody').hidden = !uploaderOn;
    $('ctrlTitle').textContent = t.ctrl;
    document.querySelectorAll('#modeSeg [data-mode]').forEach((b) => { const on = b.dataset.mode === mode; b.classList.toggle('active', on); b.setAttribute('aria-checked', String(on)); b.disabled = !uploaderOn; });
    $('modeRow').classList.toggle('off', !uploaderOn);
    // Custom: slider Fake Sample Size (1-60 byte) tampil otomatis
    $('fakeRow').hidden = mode !== 'custom' || !uploaderOn;
    $('fakeRow').classList.toggle('off', !uploaderOn);
    $('fakeRange').disabled = !uploaderOn;
    $('fakeRange').value = fakeSize;
    $('fakeVal').textContent = fakeSize;
    $('fakeLabel').textContent = t.fake;
    $('fakeUnit').textContent = t.bytes;
    $('descBtnText').textContent = descOn ? t.descOn : t.descOff;
    $('descBtn').classList.toggle('on', descOn);
    $('descBtn').setAttribute('aria-pressed', String(descOn));
    $('descRow').hidden = !descOn; // kotak DESKRIPSI hanya tampil saat saklar aktif
    $('descText').placeholder = t.descPh;
    if (document.activeElement !== $('descText')) $('descText').value = desc;
    $('descCount').textContent = desc.length;
    $('descClear').textContent = t.clear;
    $('descClear').hidden = !desc;
    $('tagsText').textContent = autoTags ? t.tagsOn : t.tagsOff;
    $('tagsBtn').classList.toggle('on', autoTags);
    $('tagsBtn').setAttribute('aria-pressed', String(autoTags));
    $('footText').textContent = t.official;
    const sw = document.querySelector('.lang-switch'); if (sw) sw.setAttribute('aria-label', t.langLabel);
    $('langEn').classList.toggle('active', lang === 'en');
    $('langId').classList.toggle('active', lang === 'id');
  }

  // bahasa + saklar disimpan di chrome.storage dan dibaca oleh halaman TikTok Studio
  store.get({ rehineLang: null, rehineUploader: true, rehineCaption: true, rehineMode: 'standar', rehineFakeSize: 6, rehineDesc: '', rehineDescOn: false, rehineAutoTags: false, rehineVideoTags: '', rehineMention: null }, (r) => {
    mention = r.rehineMention || null;
    // Deskripsi dikosongkan setiap popup dibuka (tutup lalu buka lagi = bersih). Penghapusan baru terjadi saat popup DIBUKA, bukan
    // saat ditutup, jadi deskripsi yang baru ditulis tetap terpakai untuk posting sebelum popup dibuka lagi.
    // DESKRIPSI selalu mulai MATI setiap popup dibuka (sama seperti teksnya).
    descOn = false;
    if (r.rehineDescOn) store.set({ rehineDescOn: false });
    desc = '';
    if (r.rehineDesc) store.set({ rehineDesc: '' });
    autoTags = r.rehineAutoTags === true;
    videoTags = typeof r.rehineVideoTags === 'string' ? r.rehineVideoTags : '';
    lang = r.rehineLang || lang;
    uploaderOn = r.rehineUploader !== false;
    captionOn = r.rehineCaption !== false;
    mode = normMode(r.rehineMode);
    fakeSize = clampFake(r.rehineFakeSize);
    if (!r.rehineLang) store.set({ rehineLang: lang });
    render();
  });
  render();

  $('langEn').onclick = () => { lang = 'en'; store.set({ rehineLang: lang }); render(); };
  $('langId').onclick = () => { lang = 'id'; store.set({ rehineLang: lang }); render(); };
  $('uploaderBtn').onclick = () => { uploaderOn = !uploaderOn; store.set({ rehineUploader: uploaderOn }); render(); };
  $('captionBtn').onclick = () => { captionOn = !captionOn; store.set({ rehineCaption: captionOn }); render(); };
  document.querySelectorAll('#modeSeg [data-mode]').forEach((b) => { b.onclick = () => { mode = normMode(b.dataset.mode); store.set({ rehineMode: mode }); render(); }; });
  $('fakeRange').oninput = () => { fakeSize = clampFake($('fakeRange').value); store.set({ rehineFakeSize: fakeSize }); render(); };
  let descTimer = null;
  $('descText').oninput = () => {
    desc = $('descText').value; $('descCount').textContent = desc.length;
    clearTimeout(descTimer); descTimer = setTimeout(() => store.set({ rehineDesc: desc }), 200);
  };
  $('descText').onblur = () => { clearTimeout(descTimer); store.set({ rehineDesc: desc }); };
  $('descClear').onclick = () => { desc = ''; clearTimeout(descTimer); $('descText').value = ''; store.set({ rehineDesc: '' }); render(); $('descText').focus(); };
  $('descBtn').onclick = () => {
    descOn = !descOn;
    if (!descOn) { desc = ''; clearTimeout(descTimer); $('descText').value = ''; store.set({ rehineDesc: '' }); } // DESKRIPSI mati = teks ikut direset
    store.set({ rehineDescOn: descOn }); render();
  };
  $('tagsBtn').onclick = () => { autoTags = !autoTags; store.set({ rehineAutoTags: autoTags }); render(); };
  try { chrome.storage.onChanged.addListener((ch, a) => { if (a !== 'local') return; if (ch.rehineMention) mention = ch.rehineMention.newValue || null; if (ch.rehineVideoTags) videoTags = ch.rehineVideoTags.newValue || ''; if (ch.rehineDesc && document.activeElement !== $('descText')) desc = ch.rehineDesc.newValue || ''; render(); }); } catch (e) {}
  $('waBtn').onclick = () => chrome.tabs.create({ url: WHATSAPP_URL });
  $('launchBtn').onclick = async () => {
    // nyalakan desktop mode dulu (HP), baru buka TikTok Studio
    try { await RehineDesktop.ensure(); } catch (e) {}
    chrome.tabs.create({ url: STUDIO_URL });
  };
})();
