'use strict';
const API_ORIGIN = 'https://cutefish.my.id/api/';
const CDN_SUFFIXES = ['tiktokcdn.com','tiktokcdn-us.com','tiktokv.com','byteoversea.com','ibytedtos.com','muscdn.com'];
function isTikTokVideoUrl(value) {
  try { const u=new URL(value); return u.protocol==='https:' && (u.hostname==='www.tiktok.com' || u.hostname==='tiktok.com') && /^\/@[^/]+\/video\/\d+\/?$/.test(u.pathname); }
  catch (_) { return false; }
}
function isCdnUrl(value) {
  try { const u=new URL(value); return u.protocol==='https:' && CDN_SUFFIXES.some(s=>u.hostname===s || u.hostname.endsWith('.'+s)); }
  catch (_) { return false; }
}
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg?.type !== 'REHINE_CUTEFISH_REQUEST') return;
  (async () => {
    const endpoint=String(msg.endpoint||'');
    const target=String(msg.url||'');
    if (!['tiktok-resolve','tiktok-fps'].includes(endpoint)) throw new Error('Endpoint tidak diizinkan');
    if (endpoint==='tiktok-resolve' && !isTikTokVideoUrl(target)) throw new Error('URL video TikTok tidak valid');
    if (endpoint==='tiktok-fps' && !isCdnUrl(target)) throw new Error('URL CDN tidak diizinkan');
    const controller=new AbortController();
    const timeout=setTimeout(()=>controller.abort(),20000);
    try {
      const response=await fetch(API_ORIGIN+endpoint+'?url='+encodeURIComponent(target), {
        method:'GET', headers:{'Accept':'application/json'}, cache:'no-store', signal:controller.signal
      });
      if (!response.ok) throw new Error('CuteFish HTTP '+response.status);
      const data=await response.json();
      if (!data || typeof data!=='object' || data.error) throw new Error(data?.error||'Respons CuteFish tidak valid');
      return {ok:true,data};
    } finally { clearTimeout(timeout); }
  })().then(sendResponse).catch(e=>sendResponse({ok:false,error:e?.name==='AbortError'?'Permintaan CuteFish timeout':String(e?.message||e)}));
  return true;
});
