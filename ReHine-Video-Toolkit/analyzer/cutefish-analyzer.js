(() => {
  'use strict';
  const fmt = n => Number.isFinite(Number(n)) ? new Intl.NumberFormat('id-ID').format(Number(n)) : 'Tidak tersedia';
  const val = n => n === null || n === undefined || n === '' ? 'Tidak tersedia' : String(n);
  const country = {ID:'Indonesia',MY:'Malaysia',SG:'Singapura',US:'Amerika Serikat',JP:'Jepang',KR:'Korea Selatan',TH:'Thailand',VN:'Vietnam',PH:'Filipina'};
  const css = (el, rules) => Object.assign(el.style,rules);
  function el(tag,text) { const e=document.createElement(tag); if(text!==undefined)e.textContent=text;return e; }
  function addStyles(){
    if(document.getElementById('rehine-fresh-theme')) return;
    const style=el('style');style.id='rehine-fresh-theme';style.textContent=`
      @keyframes rhSpin{to{transform:rotate(360deg)}}
      @keyframes rhPulse{0%,100%{opacity:.45;transform:scaleX(.72)}50%{opacity:1;transform:scaleX(1)}}
      @keyframes rhIn{from{opacity:0;transform:translateY(5px)}to{opacity:1;transform:translateY(0)}}
      .rh-card{background:linear-gradient(145deg,#101827 0%,#111e32 65%,#17243b 100%);border:1px solid #334766!important;border-radius:18px!important;padding:15px!important;box-shadow:0 16px 42px #02061780!important;color:#f1f5f9!important;backdrop-filter:blur(18px)}
      .rh-brand{display:flex;align-items:center;gap:10px;padding-bottom:12px;border-bottom:1px solid #ffffff12;margin-bottom:10px}
      .rh-logo{width:36px;height:36px;display:grid;place-items:center;border-radius:12px;background:linear-gradient(135deg,#2dd4bf,#60a5fa);color:#082f49;font-size:19px;box-shadow:0 5px 18px #2dd4bf35}
      .rh-sub{font-size:10px;color:#94a3b8;margin-top:3px;letter-spacing:.25px}
      .rh-notice{display:flex;align-items:flex-start;gap:8px;border:1px solid #ffffff12;background:#ffffff08;border-radius:11px;padding:10px 11px;font-size:12px;line-height:1.45;color:#cbd5e1;animation:rhIn .18s ease-out}
      .rh-spinner{width:14px;height:14px;flex:0 0 14px;border:2px solid #64748b;border-top-color:#5eead4;border-radius:50%;animation:rhSpin .75s linear infinite;margin-top:1px}
      .rh-progress{height:3px;border-radius:10px;overflow:hidden;background:#25344b;margin-top:9px}
      .rh-progress:after{content:'';display:block;height:100%;width:45%;background:linear-gradient(90deg,#2dd4bf,#60a5fa);border-radius:10px;animation:rhPulse 1.2s ease-in-out infinite}
      .rh-section{margin-top:14px;animation:rhIn .2s ease-out}
      .rh-section-title{display:flex;align-items:center;gap:7px;color:#99f6e4;font-size:10px;font-weight:900;letter-spacing:1.1px;margin-bottom:6px}
      .rh-section-title:before{content:'';width:4px;height:13px;border-radius:5px;background:linear-gradient(#2dd4bf,#60a5fa)}
      .rh-row{display:flex;justify-content:space-between;align-items:flex-start;gap:12px;border-bottom:1px solid #ffffff0d;padding:7px 0;font-size:12px;line-height:1.4}
      .rh-row:last-child{border-bottom:0}.rh-key{color:#9caec4;flex-shrink:0}.rh-value{color:#f8fafc;text-align:right;overflow-wrap:anywhere;font-weight:650}
      .rh-btn{width:100%;border:1px solid #ffffff15;border-radius:11px;padding:11px 12px;font:800 11px system-ui,sans-serif;letter-spacing:.35px;margin-top:9px;cursor:pointer;transition:transform .15s,filter .15s,opacity .15s}
      .rh-btn:active{transform:scale(.985)}.rh-btn:disabled{opacity:.48;cursor:wait}.rh-primary{background:linear-gradient(100deg,#2dd4bf,#5eead4);color:#042f2e;box-shadow:0 6px 18px #2dd4bf20}.rh-secondary{background:#24334b;color:#e2e8f0}
      .rh-foot{font-size:10px;line-height:1.5;color:#8495ad;margin-top:11px}
    `;
    (document.head||document.documentElement).append(style);
  }
  async function getJson(endpoint, url) {
    if (!['tiktok-resolve','tiktok-fps'].includes(endpoint)) throw new Error('Endpoint tidak diizinkan');
    const result = await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('Waktu permintaan habis setelah 45 detik')), 45000);
      try {
        chrome.runtime.sendMessage({type:'REHINE_CUTEFISH_REQUEST', endpoint, url}, response => {
          clearTimeout(timer);
          const lastError = chrome.runtime.lastError;
          if (lastError) return reject(new Error('Jembatan ekstensi gagal: ' + lastError.message));
          if (!response?.ok) return reject(new Error(response?.error || 'Permintaan CuteFish gagal'));
          resolve(response.data);
        });
      } catch (e) { clearTimeout(timer); reject(e); }
    });
    if (!result || typeof result !== 'object' || result.error) throw new Error(result?.error || 'Respons API tidak valid');
    return result;
  }
  function makeReport(d,f,link) {
    const region = String(d.region || '').toUpperCase();
    const date = Number(d.create_time) > 0 ? new Date(Number(d.create_time)*1000).toLocaleString('id-ID',{timeZone:'Asia/Jakarta',day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:false}) + ' WIB' : 'Tidak tersedia';
    const size = Number(d.size), duration = Number(d.duration);
    const mb = size>0 ? (size/1048576).toFixed(2)+' MB' : 'Tidak tersedia';
    const bitrate = size>0 && duration>0 ? (size*8/duration/1e6).toFixed(2)+' Mbps' : 'Tidak tersedia';
    const width = Number(f?.width || d.width || d.w),height=Number(f?.height || d.height || d.h);
    const resolution = width>0 && height>0 ? width+'x'+height : 'Tidak tersedia';
    const fps = Number(f?.fps)>0 ? f.fps+' FPS' : 'Tidak tersedia';
    const counts = ['play_count','digg_count','comment_count','share_count','collect_count'].map(k=>Number(d[k]));
    const engagement = counts.every(Number.isFinite) && counts[0]>0 ? ((counts[1]+counts[2]+counts[3]+counts[4])/counts[0]*100).toFixed(2)+'%' : counts[0]===0 ? '0.00%' : 'Tidak tersedia';
    const groups = [
      ['INFO AKUN',[
        ['Akun',d.author_unique_id?'@'+String(d.author_unique_id).replace(/^@/,''):link.match(/@([^/]+)/)?.[0]||'Tidak tersedia'],
        ['Nama',val(d.author_nickname).includes('�')?'Tidak tersedia':val(d.author_nickname)],
        ['Upload',date],['Region',region?(country[region]||region)+' ('+region+')':'Tidak tersedia'],
        ['Shadowban',d.is_nff_or_nr===false?'Aman':d.is_nff_or_nr===true?'Terindikasi dibatasi (NFF/NR)':'Tidak tersedia']]],
      ['SPESIFIKASI MEDIA',[
        ['Resolusi',resolution],['FPS',fps],['Bitrate',bitrate],
        ['Durasi',duration>0?fmt(duration)+' detik':'Tidak tersedia'],['Ukuran file',mb],...(typeof f?.comment==='string'&&f.comment.trim()?[['Method',f.comment.trim()]]:[])]],
      ['STATISTIK',[
        ['Views',fmt(d.play_count)],['Likes',fmt(d.digg_count)],['Komentar',fmt(d.comment_count)],
        ['Share',fmt(d.share_count)],['Disimpan',fmt(d.collect_count)],['Engagement',engagement]]]
    ];
    return groups;
  }
  function mount(root,getUrl) {
    addStyles();
    root.classList.add('rh-card');
    const brand=el('div');brand.className='rh-brand';
    const logo=el('div','✦');logo.className='rh-logo';
    const brandText=el('div');const title=el('div','ReHine Analyzer');css(title,{fontWeight:'850',fontSize:'15px',letterSpacing:'-.2px'});
    const subtitle=el('div','TIKTOK VIDEO Metadata & Stream Analyser');subtitle.className='rh-sub';brandText.append(title,subtitle);brand.append(logo,brandText);
    const notice=el('div');notice.className='rh-notice';notice.setAttribute('role','status');notice.setAttribute('aria-live','polite');
    const result=el('div');result.style.marginTop='10px';
    const refresh=el('button','↻  ANALISIS VIDEO');refresh.className='rh-btn rh-primary';
    const copy=el('button','▣  SALIN SEMUA INFO');copy.className='rh-btn rh-secondary';
    copy.disabled=true;
    let report='';
    function notify(message,type='info',loading=false){
      notice.replaceChildren();
      const icon=el('span',loading?'':type==='success'?'✓':type==='error'?'!':type==='warn'?'⚠':'i');
      css(icon,{display:'grid',placeItems:'center',width:'19px',height:'19px',flex:'0 0 19px',borderRadius:'7px',fontWeight:'900',fontSize:'11px',background:loading?'transparent':type==='success'?'#064e3b':type==='error'?'#7f1d1d':type==='warn'?'#78350f':'#1e3a5f',color:type==='success'?'#6ee7b7':type==='error'?'#fecaca':type==='warn'?'#fde68a':'#93c5fd'});
      if(loading){const spin=el('span');spin.className='rh-spinner';icon.replaceWith(spin);}
      const body=el('div',message);body.style.flex='1';notice.append(icon,body);
      if(loading){const bar=el('div');bar.className='rh-progress';body.append(bar);}
    }
    notify('Siap. Tekan “Analisis Video” untuk mengambil statistik dan spesifikasi media.');
    async function run(){
      const link=getUrl(); if(!link){notify('URL video TikTok tidak ditemukan pada halaman ini.','error');return;}
      refresh.disabled=true;copy.disabled=true;report='';notify('Menghubungkan ke CuteFish dan mengambil informasi video…','info',true);result.replaceChildren();
      try{
        let d=await getJson('tiktok-resolve',link);
        if (d && typeof d.data === 'object' && d.data) d=d.data;
        if (d && typeof d.result === 'object' && d.result) d=d.result;
        const hasUsefulData=['author_unique_id','author_nickname','play_count','digg_count','duration','size','hdplay','play','wmplay'].some(k=>d[k]!==undefined && d[k]!==null);
        if (!hasUsefulData) throw new Error('API merespons, tetapi struktur metadata tidak dikenali. Perlu penyesuaian parser dengan format respons CuteFish.');
        let f=null, fpsError='';
        const cdn=d.hdplay||d.play||d.wmplay;
        if(cdn){notify('Data akun didapat. Memeriksa resolusi, FPS, dan method…','info',true);try{f=await getJson('tiktok-fps',cdn);}catch(e){fpsError=e.message;}}
        const groups=makeReport(d,f,link);
        result.replaceChildren();
        report=groups.map(([heading,items])=>'[ '+heading+' ]\n\n'+items.map(([k,v])=>k+': '+v).join('\n')).join('\n\n');
        for(const [heading,items] of groups){
          const section=el('section');section.className='rh-section';
          const h=el('div',heading);h.className='rh-section-title';section.append(h);
          for(const [k,v] of items){const line=el('div');line.className='rh-row';const key=el('span',k);key.className='rh-key';const value=el('strong',v);value.className='rh-value';if(k==='Shadowban'){value.style.color=d.is_nff_or_nr===false?'#6ee7b7':d.is_nff_or_nr===true?'#fca5a5':'#cbd5e1';}line.append(key,value);section.append(line);}result.append(section);
        }
        if(fpsError)notify('Statistik utama berhasil. Data FPS/method tidak tersedia: '+fpsError,'warn');
        else notify('Analisis selesai. Semua informasi siap disalin.','success');
        copy.disabled=false;
      }catch(e){notify('Analisis gagal: '+(e?.message||String(e))+' Coba ulangi beberapa saat lagi.','error');}
      finally{refresh.disabled=false;}
    }
    refresh.addEventListener('click',run);
    copy.addEventListener('click',async()=>{
      try{await navigator.clipboard.writeText(report);}catch(e){const input=el('textarea');input.value=report;css(input,{position:'fixed',top:'0',left:'0',opacity:'0'});document.body.append(input);input.select();const ok=document.execCommand('copy');input.remove();if(!ok){notify('Tidak berhasil menyalin. Coba lagi.','error');return;}}
      notify('Berhasil menyalin seluruh info ke clipboard.','success');copy.textContent='✓  BERHASIL DISALIN';setTimeout(()=>copy.textContent='▣  SALIN SEMUA INFO',1800);
    });
    root.append(brand,notice,result,refresh,copy);
  }
  window.ReHineCuteFishAnalyzer={mount};
})();
