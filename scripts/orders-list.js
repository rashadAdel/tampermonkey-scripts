(function () {
  "use strict";

  function replaceWithTextarea() {
    const input = document.getElementById("Order#");
    if (!input || document.getElementById("multiline-orders")) return;

    const textarea = document.createElement("textarea");
    textarea.id = "multiline-orders";
    textarea.className = input.className;
    textarea.placeholder = "Order Id (سطر لكل أوردر)";
    textarea.rows = 4;
    textarea.style.resize = "vertical";

    input.replaceWith(textarea);

    // دور على الزرار الجنبه وحط عليه listener
    const btn = textarea.nextElementSibling;
    if (btn) {
      btn.addEventListener("click", function (e) {
        e.preventDefault();
        processOrders(textarea.value);
      });
    }

    // Enter + Shift = سطر جديد / Enter لوحده = ابحث
    textarea.addEventListener("keydown", function (e) {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        processOrders(textarea.value);
      }
    });
  }

  function processOrders(value) {
    const orders = value
      .split("\n")
      .map((o) => o.trim())
      .filter((o) => o !== "");

    orders.forEach((orderId) => {
      console.log("Searching for:", orderId);
      // غيّر السطر ده للفانكشن الصح في الموقع
      searchOrder(orderId);
    });
  }

  const observer = new MutationObserver(() => {
    if (document.getElementById("Order#")) {
      replaceWithTextarea();
      observer.disconnect();
    }
  });

  if (document.getElementById("Order#")) {
    replaceWithTextarea();
  } else {
    observer.observe(document.body, { childList: true, subtree: true });
  }
})();
