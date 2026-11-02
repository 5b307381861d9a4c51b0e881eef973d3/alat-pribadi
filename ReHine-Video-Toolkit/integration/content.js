(() => {
  'use strict';
  const UPLOAD_PATH = '/tiktokstudio/upload';
  const isUploadPage = () => location.origin === 'https://www.tiktok.com' && location.pathname === UPLOAD_PATH;
  const isPublicVideoPage = () => location.origin === 'https://www.tiktok.com' && /^\/@[^/]+\/video\/\d+\/?$/.test(location.pathname);

  let busy = false;
  let panel = null;
  let statusNode = null;
  let active = false;
  let analyzerPanel = null;
  let analyzerOutput = null;
  let lastRoute = '';
  const skipNextChange = new WeakSet();
  const processed = new WeakSet();

  function removePanel() {
    if (panel && panel.isConnected) panel.remove();
    panel = null;
    statusNode = null;
  }
  function removeAnalyzer() {
    if (analyzerPanel && analyzerPanel.isConnected) analyzerPanel.remove();
    analyzerPanel = null;
    analyzerOutput = null;
  }
  function makePanelBase(width) {
    const p = document.createElement('div');
    Object.assign(p.style, {
      position: 'fixed', right: '12px', bottom: '14px', zIndex: '2147483647',
      width, maxWidth: 'calc(100vw - 24px)', maxHeight: '72vh', overflowY: 'auto',
      background: 'linear-gradient(155deg,#0b1220 0%,#111c30 52%,#172b43 100%)', color: '#f8fafc',
      border: '1px solid #3b526d', borderRadius: '22px', padding: '15px',
      font: '12px/1.5 system-ui,-apple-system,sans-serif', boxShadow: '0 22px 60px #020617a8, inset 0 1px 0 #ffffff0c',
      opacity: '.99', boxSizing: 'border-box', backdropFilter: 'blur(20px)'
    });
    if (!document.getElementById('rehine-shared-theme')) {
      const style=document.createElement('style');style.id='rehine-shared-theme';style.textContent=`
        @keyframes rhUploadSpin{to{transform:rotate(360deg)}}
        @keyframes rhLogoGlow{0%,100%{filter:saturate(1);transform:translateY(0) rotate(0deg);box-shadow:0 7px 24px #2dd4bf30}50%{filter:saturate(1.35);transform:translateY(-2px) rotate(4deg);box-shadow:0 9px 30px #60a5fa55}}
        @keyframes rhDotPulse{0%,100%{opacity:.55;transform:scale(.88)}50%{opacity:1;transform:scale(1.12)}}
        @keyframes rhGlowSweep{0%{background-position:0% 50%}100%{background-position:200% 50%}}
        @keyframes rhUploadIn{from{opacity:0;transform:translateY(8px) scale(.985)}to{opacity:1;transform:translateY(0) scale(1)}}
        @keyframes rhUploadSweep{0%{transform:translateX(-120%)}100%{transform:translateX(300%)}}
        [data-rehine-panel],[data-rehine-analyzer]{animation:rhUploadIn .28s ease-out}
      `;(document.head||document.documentElement).append(style);
    }
    return p;
  }
  function ensureUploadPanel() {
    if (!isUploadPage()) { removePanel(); return; }
    if (panel && panel.isConnected) return;
    panel = makePanelBase('min(310px, calc(100vw - 24px))');
    panel.setAttribute('aria-live', 'polite');
    panel.setAttribute('data-rehine-panel', 'true');
    const head=document.createElement('div');
    Object.assign(head.style,{display:'flex',alignItems:'center',gap:'11px',paddingBottom:'13px',marginBottom:'13px',borderBottom:'1px solid #ffffff12'});
    const logo=document.createElement('div');logo.textContent='✦';logo.style.animation='rhLogoGlow 2.8s ease-in-out infinite';
    Object.assign(logo.style,{width:'43px',height:'43px',flex:'0 0 43px',display:'grid',placeItems:'center',borderRadius:'15px',background:'linear-gradient(135deg,#5eead4,#60a5fa)',color:'#062a38',fontSize:'22px',fontWeight:'900',boxShadow:'0 7px 24px #2dd4bf30'});
    const heading=document.createElement('div');heading.style.flex='1';
    const title=document.createElement('div');title.textContent='ReHine Upload';
    Object.assign(title.style,{fontWeight:'900',fontSize:'16px',letterSpacing:'-.35px',lineHeight:'1.25'});
    const sub=document.createElement('div');sub.textContent='SMART VIDEO PROCESSING';
    Object.assign(sub.style,{fontSize:'9px',fontWeight:'800',letterSpacing:'1.05px',color:'#8ea8c5',marginTop:'5px'});
    heading.append(title,sub);
    const badge=document.createElement('span');badge.textContent='READY';
    Object.assign(badge.style,{fontSize:'9px',fontWeight:'900',letterSpacing:'.7px',padding:'5px 7px',borderRadius:'8px',background:'#063c36',color:'#6ee7b7',border:'1px solid #2dd4bf33'});
    head.append(logo,heading,badge);
    const intro=document.createElement('div');intro.textContent='Pilih video MP4. ReHine akan menyiapkan video secara otomatis sebelum diteruskan.';
    Object.assign(intro.style,{fontSize:'11px',lineHeight:'1.55',color:'#a9bbd0',margin:'0 1px 12px'});
    const box=document.createElement('div');
    Object.assign(box.style,{display:'flex',alignItems:'flex-start',gap:'10px',background:'linear-gradient(120deg,#ffffff0b,#ffffff04)',border:'1px solid #ffffff16',borderRadius:'15px',padding:'12px',lineHeight:'1.5',boxShadow:'inset 0 1px 0 #ffffff08'});
    const icon=document.createElement('span');icon.textContent='✓';
    Object.assign(icon.style,{display:'grid',placeItems:'center',width:'27px',height:'27px',flex:'0 0 27px',borderRadius:'9px',background:'#064e3b',color:'#6ee7b7',fontWeight:'950',fontSize:'14px',boxShadow:'0 4px 14px #10b98120'});
    statusNode=document.createElement('div');statusNode.textContent='Siap menunggu video MP4.';
    Object.assign(statusNode.style,{overflowWrap:'anywhere',color:'#e2e8f0',fontSize:'11px',fontWeight:'650',flex:'1',paddingTop:'3px'});
    box.append(icon,statusNode);
    const track=document.createElement('div');Object.assign(track.style,{height:'3px',overflow:'hidden',borderRadius:'9px',background:'#26364a',marginTop:'12px'});
    const fill=document.createElement('div');Object.assign(fill.style,{height:'100%',width:'0%',borderRadius:'9px',background:'linear-gradient(90deg,#2dd4bf,#60a5fa)',transition:'width .25s ease'});track.append(fill);
    const foot=document.createElement('div');foot.textContent='✦ Pemrosesan lokal · File asli tetap aman';
    Object.assign(foot.style,{fontSize:'9px',lineHeight:'1.5',color:'#7489a4',textAlign:'center',marginTop:'10px'});
    panel.append(head,intro,box,track,foot);
    panel._statusIcon=icon;panel._statusBox=box;panel._statusBadge=badge;panel._progressFill=fill;
    (document.documentElement || document.body).append(panel);
  }
  function status(message, type) {
    ensureUploadPanel(); if (!statusNode || !panel) return;
    const kind=type || (/tidak dapat|gagal|error/i.test(message)?'error':/tanpa audio/i.test(message)?'warn':/siap\.|berhasil|diteruskan/i.test(message)?'success':/menyiapkan|memproses/i.test(message)?'loading':'info');
    const styles={success:['✓','#064e3b','#6ee7b7','#6ee7b7','DONE'],error:['!','#7f1d1d','#fecaca','#fca5a5','ERROR'],warn:['⚠','#78350f','#fde68a','#fcd34d','NOTICE'],info:['i','#1e3a5f','#93c5fd','#93c5fd','INFO'],loading:['','#123c55','#bae6fd','#5eead4','PROCESSING']};
    const spec=styles[kind]||styles.info;const icon=panel._statusIcon;
    icon.textContent=spec[0];Object.assign(icon.style,{background:spec[1],color:spec[2],boxShadow:kind==='success'?'0 4px 14px #10b98120':'none'});
    panel._statusBadge.textContent=spec[4];Object.assign(panel._statusBadge.style,{background:kind==='success'?'#063c36':kind==='error'?'#4c1720':kind==='warn'?'#49310c':'#14263d',color:spec[3],borderColor:spec[3]+'35'});
    statusNode.replaceChildren();const text=document.createElement('span');text.textContent=message;statusNode.append(text);
    panel._progressFill.style.width=kind==='success'?'100%':kind==='error'?'100%':kind==='warn'?'70%':kind==='loading'?'45%':'0%';
    panel._progressFill.style.background=kind==='error'?'#f87171':kind==='warn'?'#fbbf24':'linear-gradient(90deg,#2dd4bf,#60a5fa)';
    if(kind==='loading'){
      const spinner=document.createElement('span');Object.assign(spinner.style,{display:'inline-block',width:'11px',height:'11px',border:'2px solid #475569',borderTopColor:'#5eead4',borderRadius:'50%',animation:'rhUploadSpin .75s linear infinite',marginLeft:'7px',verticalAlign:'-2px'});text.append(spinner);
      const sweep=document.createElement('div');Object.assign(sweep.style,{height:'100%',width:'25%',background:'linear-gradient(90deg,transparent,#99f6e4,transparent)',animation:'rhUploadSweep 1.4s ease-in-out infinite'});panel._progressFill.replaceChildren(sweep);panel._progressFill.style.width='100%';
    } else panel._progressFill.replaceChildren();
  }
  const fmt = n => {
    if (n === null || n === undefined || n === '') return 'Tidak tersedia';
    const num = Number(n);
    if (!Number.isFinite(num)) return String(n);
    return new Intl.NumberFormat('id-ID').format(num);
  };
  function unwrapCount(value) {
    if (value === null || value === undefined || value === '') return null;
    if (typeof value === 'object') value = value.value ?? value.count ?? value.text ?? value.label ?? null;
    if (value === null || value === undefined || value === '') return null;
    if (typeof value === 'number') return Number.isFinite(value) ? value : null;
    const raw = String(value).trim().replace(/,/g, '');
    const m = raw.match(/^([\d.]+)\s*([KMB])?$/i);
    if (!m) return raw || null;
    const mult = ({K:1e3,M:1e6,B:1e9})[(m[2] || '').toUpperCase()] || 1;
    const n = Number(m[1]) * mult;
    return Number.isFinite(n) ? n : raw;
  }
  function displayCount(value) {
    const n = unwrapCount(value);
    return n === null ? 'Tidak tersedia' : typeof n === 'number' ? fmt(n) : String(n);
  }
  function normalizeStats(obj) {
    if (!obj || typeof obj !== 'object') return null;
    const stats = obj.stats || obj.statsV2 || obj.statistics || obj.stats_v2 || null;
    if (!stats || typeof stats !== 'object') return null;
    const aliases = {
      playCount: ['playCount','play_count','viewCount','view_count','views'],
      diggCount: ['diggCount','digg_count','likeCount','like_count','likes'],
      commentCount: ['commentCount','comment_count','comments'],
      shareCount: ['shareCount','share_count','shares'],
      collectCount: ['collectCount','collect_count','favoriteCount','favorite_count','saveCount','save_count','favorites','saves']
    };
    const out = {};
    for (const [target, keys] of Object.entries(aliases)) {
      for (const key of keys) if (stats[key] !== undefined && stats[key] !== null && stats[key] !== '') { out[target] = stats[key]; break; }
    }
    return Object.keys(out).length ? out : null;
  }
  function deepFindVideoData(root, wantedId = location.pathname.match(/\/video\/(\d+)/)?.[1] || '') {
    if (!root || typeof root !== 'object') return null;
    const seen = new WeakSet();
    const stack = [root];
    let visits = 0, best = null, bestScore = -1;
    while (stack.length && visits < 200000) {
      const obj = stack.pop();
      if (!obj || typeof obj !== 'object' || seen.has(obj)) continue;
      seen.add(obj); visits++;
      const stats = normalizeStats(obj);
      if (stats) {
        const rawId = obj.aweme_id ?? obj.awemeId ?? obj.itemId ?? obj.item_id ?? obj.id ?? obj.videoId ?? obj.video_id ?? '';
        const id = String(rawId);
        const hasVideo = !!(obj.video || obj.videoInfo || obj.video_info || obj.desc || obj.author || obj.authorInfo);
        let score = 1 + (hasVideo ? 2 : 0) + (obj.video ? 3 : 0);
        if (wantedId && id === String(wantedId)) score += 100;
        else if (wantedId && id && id !== String(wantedId)) score -= 20;
        if (score > bestScore) {
          bestScore = score;
          best = { stats, video: obj.video || obj.videoInfo || obj.video_info || null, desc: obj.desc || obj.title || '', id, author: obj.author || obj.authorInfo || obj.author_info || null, createTime: obj.createTime || obj.create_time || obj.create_time_sec || null, region: obj.region || obj.region_code || obj.regionCode || null, shadowban: obj.is_nff_or_nr ?? obj.isNffOrNr ?? null };
        }
      }
      if (Array.isArray(obj)) { for (let i=0;i<obj.length;i++) stack.push(obj[i]); }
      else { for (const k of Object.keys(obj)) { const v=obj[k]; if (v && typeof v==='object') stack.push(v); } }
    }
    return best;
  }
  function extractEmbeddedData(doc = document) {
    const wantedId = location.pathname.match(/\/video\/(\d+)/)?.[1] || '';
    const scripts = [...doc.scripts];
    const likely = scripts.filter(s => {
      const id = (s.id || '').toLowerCase();
      const txt = s.textContent || '';
      return id.includes('universal') || id.includes('sigi') || id.includes('initial') || id.includes('next') ||
        (txt.includes('playCount') || txt.includes('diggCount') || txt.includes('statsV2') || txt.includes('webapp.video-detail'));
    });
    let best = null, bestScore = -1;
    for (const s of likely) {
      const txt = s.textContent || '';
      if (!txt) continue;
      let parsed = null;
      try { parsed = JSON.parse(txt); }
      catch (_) {
        const start = txt.indexOf('{'), end = txt.lastIndexOf('}');
        if (start >= 0 && end > start) { try { parsed = JSON.parse(txt.slice(start, end + 1)); } catch (_) {} }
      }
      if (!parsed) continue;
      const found = deepFindVideoData(parsed, wantedId);
      if (found) {
        let score = (found.stats ? 10 : 0) + (found.video ? 2 : 0) + (wantedId && found.id === wantedId ? 100 : 0);
        if (score > bestScore) { best = found; bestScore = score; }
      }
    }
    return best;
  }
  function getActiveVideoUrl() {
    const match = location.pathname.match(/^\/@([^/]+)\/video\/(\d+)/);
    if (!match) return null;
    return `${location.origin}/@${encodeURIComponent(decodeURIComponent(match[1]))}/video/${match[2]}`;
  }
  async function fetchFreshPageData(videoUrl = getActiveVideoUrl()) {
    if (!videoUrl) return null;
    try {
      const response = await fetch(videoUrl, { credentials: 'same-origin', cache: 'no-store', redirect: 'follow' });
      if (!response.ok) return null;
      const html = await response.text();
      if (!html || html.length > 15_000_000) return null;
      const doc = new DOMParser().parseFromString(html, 'text/html');
      return extractEmbeddedData(doc);
    } catch (_) { return null; }
  }
  function getDomStats() {
    const selectors = {
      playCount: ['[data-e2e="video-views"]','[data-e2e="view-count"]','[data-e2e="video-view-count"]'],
      diggCount: ['[data-e2e="like-count"]','[data-e2e="browse-like-count"]'],
      commentCount: ['[data-e2e="comment-count"]','[data-e2e="browse-comment-count"]'],
      shareCount: ['[data-e2e="share-count"]','[data-e2e="browse-share-count"]'],
      collectCount: ['[data-e2e="undefined-count"]','[data-e2e="favorite-count"]','[data-e2e="collect-count"]']
    };
    const out = {};
    for (const [key, list] of Object.entries(selectors)) {
      for (const selector of list) {
        const el = document.querySelector(selector);
        const n = el ? unwrapCount(el.textContent) : null;
        if (n !== null) { out[key] = n; break; }
      }
    }
    const ariaEls = [...document.querySelectorAll('[aria-label]')];
    const patterns = [
      ['playCount', /(?:^|\b)(?:views?|video views?)\s*[:：]?\s*([\d,.]+\s*[KMB]?)/i],
      ['diggCount', /(?:^|\b)(?:likes?|like)\s*[:：]?\s*([\d,.]+\s*[KMB]?)/i],
      ['commentCount', /comments?\s*[:：]?\s*([\d,.]+\s*[KMB]?)/i],
      ['shareCount', /shares?\s*[:：]?\s*([\d,.]+\s*[KMB]?)/i],
      ['collectCount', /(?:favorites?|saves?|saved)\s*[:：]?\s*([\d,.]+\s*[KMB]?)/i]
    ];
    for (const el of ariaEls) {
      const label = el.getAttribute('aria-label') || '';
      for (const [key, re] of patterns) if (out[key] === undefined) { const m = label.match(re); if (m) out[key] = unwrapCount(m[1]); }
    }
    return Object.keys(out).length ? out : null;
  }
  function getVideoMeta(data) {
    const v = data?.video || {};
    const candidates = [v, v.video, v.videoInfo, v.video_info, v.playAddr, v.play_addr, v.downloadAddr, v.download_addr].filter(x => x && typeof x === 'object');
    const find = keys => { for (const obj of candidates) for (const k of keys) if (obj[k] !== undefined && obj[k] !== null && obj[k] !== '') return obj[k]; return null; };
    return {
      fps: find(['fps','frameRate','frame_rate','frame_rate_num']),
      bitrate: find(['bitrate','bit_rate','bitRate']),
      codec: find(['codecType','codec_type','codec','mimeType','mime_type']),
      size: find(['size','fileSize','file_size']),
      duration: find(['duration','videoDuration','video_duration','durationSec','duration_sec']),
      width: find(['width','videoWidth','video_width']), height: find(['height','videoHeight','video_height']),
      format: find(['format','definition'])
    };
  }
  function getVisibleVideo() {
    const vids = [...document.querySelectorAll('video')];
    vids.sort((a,b) => {
      const ar = a.getBoundingClientRect(), br = b.getBoundingClientRect();
      return (br.width*br.height) - (ar.width*ar.height);
    });
    return vids.find(v => v.videoWidth > 0 && v.videoHeight > 0) || vids[0] || null;
  }
  function row(label, value) {
    const r = document.createElement('div');
    Object.assign(r.style, { display:'flex', justifyContent:'space-between', gap:'10px', padding:'3px 0', borderBottom:'1px solid #26354a' });
    const l = document.createElement('span'); l.textContent = label; l.style.color = '#b9c9d8';
    const v = document.createElement('strong'); v.textContent = value; v.style.textAlign = 'right'; v.style.overflowWrap = 'anywhere';
    r.append(l,v); return r;
  }


  function ensureAnalyzer() {
    if (!isPublicVideoPage()) { removeAnalyzer(); return; }
    if (analyzerPanel && analyzerPanel.isConnected) return;
    analyzerPanel = makePanelBase('min(340px, calc(100vw - 24px))');
    analyzerPanel.setAttribute('data-rehine-analyzer', 'true');
    analyzerOutput = document.createElement('div');
    analyzerPanel.append(analyzerOutput);
    (document.documentElement || document.body).append(analyzerPanel);
    if (window.ReHineCuteFishAnalyzer) {
      window.ReHineCuteFishAnalyzer.mount(analyzerOutput, getActiveVideoUrl);
    } else analyzerOutput.textContent = 'Modul CuteFish tidak tersedia.';
  }

  function syncRoute() {
    const route = isUploadPage() ? 'upload' : isPublicVideoPage() ? 'video' : 'other';
    active = route === 'upload';
    if (route === 'upload') { removeAnalyzer(); ensureUploadPanel(); }
    else if (route === 'video') { removePanel(); ensureAnalyzer(); }
    else { removePanel(); removeAnalyzer(); }
    lastRoute = route;
  }
  function isMp4(input, file) {
    return !!file && (/\.mp4$/i.test(file.name) || file.type === 'video/mp4') &&
      (!input.accept || /video|\.mp4/i.test(input.accept) || input.accept === '*/*');
  }
  async function handleChange(event) {
    if (!active || !isUploadPage()) return;
    const input = event.target;
    if (!(input instanceof HTMLInputElement) || input.type !== 'file') return;
    if (skipNextChange.has(input)) { skipNextChange.delete(input); return; }
    if (busy || !input.files || !input.files.length) return;
    const original = input.files[0];
    if (!isMp4(input, original) || processed.has(original)) return;
    event.stopImmediatePropagation(); event.stopPropagation(); busy = true; ensureUploadPanel();
    try {
      status('ReHine sedang menyiapkan video…', 'loading');
      let result;
      let usedFallback = false;
      try {
        result = await window.ReHineEngine.process(original, { poisonMvhd: true, skipAudio: true });
      } catch (primaryError) {
        status('Mencoba mode kompatibilitas untuk file ini…', 'loading');
        try {
          result = await window.ReHineEngine.process(original, { poisonMvhd: false, skipAudio: true });
          usedFallback = true;
        } catch (fallbackError) {
          const primaryMessage = String(primaryError?.message || primaryError || 'Error tidak diketahui');
          const fallbackMessage = String(fallbackError?.message || fallbackError || 'Error tidak diketahui');
          throw new Error(`Mode utama: ${primaryMessage}. Mode kompatibilitas: ${fallbackMessage}`);
        }
      }
      const newFile = new File([result.blob], original.name, { type: 'video/mp4', lastModified: Date.now() });
      const transfer = new DataTransfer(); transfer.items.add(newFile); input.files = transfer.files;
      processed.add(newFile); skipNextChange.add(input);
      input.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
      input.dispatchEvent(new Event('change', { bubbles: true, composed: true }));
      status(usedFallback ? 'Video siap digunakan. Semua perubahan selesai.' : 'Video berhasil disiapkan dan diteruskan ke TikTok Studio.', 'success');
    } catch (error) {
      status('Video belum dapat disiapkan. Coba ekspor ulang sebagai MP4; file asli tetap aman.', 'error');
    }
    finally { busy = false; }
  }
  document.addEventListener('change', handleChange, true);
  const observer = new MutationObserver(syncRoute);
  function startObserver() { if (document.documentElement) observer.observe(document.documentElement, { childList: true, subtree: true }); syncRoute(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', startObserver, { once: true }); else startObserver();
  window.addEventListener('popstate', syncRoute); window.addEventListener('hashchange', syncRoute);
  setInterval(() => { const route = isUploadPage() ? 'upload' : isPublicVideoPage() ? 'video' : 'other'; if (route !== lastRoute || (route==='upload' && (!panel || !panel.isConnected)) || (route==='video' && (!analyzerPanel || !analyzerPanel.isConnected))) syncRoute(); }, 700);
})();
