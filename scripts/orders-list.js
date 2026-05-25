(function () {
  "use strict";

  function replaceWithTextarea() {
    const input = document.querySelector("input.orderId");
    if (!input || document.getElementById("multiline-orders")) return;

    const textarea = document.createElement("textarea");
    textarea.id = "multiline-orders";
    textarea.className = input.className;
    textarea.placeholder = "Order Id (سطر لكل أوردر)";
    textarea.rows = 4;
    textarea.style.resize = "vertical";
    textarea.style.width = input.offsetWidth + "px";

    input.replaceWith(textarea);

    textarea.addEventListener("input", function () {
      processOrders(textarea.value);
    });
  }

  function processOrders(value) {
    const orders = value
      .split("\n")
      .map((o) => o.trim())
      .filter((o) => o !== "");

    const table = $("#orders-list").DataTable();

    if (orders.length === 0) {
      table.column(1).search("").draw();
    } else if (orders.length === 1) {
      table.column(1).search(orders[0]).draw();
    } else {
      const searchTerm = orders.join("|");
      table.column(1).search(searchTerm, true, false).draw();
    }
  }

  const observer = new MutationObserver(() => {
    if (document.querySelector("input.orderId")) {
      replaceWithTextarea();
      observer.disconnect();
    }
  });

  if (document.querySelector("input.orderId")) {
    replaceWithTextarea();
  } else {
    observer.observe(document.body, { childList: true, subtree: true });
  }
})();
