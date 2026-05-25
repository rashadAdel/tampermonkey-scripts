(function () {
  "use strict";
  function attachEnterListener() {
    const input = document.getElementById("orderId");
    if (!input) return;
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
