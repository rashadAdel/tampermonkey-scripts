(function () {
  "use strict";

  function patchInput() {
    const input = document.querySelector('#ordersDiv input[name="orderId"]');
    if (!input) return;

    // Change type to text to allow spaces
    input.type = "text";
    input.placeholder = "Order id... (أو أكتر مفصولين بمسافة)";

    // Remove original inline handler
    input.removeAttribute("onkeydown");

    input.addEventListener("keydown", async function (event) {
      if (event.key !== "Enter") return;
      event.preventDefault();
      event.stopPropagation();

      const ids = input.value.trim().split(/\s+/).filter(Boolean);
      if (!ids.length) return;

      for (const id of ids) {
        input.value = id;
        await addOrderId(input);
      }

      input.value = "";
    });

    console.log("[Greenline] Bulk order ID input patched ✅");
  }

  // Wait for DOM + repeater to render
  const observer = new MutationObserver(() => {
    const input = document.querySelector('#ordersDiv input[name="orderId"]');
    if (input) {
      observer.disconnect();
      patchInput();
    }
  });

  observer.observe(document.body, { childList: true, subtree: true });
})();
