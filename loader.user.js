// ==UserScript==
// @name         Greenline Script Loader
// @author       Rashad Adel
// @namespace    http://tampermonkey.net/
// @version      2.1.6
// @description  Loads scripts from GitHub and provides a privileged CORS proxy bridge
// @match        *://*/*
// @grant        GM_xmlhttpRequest
// @connect      raw.githubusercontent.com
// @connect      openapi.jtjms-eg.com
// @connect      script.google.com
// @updateURL    https://raw.githubusercontent.com/rashadAdel/tampermonkey-scripts/main/loader.user.js
// @downloadURL  https://raw.githubusercontent.com/rashadAdel/tampermonkey-scripts/main/loader.user.js
// ==/UserScript==

(function () {
  window.selectedOrders = window.selectedOrders || [];

  // إعداد جسر الاتصال الآمن لتخطي CORS من داخل الصفحة
  const pendingRequests = new Map();
  let requestId = 0;

  // تعريف الدالة على مستوى window لتبدو مطابقة تماماً للدالة الأصلية للسكريبتات الفرعية
  window.GM_xmlhttpRequest = function (details) {
    const id = requestId++;
    pendingRequests.set(id, details);

    // إرسال تفاصيل الطلب إلى سياق السكريبت الرئيسي المميز
    window.postMessage(
      {
        type: "GM_BRIDGE_REQUEST",
        id: id,
        details: {
          method: details.method,
          url: details.url,
          headers: details.headers,
          data: details.data,
        },
      },
      "*",
    );
  };

  // الاستماع للرسائل المتبادلة بين السياقين
  window.addEventListener("message", function (event) {
    // 1. استقبال الطلب في السياق المميز وتنفيذه برمجياً بدون قيود المتصفح
    if (event.data && event.data.type === "GM_BRIDGE_REQUEST") {
      const { id, details } = event.data;
      GM_xmlhttpRequest({
        ...details,
        onload: function (res) {
          window.postMessage(
            {
              type: "GM_BRIDGE_RESPONSE",
              id: id,
              success: true,
              response: { status: res.status, responseText: res.responseText },
            },
            "*",
          );
        },
        onerror: function (err) {
          window.postMessage(
            {
              type: "GM_BRIDGE_RESPONSE",
              id: id,
              success: false,
              error: err,
            },
            "*",
          );
        },
      });
    }

    // 2. استقبال النتيجة داخل الصفحة وتوجيهها للـ Callbacks الصحيحة
    if (event.data && event.data.type === "GM_BRIDGE_RESPONSE") {
      const { id, success, response, error } = event.data;
      const details = pendingRequests.get(id);
      if (details) {
        pendingRequests.delete(id);
        if (success && details.onload) {
          details.onload(response);
        } else if (!success && details.onerror) {
          details.onerror(error);
        }
      }
    }
  });

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
              const script = document.createElement("script");
              script.textContent = r.responseText;
              document.head.appendChild(script);
            },
          });
        }
      });
    },
  });
})();
