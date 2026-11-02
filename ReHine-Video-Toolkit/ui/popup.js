document.querySelector('#engine').onclick=()=>chrome.tabs.create({url:chrome.runtime.getURL('engine/engine.html')});
document.querySelector('#analyzer').onclick=()=>chrome.tabs.create({url:chrome.runtime.getURL('analyzer/analyzer.html')});
document.querySelector('#studio').onclick=()=>chrome.tabs.create({url:'https://www.tiktok.com/tiktokstudio/upload?from=creator_center&tab=video'});
document.querySelector('#wa').onclick=()=>chrome.tabs.create({url:'https://web.whatsapp.com'});
