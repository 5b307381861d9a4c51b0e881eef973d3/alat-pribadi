(() => {
  'use strict';
  const $ = (id) => document.getElementById(id);
  // Mode desktop / layar lebar (popup dibuka sebagai tab): perbesar tampilan supaya tidak terlalu kecil.
  // Popup asli Chrome/Kiwi lebarnya ~380px, jadi tidak diubah (zoom 1).
  function fitZoom() {
    const w = window.innerWidth || 0;
    // mode desktop / tab lebar: perbesar agar tepat selebar layar (lebar popup asli 380px) dan isi tinggi layar
    const z = w <= 460 ? 1 : Math.min(w / 380, 3.2);
    document.body.style.zoom = z === 1 ? '' : String(Math.round(z * 1000) / 1000);
    pinFoot();
  }
  // footer ditempel ke dasar layar hanya jika seluruh isi (termasuk footer) muat di layar; kalau tidak, ikut mengalir di akhir isi
  function pinFoot() {
    const b = document.body, was = b.classList.contains('pin');
    b.classList.remove('pin');
    const fits = document.documentElement.scrollHeight <= window.innerHeight + 1;
    if (fits) b.classList.add('pin');
    else if (was) b.classList.remove('pin');
  }
  window.addEventListener('rehine-render', pinFoot);
  // ditunda ke frame berikutnya agar perubahan kelas tidak memicu "ResizeObserver loop"
  let pinRaf = 0;
  const pinSoon = () => { if (pinRaf) return; pinRaf = requestAnimationFrame(() => { pinRaf = 0; pinFoot(); }); };
  if (window.ResizeObserver) new ResizeObserver(pinSoon).observe(document.body);
  fitZoom();
  window.addEventListener('resize', fitZoom);
  window.addEventListener('load', fitZoom);
  if (window.visualViewport) window.visualViewport.addEventListener('resize', fitZoom);
  setTimeout(fitZoom, 300); setTimeout(fitZoom, 1200);   // layout viewport HP bisa baru stabil setelah halaman tampil

  const WHATSAPP_URL = 'https://web.whatsapp.com/';
  const STUDIO_URL = 'https://www.tiktok.com/tiktokstudio/upload?from=upload';   // unggah langsung (halaman unggah)
  const STUDIO_HOME_URL = 'https://www.tiktok.com/tiktokstudio/content';        // tombol BUKA TIKTOK STUDIO (daftar konten)
  const TXT = {
    en: { subtitle: 'Prepare videos, publish to TikTok, and track performance in one place.', ready: 'Ready to use', notReady: 'Uploader off',
          launch: 'OPEN TIKTOK STUDIO', launchDirect: 'UPLOAD DIRECTLY TO TIKTOK', vidLogHead: 'Last upload attempt: ', hoLog: { caption: 'filling the description', private: 'setting visibility to Only me', ready: 'ready', wait: 'waiting for the request', card: 'card is ready on the TikTok page, waiting for the request', claim: 'requesting the video…', loading: 'loading video', processing: 'processing & sending to TikTok…', waitpost: 'waiting for the Post button…', posting: 'Post button clicked…', posted: 'posted ✓ (Only me)', postfail: 'Post button not ready, click it manually', done: 'uploaded ✓', claimed: 'already taken by another frame', expired: 'request expired (over 3 min)', nofile: 'selected video not found in extension storage', nochunk: 'could not read video data', nohandoff: 'no hand-off request' }, vidReady: 'Ready', vidSet: 'Selected', tagNote: 'Hashtags: %n/%m (max 5 in total%a)', tagAuto: ', %k used by Auto Quality Tags', vgRes: 'Resolution', vgFps: 'FPS', vgBit: 'Bitrate', vgCodec: 'Codec', vidSaving: 'Processing…', vidCancel: 'Cancel', vidTooBig: 'Video %r is above 1080p. Without Max it cannot be processed — turn on "Max" (keeps the resolution) or pick a video up to 1080p.', vidProc: 'PROCESS VIDEO', vidChosen: 'Not processed', proCopy: 'Copy', proCopied: 'Copied ✓', vidCancelled: 'Cancelled.', vidNo: 'Not suitable', vidMisfit: 'This video does not fit %m mode (%r). Change the mode manually, then pick the video again.', vidStale: 'The mode changed after this video was processed. Pick the video again.', vidDone: '✓ Processed with %m', vidBig: 'Large file (%s MB): this mode loads the whole video into memory and may lag on a phone. High is lighter.', vidErr: 'Could not save the video', vidPrompt: 'DROP VIDEO IN HERE', vidPick: 'Select Video', vidChange: 'Change Video', wa: 'WHATSAPP', menu: 'CONTROL CENTER', mode: 'MODE:', modeOff: 'needs UPLOADER ON', ctrl: 'TIKTOK UPLOAD PREFERENCES', upl: 'Uploader', langName: 'Language', close: 'Close', copy: 'Copy', copied: 'Copied!', updLabel: 'UPDATE BAR', segOptimasi: 'Optimize', hintOptimasi: 'Optimization: 720p only.', optWarn: 'Optimization does not support HDR / Dolby Vision. Videos above 720p may be compressed down to 720p/HD.', segStandar: 'Standard', segHigh: 'High', segPro: 'Pro', hintPro: '', proProcL: 'Processor', procBrowser: 'Browser (slow)', procTermux: 'Termux (fast)', proEng: 'Engine', proPrepL: 'Preparation', prepNormal: 'Normal (1080p max)', prepNormal4k: 'Normal (max 4K)', proMaxTip: 'Max: keep up to 4K, no downscale', prepTiktok: 'TikTok file size', prepAntilag: 'Anti Lag', segBeta2: 'Beta High', segBeta3: 'Beta Standard', stOn: 'ON', stOff: 'OFF', info: 'Mode info', official: 'OFFICIAL', langLabel: 'Language',
          ctrlW: 'WhatsApp UPLOAD PREFERENCES', launchDirectW: 'UPLOAD TO WHATSAPP STATUS', vidOffW: 'Uploader off', procOriginal: 'Original (as-is)', descPhW: 'Write the status caption here (optional).', waPrep: 'Preparing video…', waBg: 'Stay on the WhatsApp page until it finishes (don’t switch tabs).', platTip: 'TikTok / WhatsApp', shareFail: 'Share sheet unavailable; the video was downloaded instead.', clear: 'CLEAR', descOn: 'Description', descOff: 'Description', desc: 'DESCRIPTION', descPh: 'Type the description here. If filled, it replaces the caption typed in TikTok Studio. Leave empty to keep the Studio caption.', tagsOn: 'Auto Quality Tags', tagsOff: 'Auto Quality Tags',
          hintStandar: 'Standard: Lightweight and device-friendly, but limited features.', hintHigh: 'High: Full support for HDR & Dolby Vision formats.', on: 'UPLOADER ON', off: 'UPLOADER OFF', capOn: 'Creator Credit', capOff: 'Creator Credit', },
    id: { subtitle: 'Persiapkan video, publikasikan ke TikTok, dan pantau performanya dalam satu tempat.', ready: 'Siap untuk digunakan', notReady: 'Uploader mati',
          launch: 'BUKA TIKTOK STUDIO', launchDirect: 'UNGGAH LANGSUNG KE TIKTOK', vidLogHead: 'Percobaan terakhir: ', hoLog: { caption: 'mengisi deskripsi', private: 'mengatur privasi ke Hanya saya', ready: 'siap', wait: 'menunggu permintaan', card: 'kartu siap di halaman TikTok, menunggu permintaan', claim: 'meminta video…', loading: 'memuat video', processing: 'memproses & mengirim ke TikTok…', waitpost: 'menunggu tombol Posting aktif…', posting: 'tombol Posting diklik…', posted: 'terposting ✓ (Hanya saya)', postfail: 'tombol Posting belum aktif, klik manual', done: 'terunggah ✓', claimed: 'sudah diambil frame lain', expired: 'permintaan kedaluwarsa (lebih dari 3 menit)', nofile: 'video terpilih tidak ada di penyimpanan extension', nochunk: 'data video tidak terbaca', nohandoff: 'tidak ada permintaan serah-terima' }, vidReady: 'Siap', vidSet: 'Dipilih', tagNote: 'Hashtag: %n/%m (maks. 5 total%a)', tagAuto: ', %k dipakai Tagar Kualitas Otomatis', vgRes: 'Resolusi', vgFps: 'FPS', vgBit: 'Bitrate', vgCodec: 'Codec', vidSaving: 'Memproses…', vidCancel: 'Batalkan', vidTooBig: 'Video %r di atas 1080p. Tanpa Max video tidak bisa diproses — aktifkan "Max" (resolusi tidak diubah) atau pilih video maksimal 1080p.', vidProc: 'PROSES VIDEO', vidChosen: 'Belum diproses', proCopy: 'Salin', proCopied: 'Tersalin ✓', vidCancelled: 'Dibatalkan.', vidNo: 'Tidak cocok', vidMisfit: 'Video ini tidak cocok dengan mode %m (%r). Ganti mode secara manual, lalu pilih ulang video.', vidStale: 'Mode berubah setelah video ini diproses. Pilih ulang video.', vidDone: '✓ Diproses dengan %m', vidBig: 'File besar (%s MB): mode ini memuat seluruh video ke memori dan bisa lag di HP. High lebih ringan.', vidErr: 'Video gagal disimpan', vidPrompt: 'MASUKKAN VIDEO DI SINI', vidPick: 'Pilih Video', vidChange: 'Ganti Video', wa: 'WHATSAPP', menu: 'PUSAT KONTROL', mode: 'MODE:', modeOff: 'butuh UPLOADER AKTIF', ctrl: 'PREFERENSI UNGGAH TIKTOK', upl: 'Pengunggah', langName: 'Bahasa', close: 'Tutup', copy: 'Salin', copied: 'Tersalin!', updLabel: 'PEMBARUAN', segOptimasi: 'Optimasi', hintOptimasi: 'Optimasi: Khusus 720.', optWarn: 'Optimasi tidak mendukung HDR/Dolby Vision. Video di atas 720p kemungkinan terkompresi menjadi 720p/HD.', segStandar: 'Standar', segHigh: 'High', segPro: 'Pro', hintPro: '', proProcL: 'Pemroses', procBrowser: 'Browser (lambat)', procTermux: 'Termux (cepat)', proEng: 'Mesin', proPrepL: 'Persiapan', prepNormal: 'Normal (maks. 1080p)', prepNormal4k: 'Normal (maks. 4K)', proMaxTip: 'Max: pertahankan hingga 4K, tanpa diturunkan', prepTiktok: 'Ukuran TikTok', prepAntilag: 'Anti Lag', segBeta2: 'Beta High', segBeta3: 'Beta Standar', stOn: 'AKTIF', stOff: 'MATI', info: 'Info mode', official: 'OFFICIAL', langLabel: 'Bahasa',
          ctrlW: 'PREFERENSI UNGGAH WHATSAPP', launchDirectW: 'UNGGAH KE STATUS WHATSAPP', vidOffW: 'Uploader mati', procOriginal: 'Original (apa adanya)', descPhW: 'Tulis keterangan status di sini (opsional).', waPrep: 'Menyiapkan video…', waBg: 'Tetap di halaman WhatsApp sampai selesai (jangan pindah tab).', platTip: 'TikTok / WhatsApp', shareFail: 'Lembar bagikan tidak tersedia; video diunduh sebagai gantinya.', clear: 'HAPUS', descOn: 'Deskripsi', descOff: 'Deskripsi', desc: 'DESKRIPSI', descPh: 'Tulis deskripsi di sini. Bila diisi, menggantikan caption yang diketik di TikTok Studio. Kosongkan untuk memakai caption dari Studio.', tagsOn: 'Tagar Kualitas Otomatis', tagsOff: 'Tagar Kualitas Otomatis',
          hintStandar: 'Standar: Ringan dan ramah perangkat, namun fitur terbatas.', hintHigh: 'High: Mendukung penuh format HDR & Dolby Vision.', on: 'UPLOADER AKTIF', off: 'UPLOADER MATI', capOn: 'Kredit Pembuat', capOff: 'Kredit Pembuat', }
  };
  const store = chrome.storage.local;
  let lang = /^id/i.test(navigator.language || '') ? 'id' : 'en';
  let uploaderOn = true;
  let captionOn = true;
  const MODES = ['optimasi', 'pro'];
  const effMode = () => (platform === 'W' && waOriginal ? 'optimasi' : mode);   // W + Original = berkas apa adanya
  const normMode = (m) => (MODES.includes(m) ? m : m === 'beta' ? 'optimasi' : 'pro');   // Standar/High dihapus -> Pro
  const migrateMode = (m) => normMode(m);
  let mode = 'pro', proEngine = 'obx', proPrep = 'normal', proProc = 'browser', proMax = false;
  let waOriginal = false, waMsg = '', waBusy = false, savedMax = false, platform = 'T', savedMode = null, savedUploader = true;   // T = TikTok, W = WhatsApp (di W: mode Pro & uploader dipaksa aktif, tidak disimpan)
  let desc = '', autoTags = false, videoTags = '', mention = null;
  let cardOpen = false;   // kartu preferensi selalu mulai terlipat setiap popup dibuka/di-refresh
  let copyFlash = false, vidChips = [], procCtl = null, chosen = null, chosenSize = null, chosenDesc = Promise.resolve();
  let pending = null, vidSaving = false, vidErr = false, vidProblem = '', vidNote = '', hoLog = null, csVer = null;   // video yang dipilih di popup (dikirim ke TikTok Studio)
  const fmtSize = (n) => (n >= 1073741824 ? (n / 1073741824).toFixed(2) + ' GB' : (n / 1048576).toFixed(n >= 104857600 ? 0 : 1) + ' MB');
  const mentionOk = () => !!(mention && mention.ok);
  function renderTagNote() {
    const t = TXT[lang], k = autoCount();
    $('tagNote').textContent = t.tagNote.replace('%n', countTags(desc)).replace('%m', tagRoom()).replace('%a', k ? t.tagAuto.replace('%k', k) : '');
  }
  // Hashtag maksimal 5 secara total: tagar yang kamu tulis + tagar otomatis (bila saklarnya menyala)
  const TAG_RE = /#[\p{L}\p{N}_]+/gu, MAX_TAGS = 5;
  const autoCount = () => (!autoTags ? 0 : pending && pending.meta && globalThis.RehineVideoMeta ? globalThis.RehineVideoMeta.tags(pending.meta).length : 3);
  const tagRoom = () => (platform === 'W' ? 1e9 : Math.max(0, MAX_TAGS - autoCount()));   // batas 5 hashtag hanya untuk TikTok
  const countTags = (x) => (String(x).match(TAG_RE) || []).length;
  const limitTags = (x, max) => { let n = 0; return String(x).replace(/([ \t]*)(#[\p{L}\p{N}_]+)/gu, (m) => (++n <= max ? m : '')); };

  function render() {
    const t = TXT[lang];
    document.documentElement.lang = lang;
    $('subtitle').textContent = t.subtitle;
    $('launchText').textContent = t.launch;
    $('vidGo').textContent = platform === 'W' ? t.launchDirectW : t.launchDirect;
    const modeName = (m) => t['seg' + m.charAt(0).toUpperCase() + m.slice(1)] || m;
    const stale = !!(pending && pending.mode && pending.mode !== effMode() && uploaderOn);
    const have = !!(pending || chosen);
    $('vidGo').hidden = !pending || vidSaving;
    const tooBig = !(platform === 'W' && waOriginal) && mode === 'pro' && !proMax && !!chosen && !pending && !!chosenSize && Math.min(chosenSize.w, chosenSize.h) > 1080;
    const warn = tooBig ? t.vidTooBig.replace('%r', chosenSize.w + '×' + chosenSize.h) : '';
    $('vidProc').hidden = !chosen || !!pending || vidSaving; $('vidProc').disabled = tooBig; $('vidProc').style.opacity = tooBig ? '.45' : ''; $('vidProc').textContent = t.vidProc;
    $('vidGo').disabled = stale || (platform === 'W' && waBusy);
    $('vidPick').classList.toggle('sec', have);
    $('vidPrompt').textContent = t.vidPrompt;
    $('vidPick').textContent = have ? t.vidChange : t.vidPick;
    $('vidPick').disabled = vidSaving;
    $('vidState').textContent = vidErr ? t.vidErr : vidSaving ? t.vidSaving : vidProblem || warn ? t.vidNo : pending ? t.vidSet : chosen ? t.vidChosen : (platform === 'W' ? t.vidOffW : t.vidReady);
    $('vidBox').classList.toggle('busy', vidSaving);
    const open = !!pending || !!chosen || cardOpen;   // ada video terpilih -> kartu selalu terbuka (tanpa panah)
    $('ctrlCard').classList.toggle('collapsed', !open);
    $('ctrlHead').setAttribute('aria-expanded', String(open));
    $('vidBox').classList.toggle('has-file', have);
    document.body.classList.toggle('has-video', have);   // ada video terpilih -> tombol Buka Studio/WhatsApp/Statistik disembunyikan
    $('vidBox').classList.toggle('err', vidErr || !!vidProblem || !!warn);
    $('vidFile').hidden = !have;
    {
      let msg = '', bad = false;
      if (vidProblem) { msg = vidProblem; bad = true; }
      else if (warn) { msg = warn; bad = true; }
      else if (vidSaving) msg = vidNote;
      else if (platform === 'W' && waMsg) { msg = waMsg; bad = /^(Error|Gagal)/.test(waMsg); }
      else if (stale) { msg = t.vidStale; bad = true; }
      else {
        if (hoLog && Date.now() - hoLog.t < 10 * 60 * 1000) {
          const base = (t.hoLog[hoLog.c]) || hoLog.c;
          msg = t.vidLogHead + (hoLog.c === 'loading' ? base + ' ' + hoLog.d : base + (hoLog.d ? ' (' + hoLog.d + ')' : ''));
        }
        if (!msg && pending && pending.mode) msg = t.vidDone.replace('%m', modeName(pending.mode));
      }
      $('vidLog').textContent = msg; $('vidLog').hidden = !msg; $('vidLog').classList.toggle('bad', bad);
    }
    if (pending) { $('vidName').textContent = pending.name; $('vidSize').textContent = fmtSize(pending.size); } else if (chosen) { $('vidName').textContent = chosen.name; $('vidSize').textContent = fmtSize(chosen.size); }
    const ext = pending ? (pending.name.split('.').pop() || '').toLowerCase() : '';
    {
      const m = pending && pending.meta, F = globalThis.RehineVideoMeta && globalThis.RehineVideoMeta.fmt;
      const cont = m && m.container ? String(m.container).toLowerCase() : ext;
      document.querySelectorAll('.vid-chips i').forEach((c) => c.classList.toggle('on', !!pending && (c.dataset.k === cont || (!!m && c.dataset.k === m.codecKey))));
      const ch = vidChips && vidChips.length ? vidChips : (pending && pending.chips) || [];
      $('vidInfo').hidden = !ch.length || !(have || vidSaving);
      $('vidInfo').innerHTML = ch.map((c) => '<i>' + c.replace(/[&<>"]/g, (x) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[x])) + '</i>').join('');
      $('vidCancel').hidden = !(vidSaving && procCtl); $('vidCancel').textContent = t.vidCancel;
    }
    $('waText').textContent = t.wa;
    $('menuLabel').textContent = t.menu;
    { const h = t['hint' + mode.charAt(0).toUpperCase() + mode.slice(1)] || ''; $('hint').textContent = h; $('hint').hidden = !h; }
    $('uploaderText').textContent = t.upl;
    const readyOn = platform === 'W' ? !!(pending || chosen) : uploaderOn;   // W: mati selama belum ada video dipilih
    $('readyText').textContent = readyOn ? t.ready : t.notReady;
    $('readyBox').classList.toggle('off', !readyOn);
    document.querySelector('#modeSeg [data-mode="optimasi"]').textContent = t.segOptimasi;
    document.querySelector('#modeSeg [data-mode="pro"]').textContent = t.segPro;
    $('proRow').hidden = mode !== 'pro' || !uploaderOn;
    const orig = platform === 'W' && waOriginal;
    $('proCopy').hidden = orig || proProc !== 'termux'; if (!copyFlash) $('proCopy').textContent = t.proCopy;
    { const sel = $('proProc'), has = sel.options.length > 2;
      if (platform === 'W' && !has) sel.add(new Option('', 'original')); else if (platform !== 'W' && has) sel.remove(2); }
    $('proEngine').closest('label').hidden = $('proPrep').closest('label').hidden = orig; $('proRow').querySelector('.pro-opts').classList.toggle('orig', orig);
    if ($('proProc').options[2]) $('proProc').options[2].text = t.procOriginal;
    $('proProcLbl').textContent = t.proProcL; $('proProc').options[0].text = t.procBrowser; $('proProc').options[1].text = t.procTermux; $('proProc').value = orig ? 'original' : proProc;
    $('proEngLbl').textContent = t.proEng; $('proPrepLbl').textContent = t.proPrepL;
    { const ps = $('proPrep'), noAL = proMax && proProc === 'browser', noTT = proMax || platform === 'W', sig = lang + (proMax ? 'M' : '') + (noAL ? 'B' : '') + platform;
      if ((noTT && proPrep === 'tiktok') || (noAL && proPrep === 'antilag')) { proPrep = 'normal'; store.set({ rehineProPrep: proPrep }); }
      if (ps.dataset.sig !== sig) {
        ps.innerHTML = ''; ps.add(new Option(proMax ? t.prepNormal4k : t.prepNormal, 'normal')); if (!noTT) ps.add(new Option(t.prepTiktok, 'tiktok')); if (!noAL) ps.add(new Option(t.prepAntilag, 'antilag'));
        ps.dataset.sig = sig;
      }
      ps.value = proPrep; $('proEngine').value = proEngine;
      $('proMax').classList.toggle('on', proMax); $('proMax').setAttribute('aria-pressed', String(proMax)); $('proMax').title = t.proMaxTip; }
    $('betaRow').hidden = mode !== 'optimasi' || !uploaderOn;
    $('optWarn').textContent = t.optWarn;
    $('betaRow').classList.toggle('off', !uploaderOn);
    $('uploaderBtn').classList.toggle('on', uploaderOn);
    $('uploaderBtn').setAttribute('aria-pressed', String(uploaderOn));
    $('captionText').textContent = captionOn ? t.capOn : t.capOff;
    $('captionBtn').classList.toggle('on', captionOn);
    $('captionBtn').setAttribute('aria-pressed', String(captionOn));
    $('captionBtn').classList.toggle('mention-ok', captionOn && mentionOk());
    $('captionBtn').classList.toggle('mention-wait', captionOn && !mentionOk());
    // MODE hanya berlaku saat UPLOADER aktif
    $('modeLabel').textContent = t.mode;
    // MODE (pilihan, keterangan, ) hanya tampil saat UPLOADER aktif
    $('modeBody').hidden = !uploaderOn;
    $('ctrlTitle').textContent = platform === 'W' ? t.ctrlW : t.ctrl;
    $('modeRow').hidden = $('iconTgl').hidden = platform === 'W'; $('proMax').hidden = platform === 'W'; $('platBtn').disabled = vidSaving;
    $('platBtnText').textContent = platform === 'W' ? 'WhatsApp' : 'TikTok'; $('platBtn').title = t.platTip; $('platBtn').setAttribute('aria-label', t.platTip);
    document.querySelectorAll('#modeSeg [data-mode]').forEach((b) => { const on = b.dataset.mode === mode; b.classList.toggle('active', on); b.setAttribute('aria-checked', String(on)); b.disabled = !uploaderOn; });
    $('modeRow').classList.toggle('off', !uploaderOn);
    $('descText').placeholder = platform === 'W' ? t.descPhW : t.descPh;
    $('tagNote').closest('.note-row').hidden = platform === 'W';
    if (document.activeElement !== $('descText')) $('descText').value = desc;
    $('descCount').textContent = desc.length;
    renderTagNote();
    $('descClear').textContent = t.clear;
    $('descClear').hidden = !desc;
    $('tagsText').textContent = autoTags ? t.tagsOn : t.tagsOff;
    $('tagsBtn').classList.toggle('on', autoTags);
    $('tagsBtn').setAttribute('aria-pressed', String(autoTags));
    [['captionBtn', 'captionText'], ['tagsBtn', 'tagsText'], ['uploaderBtn', 'uploaderText']].forEach(([b, l]) => { $(b).title = $(l).textContent; $(b).setAttribute('aria-label', $(l).textContent); });
    $('footText').textContent = t.official;
    try { $('footVer').textContent = (lang === 'id' ? 'Versi v' : 'Version v') + chrome.runtime.getManifest().version; } catch (_) {}
    $('langBtn').setAttribute('aria-label', t.langLabel);
    $('langBtnText').textContent = lang.toUpperCase();
  }

  // bahasa + saklar disimpan di chrome.storage dan dibaca oleh halaman TikTok Studio
  store.get({ rehineLang: null, rehinePlatform: 'T', rehineWaOriginal: false, rehineUploader: true, rehineCaption: true, rehineMode: 'pro', rehineProEngine: 'obx', rehineProProc: 'browser', rehineProMax: false, rehineProPrep: 'normal', rehineBetaAudio: null, rehineBetaClone: 'on', rehineBetaTail: 'normal', rehineBetaPatch: 'on', rehineBetaOrder: 'patchfirst', rehineBetaLayout: 'end', rehineBetaTime: 'normal', rehineBeta2Variant: 'phone', rehineBeta3Variant: 'phone', rehineDesc: '', rehineDescOn: false, rehineAutoTags: false, rehineVideoTags: '', rehineMention: null, rehinePending: null, rehineHandoffLog: null, rehineCsVer: null }, (r) => {
    pending = r.rehinePending || null; hoLog = r.rehineHandoffLog || null; csVer = r.rehineCsVer || null;
    mention = r.rehineMention || null;
    // Deskripsi dikosongkan setiap popup dibuka (tutup lalu buka lagi = bersih). Penghapusan baru terjadi saat popup DIBUKA, bukan
    // saat ditutup, jadi deskripsi yang baru ditulis tetap terpakai untuk posting sebelum popup dibuka lagi.
    // DESKRIPSI selalu mulai MATI setiap popup dibuka (sama seperti teksnya).
    if (r.rehineDescOn) store.set({ rehineDescOn: false });
    desc = '';
    if (r.rehineDesc) store.set({ rehineDesc: '', rehineDescOn: false });
    // TAGAR OTOMATIS selalu mulai MATI setiap popup dibuka (sama seperti DESKRIPSI).
    autoTags = false;
    if (r.rehineAutoTags) store.set({ rehineAutoTags: false });
    videoTags = typeof r.rehineVideoTags === 'string' ? r.rehineVideoTags : '';
    lang = r.rehineLang || lang;
    uploaderOn = r.rehineUploader !== false;
    captionOn = r.rehineCaption !== false;
    mode = normMode(r.rehineMode); proEngine = r.rehineProEngine === 'nova' ? 'nova' : 'obx'; proProc = r.rehineProProc === 'termux' ? 'termux' : 'browser'; proMax = r.rehineProMax === true; proPrep = ['tiktok', 'antilag'].includes(r.rehineProPrep) ? r.rehineProPrep : 'normal';
    // migrasi: mode Beta/Test dihapus (lihat migrateMode)
    if (r.rehineMode !== mode || r.rehineMode === 'beta' || r.rehineMode === 'beta2' || r.rehineMode === 'beta3' || r.rehineMode === 'beta4' || r.rehineMode === 'test' || r.rehineMode === 'custom') {
      mode = normMode(migrateMode(r.rehineMode, r.rehineBetaAudio));
      store.set({ rehineMode: mode });
    }
    store.remove(['rehineFakeSize', 'rehineBetaVariant', 'rehineBetaAudio', 'rehineBetaClone', 'rehineBetaTail', 'rehineBetaPatch', 'rehineBetaOrder', 'rehineBetaLayout', 'rehineBetaTime', 'rehineBeta2Variant', 'rehineBeta3Variant', 'rehineBeta4Variant']);
    if (!r.rehineLang) store.set({ rehineLang: lang });
    waOriginal = r.rehineWaOriginal === true;
    if (r.rehinePlatform === 'W') { setPlatform('W', false); if (pending) { pending = null; RehineHandoffDB.clear().catch(() => {}); store.remove(['rehinePending', 'rehineHandoff']); } }
    render();
  });
  render();

  // satu klik = ganti bahasa langsung (EN <-> ID)
  $('langBtn').onclick = () => { lang = lang === 'id' ? 'en' : 'id'; store.set({ rehineLang: lang }); render(); };
  function setPlatform(p, persist) {
    if (p === 'W' && platform !== 'W') { savedMode = mode; savedUploader = uploaderOn; savedMax = proMax; mode = 'pro'; uploaderOn = true; proMax = false; }
    else if (p === 'T' && platform === 'W') { mode = savedMode || mode; uploaderOn = savedUploader; proMax = savedMax; }
    if (persist && p !== platform && !vidSaving && (pending || chosen)) { pending = null; chosen = null; chosenSize = null; vidChips = []; vidErr = false; vidProblem = ''; waMsg = ''; waBusy = false; RehineHandoffDB.clear().catch(() => {}); store.remove(['rehinePending', 'rehineHandoff']); }
    platform = p;
    if (p === 'T') enforceTags();   // kembali ke TikTok: batas 5 hashtag berlaku lagi
    if (p === 'W' && proPrep === 'tiktok') proPrep = 'normal';
    if (persist) store.set({ rehinePlatform: p });
    render();
  }
  $('platBtn').onclick = () => setPlatform(platform === 'W' ? 'T' : 'W', true);
  // W: unggah ke Status WhatsApp Web lewat service worker (diproses di latar belakang)
  async function sendWA() {
    const t = TXT[lang], CH = 3 * 1024 * 1024;
    try {
      const rec = await RehineHandoffDB.get(); if (!rec || !rec.blob) return;
      waBusy = true; waMsg = t.waPrep; render();
      const port = chrome.runtime.connect({ name: 'rehine-wa-upload' });
      port.onMessage.addListener((m) => { if (m.log) { waMsg = m.log; if (/^(Selesai|Error|Gagal|Keterangan)/.test(m.log)) waBusy = false; if (/^Selesai: status terkirim/.test(m.log)) { pending = null; chosen = null; chosenSize = null; vidChips = []; vidErr = false; vidProblem = ''; RehineHandoffDB.clear().catch(() => {}); store.remove(['rehinePending', 'rehineHandoff']); } render(); } });
      const total = Math.max(1, Math.ceil(rec.blob.size / CH));
      port.postMessage({ type: 'meta', name: rec.name || 'video.mp4', mime: 'video/mp4', total });
      for (let i = 0; i < total; i++) {
        const b64 = await new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(String(r.result).split(',')[1]); r.onerror = () => rej(r.error); r.readAsDataURL(rec.blob.slice(i * CH, (i + 1) * CH)); });
        port.postMessage({ type: 'chunk', index: i, data: b64 });
        waMsg = t.waPrep + ' ' + (i + 1) + '/' + total; render();
      }
      port.postMessage({ type: 'run', caption: desc.trim(), autoSend: true, focusWindow: true });
      if (!waMsg || waMsg === t.waPrep || /^[\w ]*\d+\/\d+$/.test(waMsg) || waMsg.indexOf(t.waPrep) === 0) { waMsg = t.waBg; render(); }
    } catch (e) { waBusy = false; waMsg = 'Error: ' + (e && e.message || e); render(); }
  }
  // saluran cadangan: log dari service worker lewat storage (port putus bila popup tertutup/pindah tab)
  function applyWaLog(l) {
    if (!l || !l.msg || Date.now() - l.ts > 5 * 60 * 1000) return;
    waMsg = l.msg;
    if (/^(Selesai|Error|Gagal|Keterangan)/.test(l.msg)) waBusy = false; else waBusy = true;
    if (/^Selesai: status terkirim/.test(l.msg) && (pending || chosen)) { pending = null; chosen = null; chosenSize = null; vidChips = []; vidErr = false; vidProblem = ''; RehineHandoffDB.clear().catch(() => {}); store.remove(['rehinePending', 'rehineHandoff']); }
    render();
  }
  try {
    chrome.storage.onChanged.addListener((ch, area) => { if (area === 'session' && ch.lastLog) applyWaLog(ch.lastLog.newValue); });
    chrome.storage.session.get('lastLog').then((r) => { const l = r && r.lastLog; if (l && !/^(Selesai|Error|Gagal|Keterangan)/.test(l.msg)) applyWaLog(l); else if (l && Date.now() - l.ts < 120000) { waMsg = l.msg; render(); } }).catch(() => {});
  } catch (_) {}
  $('uploaderBtn').onclick = () => { uploaderOn = !uploaderOn; store.set({ rehineUploader: uploaderOn }); render(); };
  $('captionBtn').onclick = () => { captionOn = !captionOn; store.set({ rehineCaption: captionOn }); render(); };
  $('proCopy').onclick = async (e) => {
    e.preventDefault(); e.stopPropagation();
    try {
      const src = await (await fetch(chrome.runtime.getURL('termux/rehine_server.py'))).text();
      const cmd = 'pkill -f rehine_server.py 2>/dev/null; (command -v python >/dev/null && command -v ffmpeg >/dev/null && command -v ffprobe >/dev/null) || DEBIAN_FRONTEND=noninteractive pkg install -y python ffmpeg; termux-wake-lock 2>/dev/null\n'
        + "cat > ~/rehine_server.py <<'REHINE_EOF'\n" + src.replace(/\n+$/, '') + '\nREHINE_EOF\n'
        + 'nohup python ~/rehine_server.py >/dev/null 2>&1 &\nsleep 1; echo "RE:HINE server aktif di latar belakang (hentikan: pkill -f rehine_server.py)"\n';
      try { await navigator.clipboard.writeText(cmd); }
      catch (_) { const ta = document.createElement('textarea'); ta.value = cmd; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); ta.remove(); }
      copyFlash = true; $('proCopy').textContent = TXT[lang].proCopied; setTimeout(() => { copyFlash = false; render(); }, 1800);
    } catch (_) { $('proCopy').textContent = '!'; }
  };
  $('proMax').onclick = (e) => { e.preventDefault(); e.stopPropagation(); proMax = !proMax; if (proMax && proPrep === 'tiktok') proPrep = 'normal'; store.set({ rehineProMax: proMax, rehineProPrep: proPrep }); render(); };
  $('proProc').onchange = () => { const v = $('proProc').value; if (v === 'original') { waOriginal = true; store.set({ rehineWaOriginal: true }); } else { waOriginal = false; proProc = v; store.set({ rehineProProc: proProc, rehineWaOriginal: false }); } render(); if (platform === 'W' && waOriginal && chosen && !pending && !vidSaving) $('vidProc').onclick(); };
  $('proEngine').onchange = () => { proEngine = $('proEngine').value; store.set({ rehineProEngine: proEngine }); };
  $('proPrep').onchange = () => { proPrep = $('proPrep').value; store.set({ rehineProPrep: proPrep }); };
  document.querySelectorAll('#modeSeg [data-mode]').forEach((b) => { b.onclick = () => { mode = normMode(b.dataset.mode); store.set({ rehineMode: mode }); render(); }; });
  function enforceTags() {   // memotong hashtag berlebih (dari belakang) dan menyimpan hasilnya
    const cut = limitTags(desc, tagRoom());
    if (cut === desc) return false;
    desc = cut; $('descText').value = cut; $('descCount').textContent = cut.length;
    clearTimeout(descTimer); store.set({ rehineDesc: desc, rehineDescOn: !!desc.trim() });
    return true;
  }
  let descTimer = null;
  $('descText').oninput = () => {
    const el = $('descText'), hashes = (x) => (String(x).match(/#/g) || []).length, room = tagRoom();
    let v = el.value;
    if (countTags(v) > room) v = (v.length - desc.length > 1) ? limitTags(v, room) : desc;           // tempel banyak -> potong; satu ketikan -> tolak
    else if (countTags(desc) >= room && hashes(v) > hashes(desc)) v = desc;                         // tagar penuh: '#' baru ditolak
    if (v !== el.value) { el.value = v; el.setSelectionRange(v.length, v.length); $('tagNote').classList.add('hit'); setTimeout(() => $('tagNote').classList.remove('hit'), 700); }
    desc = v;
    $('descCount').textContent = desc.length; renderTagNote();
    clearTimeout(descTimer); descTimer = setTimeout(() => store.set({ rehineDesc: desc, rehineDescOn: !!desc.trim() }), 200);
  };
  $('descText').onblur = () => { clearTimeout(descTimer); store.set({ rehineDesc: desc, rehineDescOn: !!desc.trim() }); };
  $('descClear').onclick = () => { desc = ''; clearTimeout(descTimer); $('descText').value = ''; store.set({ rehineDesc: '', rehineDescOn: false }); render(); $('descText').focus(); };
  const toggleCard = () => { if (pending) return; cardOpen = !cardOpen; render(); };
  $('ctrlHead').onclick = toggleCard;
  $('ctrlHead').onkeydown = (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleCard(); } };
  $('tagsBtn').onclick = () => { autoTags = !autoTags; store.set({ rehineAutoTags: autoTags }); enforceTags(); render(); };
  try { chrome.storage.onChanged.addListener((ch, a) => { if (a !== 'local') return; if (ch.rehineHandoffLog) { hoLog = ch.rehineHandoffLog.newValue || null; render(); } if (ch.rehineCsVer) { csVer = ch.rehineCsVer.newValue || null; render(); } if (ch.rehinePending) { pending = ch.rehinePending.newValue || null; render(); } if (ch.rehineMention) mention = ch.rehineMention.newValue || null; if (ch.rehineVideoTags) videoTags = ch.rehineVideoTags.newValue || ''; if (ch.rehineDesc && document.activeElement !== $('descText')) desc = ch.rehineDesc.newValue || ''; render(); }); } catch (e) {}
  $('waBtn').onclick = () => chrome.tabs.create({ url: WHATSAPP_URL });
  const launch = async (direct) => {
    // nyalakan desktop mode dulu (HP), baru buka TikTok Studio
    try { await RehineDesktop.ensure(); } catch (e) {}
    // unggah langsung: tandai serah-terima; halaman Studio mengambil video sendiri (berlaku 3 menit, sekali pakai)
    if (direct && pending && !vidSaving) { try { await new Promise((r) => store.set({ rehineHandoff: { id: pending.id, ts: Date.now() } }, r)); } catch (e) {} }
    chrome.tabs.create({ url: direct ? STUDIO_URL : STUDIO_HOME_URL });
  };
  $('launchBtn').onclick = () => launch(false);   // hanya buka TikTok Studio
  $('vidGo').onclick = () => (platform === 'W' ? sendWA() : launch(true));        // unggah video terpilih langsung ke TikTok
  // pilih video di popup: disimpan ke IndexedDB extension, lalu diambil halaman TikTok Studio
  $('vidPick').onclick = () => { if (!vidSaving) $('vidInput').click(); };
  // Baca info video tanpa memuat seluruh file: cari box ftyp & moov lewat potongan Blob, lalu parse gabungannya.
  async function readMeta(blob) {
    try {
      const M = globalThis.RehineVideoMeta; if (!M) return null;
      const parts = []; let o = 0;
      while (o + 8 <= blob.size && parts.length < 2) {
        const h = new DataView(await blob.slice(o, o + 16).arrayBuffer());
        let size = h.getUint32(0), hdr = 8;
        const type = String.fromCharCode(h.getUint8(4), h.getUint8(5), h.getUint8(6), h.getUint8(7));
        if (size === 1) { size = Number(h.getBigUint64(8)); hdr = 16; } else if (size === 0) size = blob.size - o;
        if (size < hdr) break;
        if (type === 'ftyp' || type === 'moov') { if (size > 64 * 1024 * 1024) return null; parts.push(new Uint8Array(await blob.slice(o, o + size).arrayBuffer())); }
        o += size;
      }
      const n = parts.reduce((a, p) => a + p.length, 0), buf = new Uint8Array(n); let p = 0;
      for (const x of parts) { buf.set(x, p); p += x.length; }
      const m = M.parse(buf);
      return m ? { w: m.w, h: m.h, fps: m.fps, bitrate: m.bitrate, codec: m.codec, codecKey: m.codecKey, container: m.container } : null;
    } catch (_) { return null; }
  }
  // memilih video TIDAK langsung memproses: hanya membaca info, lalu tombol "PROSES VIDEO" yang menjalankan
  $('vidInput').onchange = async () => {
    const f = $('vidInput').files && $('vidInput').files[0];
    $('vidInput').value = '';
    if (!f) return;
    waMsg = ''; chosen = f; chosenSize = null; pending = null; vidErr = false; vidProblem = ''; vidChips = []; cardOpen = true;
    try { await RehineHandoffDB.clear(); } catch (_) {}
    store.remove(['rehinePending', 'rehineHandoff']);
    chosenDesc = Promise.resolve();
    try { chosenDesc = globalThis.RehineCore.pro.describe(f).then((c) => { if (chosen === f) { vidChips = c; chosenSize = c.w ? { w: c.w, h: c.h } : null; render(); } }).catch(() => {}); } catch (_) {}
    render();
    if (platform === 'W' && waOriginal) $('vidProc').onclick();   // Original: tanpa langkah PROSES VIDEO
  };
  $('vidProc').onclick = async () => {
    const f = chosen; if (!f || vidSaving) return;
    const useMode = effMode(), t = TXT[lang];   // Original: berkas dikirim apa adanya
    vidSaving = true; vidErr = false; vidProblem = '';
    const ctl = new AbortController(); procCtl = ctl;
    const descP = chosenDesc;
    vidNote = '';
    render();
    let out = f;
    try {
      // Video diproses LANGSUNG di sini (popup); tidak ada fallback otomatis: bila tidak cocok, pengguna mengganti mode manual.
      if (uploaderOn) {
        await new Promise((r) => setTimeout(r, 40));   // beri waktu UI menggambar status "Memproses…"
        const core = globalThis.RehineCore;
        if (!core || !core.modes) throw new Error('modul patch tidak termuat');
        try { out = await core.modes.run(useMode, f, { signal: ctl.signal, max: proMax, proc: proProc, engine: proEngine, prep: proPrep, onStatus: (m) => { vidNote = m; render(); }, onProgress: (p) => { vidNote = t.vidSaving + ' ' + Math.round(p * 100) + '%'; render(); } }); }
        catch (err) {
          if (ctl.signal.aborted) { vidProblem = t.vidCancelled; pending = null; vidSaving = false; procCtl = null; render(); try { await RehineHandoffDB.clear(); } catch (_) {} store.remove(['rehinePending', 'rehineHandoff']); return; }
          const nm = t['seg' + useMode.charAt(0).toUpperCase() + useMode.slice(1)] || useMode;
          const why = (() => { try { return core.errText(err && err.message ? err.message : String(err), lang); } catch (_) { return String(err && err.message || err); } })();
          vidProblem = /^Termux:/.test(why) ? why : t.vidMisfit.replace('%m', nm).replace('%r', why);
          pending = null; vidSaving = false; procCtl = null; render();
          try { await RehineHandoffDB.clear(); } catch (_) {}
          store.remove(['rehinePending', 'rehineHandoff']);
          return;
        }
      }
      if (ctl.signal.aborted) throw new Error('Cancelled');
      await descP;
      const id = String(Date.now());
      const meta = await readMeta(out);   // resolusi, FPS, bitrate, codec dari video hasil proses (hanya box ftyp+moov yang dibaca)
      if (meta) { try { store.set({ rehineVideoTags: globalThis.RehineVideoMeta.tags(meta).join(' ') }); } catch (_) {} }
      await RehineHandoffDB.put({ id, name: f.name, type: f.type, size: out.size, lastModified: f.lastModified, blob: out, processed: true, mode: uploaderOn ? useMode : '' });
      pending = { id, name: f.name, size: out.size, mode: uploaderOn ? useMode : '', meta, chips: vidChips };
      chosen = null;
      if (platform !== 'W') await new Promise((r) => store.set({ rehinePending: pending }, r));   // W: Uploader TikTok mati, video tidak diserahkan ke TikTok Studio
    } catch (e) { if (ctl.signal.aborted) { vidProblem = t.vidCancelled; } else vidErr = true; pending = null; try { await RehineHandoffDB.clear(); } catch (_) {} }
    vidSaving = false; vidNote = ''; procCtl = null; render();
  };
  $('vidCancel').onclick = () => { try { if (procCtl) procCtl.abort(new Error('Cancelled')); } catch (_) {} };
  $('vidClear').onclick = async () => {
    pending = null; chosen = null; chosenSize = null; vidChips = []; vidErr = false; vidProblem = ''; cardOpen = true; render();
    try { await RehineHandoffDB.clear(); } catch (_) {}
    store.remove(['rehinePending', 'rehineHandoff']);
  };
})();
