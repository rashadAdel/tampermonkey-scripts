(function () {
  "use strict";

  function initMultiSearch() {
    const oldInput = document.querySelector("#Order\\#");

    if (!oldInput || oldInput.dataset.multilineApplied) return;

    // Prevent duplicate initialization
    oldInput.dataset.multilineApplied = "true";

    // Create textarea
    const textarea = document.createElement("textarea");

    textarea.id = oldInput.id;
    textarea.name = oldInput.name;
    textarea.className = oldInput.className;
    textarea.placeholder = "Order Ids (one per line)";
    textarea.rows = 6;

    // Copy styles
    textarea.style.resize = "vertical";
    textarea.style.minHeight = "120px";

    // Replace input with textarea
    oldInput.parentNode.replaceChild(textarea, oldInput);

    // Get datatable instance
    const waitForTable = setInterval(() => {
      if (!window.jQuery) return;

      const $ = window.jQuery;

      if (!$.fn.DataTable) return;

      const table = $("#orders-list").DataTable();

      if (!table) return;

      clearInterval(waitForTable);

      // Multiline search
      $(textarea).on("input", function () {
        // Split by new lines
        const values = this.value
          .split("\n")
          .map((v) => v.trim())
          .filter((v) => v.length > 0);

        // Clear search if empty
        if (!values.length) {
          table.column(1).search("").draw();
          return;
        }

        // Escape regex special chars
        const escaped = values.map((v) =>
          v.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
        );

        // Create regex OR pattern
        const regex = escaped.join("|");

        // Search in Order ID column
        table.column(1).search(regex, true, false).draw();
      });
    }, 500);
  }

  // Wait for page load
  window.addEventListener("load", () => {
    initMultiSearch();

    // Re-check because some pages load dynamically
    setInterval(initMultiSearch, 2000);
  });
})();
