(function () {
  "use strict";

  // ── Fix 1: Enter key على orderId ──
  function attachEnterListener() {
    const input = document.getElementById("orderId");
    if (!input || input._enterAttached) return;
    input._enterAttached = true;
    input.addEventListener("keydown", function (e) {
      if (e.key === "Enter") {
        e.preventDefault();
        findOrders();
      }
    });
  }

  // ── Fix 2: Override findOrders لإلغاء الـ sorting قبل كل إضافة ──
  window.addEventListener("load", function () {
    // ننتظر الـ DataTable يتعمل
    const checkTable = setInterval(() => {
      if (
        typeof findOrders === "function" &&
        $.fn.DataTable.isDataTable("#orders-list")
      ) {
        clearInterval(checkTable);

        // نحفظ الـ function الأصلية
        const _originalFindOrders = window.findOrders;

        // نعمل override
        window.findOrders = function () {
          // نوقف الـ sorting مؤقتاً
          var table = $("#orders-list").DataTable();
          table.order([]);
          // نشغل الأصلية
          _originalFindOrders();
        };

        // نطبق كمان على الجدول الحالي
        $("#orders-list").DataTable().order([]).draw();
      }
    }, 300);

    // ── Enter listener ──
    const observer = new MutationObserver(() => {
      if (document.getElementById("orderId")) {
        attachEnterListener();
        observer.disconnect();
      }
    });

    if (document.getElementById("orderId")) {
      attachEnterListener();
    } else {
      observer.observe(document.body, { childList: true, subtree: true });
    }
  });
})();
