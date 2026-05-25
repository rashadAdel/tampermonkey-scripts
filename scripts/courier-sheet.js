(function () {
  "use strict";

  // ── Fix 1: Override DataTable لإلغاء الـ sorting ──
  const _addEventListener = EventTarget.prototype.addEventListener;
  window.addEventListener("load", function () {
    const origDataTable = $.fn.dataTable;
    if (typeof $.fn.DataTable === "function") {
      const orig = $.fn.DataTable;
      $.fn.DataTable = function (options) {
        if (options && options.order !== undefined) {
          options.order = [];
        }
        if (options && options.aaSorting !== undefined) {
          options.aaSorting = [];
        }
        return orig.call(this, options);
      };
      $.fn.dataTable = $.fn.DataTable;
    }
  });

  // ── Fix 2: Enter key على orderId ──
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
})();
