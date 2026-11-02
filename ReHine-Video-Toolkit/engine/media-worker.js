// ReHine V3.9 media metadata fetcher. Uses only the current page's media URL and browser-managed TikTok session; never logs or stores cookies.
'use strict';
const ALLOWED_SUFFIXES = ['tiktokcdn.com','tiktokv.com','byteoversea.com','ibytedtos.com','muscdn.com','tiktokcdn-us.com'];
function allowed(url) {
  try { const u=new URL(url); return u.protocol==='https:' && (/^v\d+-webapp-prime\.tiktok\.com$/.test(u.hostname) || ALLOWED_SUFFIXES.some(s=>u.hostname===s || u.hostname.endsWith('.'+s))); }
  catch (_) { return false; }
}
async function readLimited(response, limit=4194304) {
  if (!response.body) return new Uint8Array(await response.arrayBuffer()).slice(0,limit);
  const reader=response.body.getReader(), chunks=[]; let total=0;
  try {
    while(total<limit) {
      const {done,value}=await reader.read(); if(done) break;
      const take=Math.min(value.byteLength,limit-total); if(take>0){chunks.push(value.slice(0,take));total+=take;}
      if(take<value.byteLength || total>=limit){try{await reader.cancel();}catch(_){} break;}
    }
  } finally { try { reader.releaseLock(); } catch(_){} }
  const out=new Uint8Array(total); let offset=0; for(const c of chunks){out.set(c,offset);offset+=c.byteLength;} return out;
}
function mergeScan(target, source) { target.hdr.push(...source.hdr); target.codecs.push(...source.codecs); target.sampleTables.push(...source.sampleTables); return target; }
function scanMoovChunk(bytes) {
  const out={hdr:[],codecs:[],sampleTables:[]};
  for(let i=4;i+4<=bytes.length;i++) {
    if(fourcc(bytes,i)!=='moov') continue;
    const start=i-4; let size=u32(bytes,start), header=8;
    if(size===1){ if(start+16>bytes.length) continue; size=u32(bytes,start+8)*4294967296+u32(bytes,start+12); header=16; }
    if(size>=header && start+size<=bytes.length){ scan(bytes,start+header,start+size,0,out); }
    if(out.codecs.length||out.hdr.length||out.sampleTables.length) break;
  }
  return out;
}
function u32(b,o){return o+4<=b.length?new DataView(b.buffer,b.byteOffset,b.byteLength).getUint32(o,false):0;}
function u16(b,o){return o+2<=b.length?new DataView(b.buffer,b.byteOffset,b.byteLength).getUint16(o,false):0;}
function fourcc(b,o){return o+4<=b.length?String.fromCharCode(b[o],b[o+1],b[o+2],b[o+3]):'';}
function scan(b,start=0,end=b.length,depth=0,out={hdr:[],codecs:[],sampleTables:[]}) {
 if(depth>12)return out; let o=start;
 while(o+8<=end && o+8<=b.length){let size=u32(b,o),type=fourcc(b,o+4),head=8;
  if(size===1){if(o+16>b.length)break;size=u32(b,o+8)*4294967296+u32(b,o+12);head=16;} else if(size===0)size=end-o;
  if(!Number.isFinite(size)||size<head||o+size>end||o+size>b.length)break;
  const d=o+head,e=o+size;
  if(type==='colr'&&fourcc(b,d)==='nclx'&&d+11<=e)out.hdr.push({prim:u16(b,d+4),trc:u16(b,d+6),matrix:u16(b,d+8)});
  if(type==='dvcC'||type==='dvvC')out.hdr.push({dolby:type});
  if(type==='hvcC')out.codecs.push('HEVC/H.265'); if(type==='avcC')out.codecs.push('H.264/AVC'); if(type==='av1C')out.codecs.push('AV1');
  if(type==='stts'&&d+8<=e){const n=u32(b,d+4);let p=d+8,samples=0,ticks=0;for(let i=0;i<n&&p+8<=e;i++,p+=8){samples+=u32(b,p);ticks+=u32(b,p)*u32(b,p+4);}if(samples>0&&ticks>0)out.sampleTables.push({samples,ticks});}
  const containers=new Set(['moov','trak','mdia','minf','stbl','edts','dinf','udta','meta','ilst','sinf','schi','meco','mere','wave']);
  if(containers.has(type))scan(b,d+(type==='meta'?4:0),e,depth+1,out);
  o=e;
 }
 return out;
}
chrome.runtime.onMessage.addListener((msg, sender, sendResponse)=>{
 if(msg?.type!=='REHINE_INSPECT_MEDIA')return;
 (async()=>{
  const url=String(msg.url||'');
  if(!allowed(url)) { let host='URL tidak valid'; try { const u=new URL(url); host=`${u.protocol}//${u.hostname}`; } catch (_) {} return {ok:false,status:`Domain/protokol media tidak termasuk daftar izin ReHine: ${host}`,reason:'HOST_NOT_ALLOWED',rejectedHost:host}; }
  try {
   const request=(range)=>fetch(url,{headers:{Range:range},credentials:'include',cache:'no-store',redirect:'follow',referrer:'https://www.tiktok.com/',referrerPolicy:'strict-origin-when-cross-origin'});
   const r=await request('bytes=0-4194303');
   const contentType=r.headers.get('content-type')||null;
   const contentRange=r.headers.get('content-range')||null;
   const acceptRanges=r.headers.get('accept-ranges')||null;
   if(!r.ok&&r.status!==206)return {ok:false,status:`Permintaan media gagal (HTTP ${r.status}); Content-Type=${contentType||'tidak tersedia'}; Content-Range=${contentRange||'tidak tersedia'}; Accept-Ranges=${acceptRanges||'tidak tersedia'}. URL mungkin kedaluwarsa atau CDN menolak akses dari konteks browser.`,httpStatus:r.status,contentType,contentRange,acceptRanges,reason:'MEDIA_REQUEST_REJECTED'};
   const b=await readLimited(r,4194304);
   if(!b.length)return {ok:false,status:`CDN mengembalikan data kosong (HTTP ${r.status}); Content-Type=${contentType||'tidak tersedia'}; Content-Range=${contentRange||'tidak tersedia'}.`,httpStatus:r.status,contentType,contentRange,acceptRanges};
   let s=scan(b); let cr=contentRange||''; let total=Number(cr.match(/\/(\d+)$/)?.[1]||0);
   if(!total && r.status===200) total=Number(r.headers.get('content-length')||0);
   let tailStatus='tidak diperlukan';
   if(r.status===206 && total>4194304) {
    try {
     const from=Math.max(0,total-4194304); const tail=await request(`bytes=${from}-${total-1}`);
     tailStatus=`HTTP ${tail.status}`;
     if(tail.status===206){ const tb=await readLimited(tail,4194304); const ts=scanMoovChunk(tb); mergeScan(s,ts); }
    } catch(e) { tailStatus='gagal: '+String(e?.message||e); }
   }
   if(r.status===200 && !contentRange) tailStatus='server mengabaikan Range';
   let hdr='Metadata HDR tidak ditemukan pada bagian file yang terbaca; bukan bukti bahwa video SDR';
   const dv=s.hdr.find(x=>x.dolby), c=s.hdr.find(x=>x.trc!==undefined);
   if(dv)hdr=`Indikator Dolby Vision (${dv.dolby}) ditemukan; profil perlu diverifikasi`;
   else if(c&&c.trc===16&&c.prim===9)hdr='Indikator HDR PQ / BT.2020 terdeteksi (nclx)';
   else if(c&&c.trc===18)hdr='Indikator HLG terdeteksi (nclx)';
   else if(c)hdr=`Metadata warna nclx: primaries=${c.prim}, transfer=${c.trc}, matrix=${c.matrix}; belum cukup untuk menyimpulkan HDR`;
   const statusText=`Berhasil membaca ${b.length.toLocaleString('id-ID')} byte (HTTP ${r.status}); ${r.status===206?'Range diterima':'server mengabaikan Range, pembacaan dibatasi 4 MiB'}. Content-Type=${contentType||'tidak tersedia'}; Content-Range=${contentRange||'tidak tersedia'}; Accept-Ranges=${acceptRanges||'tidak tersedia'}; pemeriksaan byte akhir=${tailStatus}.`;
   return {ok:true,status:statusText,bytes:b.length,total:total||null,httpStatus:r.status,contentType,contentRange,acceptRanges,hdr,codec:[...new Set(s.codecs)].join(', ')||null,sampleTables:s.sampleTables};
  }catch(e){return {ok:false,status:'Pembacaan media dari service worker gagal. CDN mungkin menolak permintaan, membutuhkan URL terbaru, atau membatasi akses browser.',reason:String(e?.message||e)};}
 })().then(sendResponse).catch(e=>sendResponse({ok:false,status:'Pemeriksaan media gagal.',reason:String(e?.message||e)}));
 return true;
});
