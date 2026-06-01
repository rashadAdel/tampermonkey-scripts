(function () {
  "use strict";

  const CUSTOM_PAGE_SIZE = 500;
  window.CUSTOM_PAGE_SIZE = CUSTOM_PAGE_SIZE;

  // دالة المعالجة الكاملة اللي الـ Loader هيستخدمها فوراً
  window.QP_XPRESS_BYPASS = async function (...args) {
    let url = args[0];

    if (typeof url === "string" && url.includes("page_size=")) {
      url = url.replace(/page_size=\d+/, `page_size=${CUSTOM_PAGE_SIZE}`);
      if (url.includes("page=")) {
        url = url.replace(/page=\d+/, "page=1");
      }
      args[0] = url;
    }

    // استخدام الـ fetch الأصلي المحفوظ
    const orig = window.originalFetch || originalFetch;
    const response = await orig.apply(this, args);

    if (
      typeof url === "string" &&
      url.includes("api.qpxpress.com/addorders/order/")
    ) {
      const clone = response.clone();
      try {
        let data = await clone.json();

        if (data) {
          if (data.hasOwnProperty("page_size"))
            data.page_size = CUSTOM_PAGE_SIZE;
          if (data.hasOwnProperty("limit")) data.limit = CUSTOM_PAGE_SIZE;
          if (data.hasOwnProperty("page")) data.page = 1;
          if (data.hasOwnProperty("current_page")) data.current_page = 1;

          let itemsArray =
            data.results ||
            data.data ||
            data.orders ||
            (Array.isArray(data) ? data : null);

          if (itemsArray && Array.isArray(itemsArray)) {
            const actualCount = itemsArray.length;
            if (data.hasOwnProperty("count")) data.count = actualCount;
            if (data.hasOwnProperty("total")) data.total = actualCount;
            if (data.hasOwnProperty("total_count"))
              data.total_count = actualCount;
          }
        }

        return new Response(JSON.stringify(data), {
          status: response.status,
          statusText: response.statusText,
          headers: response.headers,
        });
      } catch (e) {
        return response;
      }
    }

    return response;
  };

  // ربط الدالة بالـ window.fetch الفعلي لتغطية أي طلبات لاحقة
  window.fetch = window.QP_XPRESS_BYPASS;

  // 2. تصحيح نصوص الـ UI كدعم احتياطي
  function fixPaginationUI() {
    const selectPagination = document.querySelector(
      ".MuiTablePagination-select",
    );
    if (
      selectPagination &&
      selectPagination.textContent !== String(CUSTOM_PAGE_SIZE)
    ) {
      selectPagination.textContent = String(CUSTOM_PAGE_SIZE);
    }
  }

  const observer = new MutationObserver(() => {
    fixPaginationUI();
  });

  if (document.body) {
    observer.observe(document.body, { childList: true, subtree: true });
  } else {
    document.addEventListener("DOMContentLoaded", () => {
      observer.observe(document.body, { childList: true, subtree: true });
    });
  }
})();
