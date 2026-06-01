(function () {
  "use strict";

  const CUSTOM_PAGE_SIZE = 500;

  // دالة الاعتراض والتعديل
  async function modifyFetch(...args) {
    let url = args[0];

    // تعديل الـ Request
    if (typeof url === "string" && url.includes("page_size=")) {
      url = url.replace(/page_size=\d+/, `page_size=${CUSTOM_PAGE_SIZE}`);
      if (url.includes("page=")) {
        url = url.replace(/page=\d+/, "page=1");
      }
      args[0] = url;
    }

    // استدعاء الـ fetch الأصلي
    const response = await window.originalFetch.apply(this, args);

    // تعديل الـ Response
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
  }

  // الاحتفاظ بالـ fetch الأصلي بأمان لمنع الـ Infinite Loop
  if (!window.originalFetch) {
    window.originalFetch = window.fetch;
  }

  // تطبيق التعديل فوراً
  window.fetch = modifyFetch;

  // تصحيح نصوص الـ UI كدعم احتياطي
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

  // التأكد من أن الـ body متاح قبل المراقبة
  if (document.body) {
    observer.observe(document.body, { childList: true, subtree: true });
  } else {
    document.addEventListener("DOMContentLoaded", () => {
      observer.observe(document.body, { childList: true, subtree: true });
    });
  }
})();
