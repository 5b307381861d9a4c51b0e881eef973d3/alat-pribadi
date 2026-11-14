// RE:HINE - Desktop mode (network layer).
// Dipakai oleh background.js dan popup.js. Di PC (UA desktop) tidak melakukan apa-apa;
// di browser HP (Kiwi, Quetta, Lemur, dll) header User-Agent ke tiktok.com diganti ke desktop
// supaya server TikTok mengirim layout TikTok Studio versi desktop.
(function (g) {
  'use strict';
  const RULE_ID = 9001;

  function isMobile() {
    return /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent || '');
  }
  function chromeMajor() {
    const m = (navigator.userAgent || '').match(/Chrome\/(\d+)/);
    return m ? m[1] : '130';
  }
  function buildRule(withHints) {
    const major = chromeMajor();
    const ua = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/' + major + '.0.0.0 Safari/537.36';
    const headers = [{ header: 'user-agent', operation: 'set', value: ua }];
    if (withHints) {
      headers.push({ header: 'sec-ch-ua-mobile', operation: 'set', value: '?0' });
      headers.push({ header: 'sec-ch-ua-platform', operation: 'set', value: '"Windows"' });
    }
    return {
      id: RULE_ID,
      priority: 1,
      action: { type: 'modifyHeaders', requestHeaders: headers },
      condition: {
        requestDomains: ['tiktok.com'],
        resourceTypes: ['main_frame', 'sub_frame', 'xmlhttprequest', 'script', 'stylesheet', 'other']
      }
    };
  }

  async function ensure() {
    const dnr = g.chrome && chrome.declarativeNetRequest;
    if (!dnr || !dnr.updateDynamicRules) return false;
    try {
      if (!isMobile()) {
        await dnr.updateDynamicRules({ removeRuleIds: [RULE_ID] });
        return false;
      }
      try {
        await dnr.updateDynamicRules({ removeRuleIds: [RULE_ID], addRules: [buildRule(true)] });
      } catch (e) {
        // sebagian browser menolak header sec-ch-ua-*, pakai User-Agent saja
        await dnr.updateDynamicRules({ removeRuleIds: [RULE_ID], addRules: [buildRule(false)] });
      }
      return true;
    } catch (e) {
      console.warn('[RE:HINE] desktop rule gagal:', e);
      return false;
    }
  }

  g.RehineDesktop = { ensure, isMobile };
})(typeof self !== 'undefined' ? self : this);
