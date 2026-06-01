(function () {
  "use strict";

  const CUSTOM_PAGE_SIZE = 500;

  // 1. اعتراض وتعديل الـ Request والـ Response
  const originalFetch = window.fetch;
  window.fetch = async function (...args) {
    let url = args[0];

    // تعديل الرابط المرسل للسيرفر لطلب 500 عنصر، والبدء من الصفحة الأولى دائمًا عند التغيير
    if (typeof url === "string" && url.includes("page_size=")) {
      url = url.replace(/page_size=\d+/, `page_size=${CUSTOM_PAGE_SIZE}`);
      // إجبار الطلب المفتوح على البدء من الصفحة 1 لتجنب الأرقام الغريبة مثل (10-166)
      if (url.includes("page=")) {
        url = url.replace(/page=\d+/, "page=1");
      }
      args[0] = url;
    }

    const response = await originalFetch.apply(this, args);

    // تعديل الـ Response القادم من السيرفر لتصحيح الـ UI الخاص بـ React
    if (
      typeof url === "string" &&
      url.includes("api.qpxpress.com/addorders/order/")
    ) {
      const clone = response.clone();
      try {
        let data = await clone.json();

        // فحص بنية البيانات وتعديل العدادات لتتوافق مع الـ 500 عنصر
        if (data) {
          // تعديل حجم الصفحة الافتراضي في الـ response
          if (data.hasOwnProperty("page_size"))
            data.page_size = CUSTOM_PAGE_SIZE;
          if (data.hasOwnProperty("limit")) data.limit = CUSTOM_PAGE_SIZE;

          // إجبار المكون على معرفة أنه في الصفحة الأولى
          if (data.hasOwnProperty("page")) data.page = 1;
          if (data.hasOwnProperty("current_page")) data.current_page = 1;

          // تحديد عدد العناصر الإجمالي بناءً على المصفوفة المرتجعة (تلقائياً)
          // يبحث السكريبت عن مصفوفة البيانات (سواء اسمها results أو data أو orders)
          let itemsArray =
            data.results ||
            data.data ||
            data.orders ||
            (Array.isArray(data) ? data : null);

          if (itemsArray && Array.isArray(itemsArray)) {
            const actualCount = itemsArray.length;
            // تعديل الإجمالي ليكون مساوياً للعدد الفعلي المرتجع
            if (data.hasOwnProperty("count")) data.count = actualCount;
            if (data.hasOwnProperty("total")) data.total = actualCount;
            if (data.hasOwnProperty("total_count"))
              data.total_count = actualCount;
          }
        }

        // إعادة بناء الاستجابة بالبيانات المعدلة بالكامل
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

  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });
})();
