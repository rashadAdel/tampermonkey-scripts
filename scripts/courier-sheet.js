(function () {
  "use strict";

  function attachEnterListener() {
    const input = document.getElementById("orderId");
    if (!input || input.dataset.tmAttached) return;

    input.dataset.tmAttached = "true";

    input.addEventListener("keydown", function (e) {
      if (e.key === "Enter") {
        e.preventDefault();
        findOrders();
      }
    });
  }

  function disableTableSorting() {
    if (typeof window.jQuery === "undefined" || !jQuery.fn.DataTable) {
      return false;
    }

    const tableElement = document.getElementById("orders-list");
    if (!tableElement) return false;

    // Wait until DataTable is initialized
    if (!jQuery.fn.DataTable.isDataTable("#orders-list")) {
      return false;
    }

    const table = jQuery("#orders-list").DataTable();

    // Disable sorting feature
    table.settings()[0].oFeatures.bSort = false;

    // Remove active ordering
    table.order([]);

    // Redraw without sorting
    table.draw(false);

    console.log("Sorting disabled");

    return true;
  }

  function init() {
    attachEnterListener();
    disableTableSorting();
  }

  const observer = new MutationObserver(() => {
    init();
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });

  init();
})();
