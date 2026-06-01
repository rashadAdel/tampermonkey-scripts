(function () {
  "use strict";

  // 1. اعتراض طلبات الـ Fetch لتعديل الـ page_size تلقائياً في الخلفية
  const originalFetch = window.fetch;
  window.fetch = async function (...args) {
    let url = args[0];
    if (typeof url === "string" && url.includes("page_size=")) {
      // هنا يمكنك تحديد القيمة التي تريد إرسالها للسيرفر (مثلاً 500)
      url = url.replace(/page_size=\d+/, "page_size=500");
      args[0] = url;
    }
    return originalFetch.apply(this, args);
  };

  // 2. تحديث الواجهة الرسومية (UI) لتظهر القيمة الجديدة للمستخدم
  function updateUI() {
    const selectPagination = document.getElementById("mui-76008");
    if (selectPagination && selectPagination.textContent !== "500") {
      selectPagination.textContent = "500";
    }
  }

  // مراقبة التغييرات في الصفحة لتحديث الواجهة فور ظهور المكون
  const observer = new MutationObserver(() => {
    updateUI();
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });
})();
