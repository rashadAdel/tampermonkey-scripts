// ==UserScript==
// @name         Greenline Script Loader
// @author       Rashad Adel
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Loads scripts from GitHub based on current URL
// @icon         https://system.greenlineco.com/app-assets/images/logo/GreenLineLogo.png
// @match        *://*/*
// @grant        GM_xmlhttpRequest
// @connect      raw.githubusercontent.com
// ==/UserScript==

(function () {
  "use strict";

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
              eval(r.responseText);
            },
          });
        }
      });
    },
  });
})();
