// ==UserScript==
// @name         Greenline Script Loader
// @author       Rashad Adel
// @namespace    http://tampermonkey.net/
// @version      1.3.6
// @description  Loads scripts from GitHub based on current URL
// @icon         https://scontent.fcai19-6.fna.fbcdn.net/v/t39.30808-6/327165164_685846989996055_4420915704404091060_n.jpg?_nc_cat=105&ccb=1-7&_nc_sid=6ee11a&_nc_ohc=LG8yvWAdkp0Q7kNvwEH_c8t&_nc_oc=AdolowdYmy3fX0lA-2IGpknhjUV8dSUc2KCRZCRz6rFdDM8da8SX6rN3QzPD-r_r_B0&_nc_zt=23&_nc_ht=scontent.fcai19-6.fna&_nc_gid=pt2kgmMNlz59yFmO_cum7A&_nc_ss=7b2a8&oh=00_Af5c5RzFKCmqGIr3txXrGs9yb4wL13kGpdm5IxP__umwwA&oe=6A1A7AE9
// @match        *://*/*
// @grant        GM_xmlhttpRequest
// @connect      raw.githubusercontent.com
// @updateURL    https://raw.githubusercontent.com/rashadAdel/tampermonkey-scripts/main/loader.user.js
// @downloadURL  https://raw.githubusercontent.com/rashadAdel/tampermonkey-scripts/main/loader.user.js
// ==/UserScript==

// loader install link
// https://raw.githubusercontent.com/rashadAdel/tampermonkey-scripts/main/loader.user.js
// https://github.com/rashadAdel/tampermonkey-scripts/blob/main/loader.user.js

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
