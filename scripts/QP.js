(function () {
  "use strict";

  console.log("[QPXpress Script] Loaded via Loader...");

  // 1. اعتراض الـ Fetch وتعديله (حتى لو تم الحقن متأخراً، سيعترض الطلبات التالية)
  if (!window.fetch.isIntercepted) {
    const originalFetch = window.fetch;
    window.fetch = async function (...args) {
      let url = args[0];
      if (typeof url === "string" && url.includes("page_size=")) {
        // استبدال أي قيمة لـ page_size بالقيمة 500
        url = url.replace(/page_size=\d+/, "page_size=500");
        args[0] = url;
        console.log("[QPXpress Script] URL Intercepted & Modified:", url);
      }
      return originalFetch.apply(this, args);
    };
    window.fetch.isIntercepted = true;
  }

  // 2. تحديث الواجهة الرسومية اعتماداً على الـ Class وليس الـ ID الثابت
  function updateUI() {
    // استخدام الـ class الشهير لـ MUI pagination select بدلاً من id متغير
    const selectPagination = document.querySelector(
      ".MuiTablePagination-select",
    );
    if (selectPagination && selectPagination.textContent !== "500") {
      selectPagination.textContent = "500";
    }
  }

  // مراقبة التغييرات في الصفحة لتحديث الواجهة فور ظهور المكون
  const observer = new MutationObserver(() => {
    updateUI();
  });

  if (document.body) {
    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });
  } else {
    window.addEventListener("DOMContentLoaded", () => {
      observer.observe(document.body, {
        childList: true,
        subtree: true,
      });
    });
  }
})();
