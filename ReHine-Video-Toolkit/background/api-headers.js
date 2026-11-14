// RE:HINE - header untuk API statistik (cutefish.my.id).
// Menyamakan Referer/Origin request ekstensi dengan request dari situsnya sendiri.
// Header disamakan dengan request dari situsnya (Chrome 137 Android): referer, user-agent, sec-ch-ua*.
(function (g) {
  'use strict';
  const RULE_ID = 9002;
  const SITE = 'https://cutefish.my.id';

  function buildRule(withOrigin) {
    const headers = [
      { header: 'referer', operation: 'set', value: SITE + '/' },
      { header: 'user-agent', operation: 'set', value: 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Mobile Safari/537.36' },
      { header: 'sec-ch-ua', operation: 'set', value: '"Chromium";v="137", "Not/A)Brand";v="24"' },
      { header: 'sec-ch-ua-mobile', operation: 'set', value: '?1' },
      { header: 'sec-ch-ua-platform', operation: 'set', value: '"Android"' }
    ];
    if (withOrigin) headers.push({ header: 'origin', operation: 'set', value: SITE });
    return {
      id: RULE_ID,
      priority: 1,
      action: { type: 'modifyHeaders', requestHeaders: headers },
      condition: { requestDomains: ['cutefish.my.id'], resourceTypes: ['xmlhttprequest'] }
    };
  }

  async function ensure() {
    const dnr = g.chrome && chrome.declarativeNetRequest;
    if (!dnr || !dnr.updateDynamicRules) return false;
    try {
      try {
        await dnr.updateDynamicRules({ removeRuleIds: [RULE_ID], addRules: [buildRule(true)] });
      } catch (_) {
        await dnr.updateDynamicRules({ removeRuleIds: [RULE_ID], addRules: [buildRule(false)] });
      }
      return true;
    } catch (e) {
      console.warn('[RE:HINE] api header rule gagal:', e);
      return false;
    }
  }

  g.RehineApiHeaders = { ensure };
})(typeof self !== 'undefined' ? self : this);
