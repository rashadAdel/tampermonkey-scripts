(function () {
  "use strict";

  function replaceWithTextarea() {
    const input = document.querySelector("input.orderId");
    if (!input || document.getElementById("multiline-orders")) return;

    const textarea = document.createElement("textarea");
    textarea.id = "multiline-orders";
    textarea.className = input.className;
    textarea.placeholder = "Order Id\nسطر لكل أوردر";
    textarea.rows = 5;
    textarea.style.resize = "vertical";
    textarea.style.width = "100%";
    textarea.style.minHeight = "100px";
    textarea.style.lineHeight = "1.8";
    textarea.style.padding = "6px 10px";
    textarea.style.fontSize = "14px";
    textarea.style.whiteSpace = "pre";
    textarea.style.overflowWrap = "normal";
    textarea.style.overflowX = "auto";

    input.replaceWith(textarea);

    textarea.addEventListener("input", function () {
      processOrders(textarea.value);
    });

    // تنضيف الـ paste من أي spaces أو حروف غريبة
    textarea.addEventListener("paste", function (e) {
      e.preventDefault();
      const pasted = (e.clipboardData || window.clipboardData).getData("text");
      const cleaned = pasted
        .split(/[\r\n]+/) // split بأي نوع newline
        .map((o) => o.replace(/\s+/g, "").trim()) // شيل كل spaces جوا الرقم
        .filter((o) => o !== "")
        .join("\n");
      textarea.value = cleaned;
      processOrders(cleaned);
    });
  }

  function processOrders(value) {
    const orders = value
      .split(/[\r\n]+/)
      .map((o) => o.replace(/\s+/g, "").trim())
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
