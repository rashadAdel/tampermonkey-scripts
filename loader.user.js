// ==UserScript==
// @name         Greenline Script Loader
// @author       Rashad Adel
// @namespace    http://tampermonkey.net/
// @version      3.0.1
// @description  Loads scripts from GitHub based on current URL
// @icon         https://scontent.fcai19-6.fna.fbcdn.net/v/t39.30808-6/327165164_685846989996055_4420915704404091060_n.jpg
// @match        *://*/*
// @grant        GM_xmlhttpRequest
// @grant        unsafeWindow
// @connect      raw.githubusercontent.com
// @connect      openapi.jtjms-eg.com
// @connect      script.google.com
// @connect      api.qpxpress.com
// @connect      cdnjs.cloudflare.com
// @connect      cdn.jsdelivr.net
// @updateURL    https://raw.githubusercontent.com/rashadAdel/tampermonkey-scripts/main/loader.user.js
// @downloadURL  https://raw.githubusercontent.com/rashadAdel/tampermonkey-scripts/main/loader.user.js
// ==/UserScript==

(function () {
  "use strict";

  window.selectedOrders = window.selectedOrders || [];

  const CONFIG_URL =
    "https://raw.githubusercontent.com/rashadAdel/tampermonkey-scripts/main/config.json";

  function matchesPattern(pattern, url) {
    const regex = new RegExp("^" + pattern.replace(/\*/g, ".*") + "$");
    return regex.test(url);
  }

  GM_xmlhttpRequest({
    method: "GET",
    url: CONFIG_URL,
    onload: function (res) {
      const configs = JSON.parse(res.responseText);
      const currentURL = window.location.href;

      configs.forEach((cfg) => {
        if (matchesPattern(cfg.match, currentURL)) {
          GM_xmlhttpRequest({
            method: "GET",
            url: cfg.script,
            onload: function (r) {
              // ✅ الحل: استخدام eval في نفس السياق (Tampermonkey sandbox)
              // بدلاً من document.createElement("script") اللي بيحطه في سياق الصفحة
              try {
                eval(r.responseText);
                console.log(
                  "✅ Script loaded successfully via eval:",
                  cfg.script,
                );
              } catch (e) {
                console.error("❌ Error eval script:", e);
                // Fallback: لو eval فشل، نحاول الطريقة القديمة
                const script = document.createElement("script");
                script.textContent = r.responseText;
                document.head.appendChild(script);
              }
            },
          });
        }
      });
    },
  });
})();
