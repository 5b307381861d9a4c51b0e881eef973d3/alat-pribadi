/* ReHine V3 browser port of the supplied Re:Hine_replicate.py.
   Runs locally in the browser. Test on copies; the output is structurally modified. */
(() => {
  'use strict';
  const PERCENT = 10;
  const PAD_SAMPLE_SIZE = 8;
  const PAD_SAMPLE_BYTES = new Uint8Array([0, 0, 0, 4, 0, 0, 0, 0]);
  const COMMENT_TEXT = new TextEncoder().encode('Patched by Re:Hine');
  const CONTAINERS = new Set(['moov','trak','edts','mdia','minf','stbl','udta','meta','ilst','dinf']);
  const MYSTERY_NAME_BYTES = new Uint8Array([46,103,103,47,109,97,115,107,97]);
  const te = new TextEncoder();
  class ReHineError extends Error {}
  const u32 = (b,o=0) => new DataView(b.buffer,b.byteOffset,b.byteLength).getUint32(o,false);
  const u64 = (b,o=0) => { const v = new DataView(b.buffer,b.byteOffset,b.byteLength).getBigUint64(o,false); if(v>BigInt(Number.MAX_SAFE_INTEGER)) throw new ReHineError('Offset MP4 terlalu besar untuk diproses aman di browser.'); return Number(v); };
  const p32 = v => { const b=new Uint8Array(4); new DataView(b.buffer).setUint32(0, Number(v)>>>0, false); return b; };
  const p64 = v => { const b=new Uint8Array(8); new DataView(b.buffer).setBigUint64(0, BigInt(v), false); return b; };
  const concat = (...parts) => { const n=parts.reduce((s,p)=>s+p.length,0), out=new Uint8Array(n); let o=0; for(const p of parts){out.set(p,o);o+=p.length;} return out; };
  const fourcc = (b,o) => String.fromCharCode(...b.subarray(o+4,o+8));
  const typeBytes = s => { const b=new Uint8Array(4); b.fill(32); for(let i=0;i<Math.min(4,s.length);i++) b[i]=s.charCodeAt(i)&255; return b; };
  function parseBoxes(buf,start,end){
    const out=[]; let pos=start;
    while(pos+8<=end){
      const size0=u32(buf,pos), typ=fourcc(buf,pos); let size=size0, hdr=8;
      if(size0===1){ if(pos+16>end) throw new ReHineError('Header 64-bit atom terpotong.'); size=u64(buf,pos+8); hdr=16; }
      else if(size0===0) size=end-pos;
      if(size<hdr || pos+size>end) throw new ReHineError(`Ukuran atom '${typ}' tidak valid pada offset ${pos}.`);
      const bodyStart=pos+hdr, bodyEnd=pos+size;
      if(CONTAINERS.has(typ)){
        // meta is a FullBox: its first four body bytes are version/flags, not a child atom.
        // Some MP4s also place opaque vendor/XMP payloads inside udta/meta/ilst/dinf.
        // Preserve those bodies byte-for-byte instead of failing the whole file parse.
        const optionalOpaque = new Set(['udta','meta','ilst','dinf']);
        const prefix = typ==='meta' ? buf.slice(bodyStart,Math.min(bodyStart+4,bodyEnd)) : new Uint8Array(0);
        const childStart = typ==='meta' ? Math.min(bodyStart+4,bodyEnd) : bodyStart;
        try {
          out.push({name:typ,children:parseBoxes(buf,childStart,bodyEnd),prefix,data:null});
        } catch (err) {
          if(!optionalOpaque.has(typ)) throw err;
          out.push({name:typ,children:[],prefix:new Uint8Array(0),data:buf.slice(bodyStart,bodyEnd),opaque:true});
        }
      } else out.push({name:typ,children:[],data:buf.slice(bodyStart,bodyEnd)});
      pos+=size;
    }
    if(pos!==end) throw new ReHineError('Ada sisa byte yang tidak membentuk atom MP4 valid.');
    return out;
  }
  function dumpBoxes(boxes){
    const parts=[];
    for(const b of boxes){
      const body=b.data===null ? concat(b.prefix||new Uint8Array(0),dumpBoxes(b.children||[])) : b.data;
      const size=8+body.length;
      if(size>0xffffffff) throw new ReHineError('Atom melebihi batas ukuran 32-bit.');
      parts.push(p32(size),typeBytes(b.name),body);
    }
    return concat(...parts);
  }
  function mapBoxesAt(boxes,name,fn){const out=[];for(const b of boxes){if(b.name===name){const r=fn(b);if(r!==null&&r!==undefined)out.push(r);}else out.push(b);}return out;}
  function findPath(boxes,path){if(!path.length)return boxes;const out=[];for(const b of boxes)if(b.name===path[0]){if(path.length===1)out.push(b);else out.push(...findPath(b.children||[],path.slice(1)));}return out;}
  function findOne(boxes,path){const r=findPath(boxes,path);if(!r.length)throw new ReHineError(`Path '${path.join('/')}' tidak ditemukan.`);return r[0];}
  function replacePath(box,path,replacement){if(!path.length)return replacement;return {...box,children:(box.children||[]).map(c=>c.name===path[0]?replacePath(c,path.slice(1),replacement):c)};}
  function isSoundTrack(trak){const h=findPath(trak.children||[],['mdia','hdlr']);return !!(h.length&&h[0].data&&h[0].data.length>=12&&String.fromCharCode(...h[0].data.subarray(8,12))==='soun');}
  function stripEdts(boxes){return boxes.filter(b=>b.name!=='edts').map(b=>b.data===null?{...b,children:stripEdts(b.children||[])}:b);}
  function getTrackId(tkhd){return u32(tkhd,tkhd[0]===1?20:12);}
  function withTrackId(tkhd,id){const o=tkhd[0]===1?20:12;return concat(tkhd.slice(0,o),p32(id),tkhd.slice(o+4));}
  function getNextTrackId(mvhd){return u32(mvhd,mvhd[0]===1?108:96);}
  function withNextTrackId(mvhd,id){const o=mvhd[0]===1?108:96;return concat(mvhd.slice(0,o),p32(id),mvhd.slice(o+4));}
  function poisonedDuration(mvhd){
    if(mvhd[0]===1){if(mvhd.length<112)throw new ReHineError('mvhd v1 rusak.');return concat(mvhd.slice(0,24),new Uint8Array(8).fill(255),mvhd.slice(32));}
    if(mvhd[0]!==0||mvhd.length<100)throw new ReHineError('mvhd versi tidak didukung.');
    const n=new Uint8Array(mvhd.length+12);n[0]=1;n.set(mvhd.slice(1,4),1);n.set(mvhd.slice(4,8),8);n.set(mvhd.slice(8,12),16);n.set(mvhd.slice(12,16),20);n.fill(255,24,32);n.set(mvhd.slice(20),32);return n;
  }
  function atom(type,body){return concat(p32(8+body.length),typeBytes(type),body);}
  function commentMeta(){
    const h=new Uint8Array(25);h.set(te.encode('mdir'),8);
    const hAtom=atom('hdlr',h), nameAtom=atom('name',MYSTERY_NAME_BYTES);
    const dataAtom=atom('data',concat(new Uint8Array([0,0,0,1,0,0,0,0]),COMMENT_TEXT));
    const cmtAtom=concat(p32(8+dataAtom.length),new Uint8Array([0xa9,0x63,0x6d,0x74]),dataAtom);
    const ilstAtom=atom('ilst',cmtAtom);
    return {name:'meta',children:[],prefix:new Uint8Array(0),data:concat(new Uint8Array([0,0,0,0]),hAtom,nameAtom,ilstAtom)};
  }
  function paddedAudioTrack(trak){
    const stbl=findOne(trak.children,['mdia','minf','stbl']);
    const stsz=findOne(stbl.children,['stsz']), sampleSize=u32(stsz.data,4), count=u32(stsz.data,8);
    if(sampleSize!==0)throw new ReHineError('stsz berukuran tetap tidak didukung.');
    if(!count)throw new ReHineError('Track audio tanpa sampel.');
    const padCount=Math.floor(count*100/PERCENT)-count;
    if(padCount<=0)throw new ReHineError(`Track terlalu pendek untuk PERCENT=${PERCENT}.`);
    if(stsz.data.length<12+count*4)throw new ReHineError('Tabel stsz terpotong.');
    const sizes=[];for(let i=0;i<count;i++)sizes.push(u32(stsz.data,12+i*4));
    const stszData=concat(stsz.data.slice(0,4),p32(0),p32(sizes.length+padCount),...sizes.map(p32),...Array.from({length:padCount},()=>p32(PAD_SAMPLE_SIZE)));
    const stts=findOne(stbl.children,['stts']), sttsCount=u32(stts.data,4);
    const sttsData=concat(stts.data.slice(0,4),p32(sttsCount+1),stts.data.slice(8,8+sttsCount*8),p32(padCount),p32(1));
    const stsc=findOne(stbl.children,['stsc']), stscCount=u32(stsc.data,4), entries=[];
    for(let i=0;i<stscCount;i++)entries.push([u32(stsc.data,8+i*12),u32(stsc.data,12+i*12),u32(stsc.data,16+i*12)]);
    const stcoBoxes=findPath(stbl.children,['stco']), co64Boxes=findPath(stbl.children,['co64']);
    if(!stcoBoxes.length&&!co64Boxes.length)throw new ReHineError('Tidak ada stco/co64.');
    const wide=!!co64Boxes.length, offBox=wide?co64Boxes[0]:stcoBoxes[0], offName=wide?'co64':'stco';
    const chunkCount=u32(offBox.data,4), last=entries.length?entries[entries.length-1][2]:1;
    entries.push([chunkCount+1,padCount,last]);
    const stscParts=[stsc.data.slice(0,4),p32(entries.length)];for(const e of entries)stscParts.push(p32(e[0]),p32(e[1]),p32(e[2]));
    const offsets=[];for(let i=0;i<chunkCount;i++)offsets.push(wide?u64(offBox.data,8+i*8):u32(offBox.data,8+i*4));offsets.push(0);
    const offsetParts=[offBox.data.slice(0,4),p32(offsets.length)];for(const o of offsets)offsetParts.push(wide?p64(o):p32(o));
    let kids=mapBoxesAt(stbl.children,'stsz',()=>({name:'stsz',children:[],data:stszData}));
    kids=mapBoxesAt(kids,'stts',()=>({name:'stts',children:[],data:sttsData}));
    kids=mapBoxesAt(kids,'stsc',()=>({name:'stsc',children:[],data:concat(...stscParts)}));
    kids=mapBoxesAt(kids,offName,()=>({name:offName,children:[],data:concat(...offsetParts)}));
    return {track:replacePath(trak,['mdia','minf','stbl'],{...stbl,children:kids}),padCount};
  }
  function finalizeChunkOffsets(moov,shift,paddedTrackId,paddingOffset){
    function fix(box){
      if(box.name!=='trak')return box;
      const tkhd=findOne(box.children,['tkhd']), padded=getTrackId(tkhd.data)===paddedTrackId;
      const stbl=findOne(box.children,['mdia','minf','stbl']),wide=!!findPath(stbl.children,['co64']).length,name=wide?'co64':'stco',off=findOne(stbl.children,[name]);
      const count=u32(off.data,4), offsets=[];
      for(let i=0;i<count;i++){const o=wide?u64(off.data,8+i*8):u32(off.data,8+i*4);offsets.push(padded&&i===count-1&&o===0?paddingOffset:o+shift);}
      const parts=[off.data.slice(0,4),p32(offsets.length)];for(const o of offsets)parts.push(wide?p64(o):p32(o));
      const newOff={name,children:[],data:concat(...parts)};
      const newStbl={...stbl,children:mapBoxesAt(stbl.children,name,()=>newOff)};
      return replacePath(box,['mdia','minf','stbl'],newStbl);
    }
    return moov.map(fix);
  }
  function parseTop(buf){
    const top=[];let pos=0;
    const likely=new Set(['ftyp','styp','moov','mdat','free','skip','wide','uuid','meta','moof','mfra','sidx','pdin','prft','emsg','idat','ssix','mvex']);
    function readAt(o){
      if(o+8>buf.length)return null;
      const s=u32(buf,o),name=fourcc(buf,o);let size=s;
      if(s===1){if(o+16>buf.length)return null;try{size=u64(buf,o+8);}catch(_){return null;}}
      else if(s===0)size=buf.length-o;
      if(size<8||o+size>buf.length)return null;
      return {name,offset:o,size};
    }
    while(pos+8<=buf.length){
      const box=readAt(pos);
      if(box){top.push(box);pos+=box.size;continue;}
      // Recovery for malformed padding/vendor bytes: find the next plausible top-level box.
      // Keep the skipped bytes as an opaque raw segment so the source bytes are not discarded.
      let next=-1;
      for(let scan=pos+1;scan+8<=buf.length;scan++){
        const name=fourcc(buf,scan);
        if(!likely.has(name))continue;
        const candidate=readAt(scan);
        if(candidate&&likely.has(candidate.name)){next=scan;break;}
      }
      if(next<0){top.push({name:'__raw',offset:pos,size:buf.length-pos,raw:true});pos=buf.length;break;}
      top.push({name:'__raw',offset:pos,size:next-pos,raw:true});pos=next;
    }
    if(pos<buf.length)top.push({name:'__raw',offset:pos,size:buf.length-pos,raw:true});
    return top;
  }
  async function hasAudio(input){
    const buf=new Uint8Array(await input.arrayBuffer());
    const top=parseTop(buf), moovE=top.find(t=>t.name==='moov');
    if(!moovE) return false;
    const moov=parseBoxes(buf,moovE.offset+8,moovE.offset+moovE.size);
    return findPath(moov,['trak']).some(isSoundTrack);
  }
  async function process(input, options={}){
    const buf=new Uint8Array(await input.arrayBuffer()), length=buf.length;
    if(length<16)throw new ReHineError('File terlalu kecil untuk MP4 valid.');
    const top=parseTop(buf), moovE=top.find(t=>t.name==='moov'), mdatE=top.find(t=>t.name==='mdat');
    if(!moovE||!mdatE)throw new ReHineError("Box 'moov'/'mdat' tidak ada.");
    const unionStart=Math.min(moovE.offset,mdatE.offset),unionEnd=Math.max(moovE.offset+moovE.size,mdatE.offset+mdatE.size);
    const head=[],middle=[],tail=[];for(const t of top){if(t.name==='moov'||t.name==='mdat')continue;const bytes=buf.slice(t.offset,t.offset+t.size);if(t.offset<unionStart)head.push(bytes);else if(t.offset>=unionEnd)tail.push(bytes);else middle.push(bytes);}
    let moov=parseBoxes(buf,moovE.offset+8,moovE.offset+moovE.size);if(!moov.length)throw new ReHineError("'moov' kosong/gagal parse.");
    let cleanClone=null;for(const trak of findPath(moov,['trak']))if(isSoundTrack(trak)){cleanClone=trak;break;}if(!cleanClone)throw new ReHineError('Tidak ada track audio sumber.');
    let mvhd=findOne(moov,['mvhd']);if(options.poisonMvhd){mvhd={...mvhd,data:poisonedDuration(mvhd.data)};moov=mapBoxesAt(moov,'mvhd',()=>mvhd);}
    moov=stripEdts(moov);
    if(options.skipAudio){
      const meta=commentMeta();
      const hasUdta=findPath(moov,['udta']).length>0;
      if(hasUdta)moov=mapBoxesAt(moov,'udta',u=>u.data!==null
        ? ({name:'udta',children:[meta],prefix:u.data,prefixRaw:true,data:null})
        : ({...u,children:[...(u.children||[]),meta]}));
      else moov.push({name:'udta',children:[meta],prefix:new Uint8Array(0),data:null});
      const pass1=dumpBoxes(moov),moovSize=8+pass1.length,mdatBytes=buf.slice(mdatE.offset,mdatE.offset+mdatE.size);
      const headBytes=concat(...head),tailBytes=concat(...tail),newMdatStart=headBytes.length+moovSize,shift=newMdatStart-mdatE.offset;
      const finalMoov=finalizeChunkOffsets(moov,shift,-1,-1),finalBody=dumpBoxes(finalMoov);
      if(finalBody.length!==pass1.length)throw new ReHineError('Ukuran moov berubah saat finalisasi offset.');
      const moovAtom=concat(p32(8+finalBody.length),typeBytes('moov'),finalBody);
      const middleBytes=concat(...middle),result=concat(headBytes,moovAtom,mdatBytes,middleBytes,tailBytes);
      return {blob:new Blob([result],{type:'video/mp4'}),originalCount:0,paddingCount:0,newId:null,size:result.length,warning:'Mode tanpa manipulasi audio aktif.',top:top.map(t=>t.name)};
    }
    const traks=findPath(moov,['trak']);let audioIdx=traks.findIndex(isSoundTrack);if(audioIdx<0)throw new ReHineError("Track 'soun' tidak ditemukan.");
    let audioTrak=traks[audioIdx];const ids=traks.map(t=>getTrackId(findOne(t.children,['tkhd']).data));const next=getNextTrackId(mvhd.data);const newId=Math.max(...ids,next-1)+1;
    const oldTkhd=findOne(audioTrak.children,['tkhd']),newTkhd={name:'tkhd',children:[],data:withTrackId(oldTkhd.data,newId)};
    audioTrak={...audioTrak,children:mapBoxesAt(audioTrak.children,'tkhd',()=>newTkhd)};
    mvhd={...mvhd,data:withNextTrackId(mvhd.data,newId+1)};moov=mapBoxesAt(moov,'mvhd',()=>mvhd);
    const padded=paddedAudioTrack(audioTrak);audioTrak=padded.track;
    const newMoov=[];let seen=0;for(const b of moov){if(b.name==='trak'){if(seen===audioIdx){newMoov.push(cleanClone,audioTrak);}else newMoov.push(b);seen++;}else newMoov.push(b);}moov=newMoov;
    const hasUdta=findPath(moov,['udta']).length>0, meta=commentMeta();
    if(hasUdta)moov=mapBoxesAt(moov,'udta',u=>u.data!==null
      ? ({name:'udta',children:[meta],prefix:u.data,prefixRaw:true,data:null})
      : ({...u,children:[...(u.children||[]),meta]}));
    else moov.push({name:'udta',children:[meta],prefix:new Uint8Array(0),data:null});
    const pass1=dumpBoxes(moov),moovSize=8+pass1.length,mdatBytes=buf.slice(mdatE.offset,mdatE.offset+mdatE.size);
    const finalAudioStsz=findOne(audioTrak.children,['mdia','minf','stbl','stsz']),cleanStsz=findOne(cleanClone.children,['mdia','minf','stbl','stsz']);
    const originalCount=u32(cleanStsz.data,8),totalCount=u32(finalAudioStsz.data,8),paddingCount=totalCount-originalCount,paddingBytes=new Uint8Array(PAD_SAMPLE_SIZE*paddingCount);
    for(let i=0;i<paddingCount;i++)paddingBytes.set(PAD_SAMPLE_BYTES,i*PAD_SAMPLE_SIZE);
    const headBytes=concat(...head),tailBytes=concat(...tail),newMdatStart=headBytes.length+moovSize,shift=newMdatStart-mdatE.offset,paddingChunkOffset=newMdatStart+mdatBytes.length;
    const finalMoov=finalizeChunkOffsets(moov,shift,newId,paddingChunkOffset),finalBody=dumpBoxes(finalMoov);
    if(finalBody.length!==pass1.length)throw new ReHineError('Ukuran moov berubah saat finalisasi offset.');
    const moovAtom=concat(p32(8+finalBody.length),typeBytes('moov'),finalBody);
    const middleBytes=concat(...middle),result=concat(headBytes,moovAtom,mdatBytes,paddingBytes,middleBytes,tailBytes);
    return {blob:new Blob([result],{type:'video/mp4'}),originalCount,paddingCount,newId,size:result.length,warning:options.poisonMvhd?'mvhd duration diubah ke nilai maksimum; beberapa pemutar dapat gagal.':'',top:top.map(t=>t.name)};
  }
  window.ReHineEngine={process,hasAudio,ReHineError};
})();
