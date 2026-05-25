(function () {
  "use strict";

  // دالة لتعديل إعدادات الجدول الأصلي لمنع الترتيب
  function fixExistingTable() {
    if ($.fn.DataTable.isDataTable("#orders-list")) {
      var table = $("#orders-list").DataTable();
      table.settings()[0].aaSorting = [];
      table.context[0].aaSorting = [];
      table.order([]).draw(false);
      var originalDraw = table.draw;
      table.draw = function (userSettings) {
        if (userSettings === undefined || userSettings === true) {
          return originalDraw.call(this, false);
        }
        return originalDraw.apply(this, arguments);
      };
      console.log(
        "Tampermonkey: تم ترويض الجدول بنجاح وإلغاء الترتيب التلقائي!",
      );
      return true;
    }
    return false;
  }

  // انتظر حتى يكتمل تحديث الجدول
  function waitForTableUpdate(timeout = 5000) {
    return new Promise((resolve) => {
      const timer = setTimeout(resolve, timeout); // fallback لو مفيش draw

      if ($.fn.DataTable.isDataTable("#orders-list")) {
        const table = $("#orders-list").DataTable();
        table.one("draw", function () {
          clearTimeout(timer);
          resolve();
        });
      }
    });
  }

  // دالة البحث عن قائمة IDs واحد واحد مع انتظار اكتمال كل عملية
  async function findOrdersSequentially(ids) {
    const input = document.getElementById("orderId");
    if (!input) {
      console.error("حقل orderId مش موجود.");
      return;
    }
    if (typeof findOrders !== "function") {
      console.error("دالة findOrders غير معرفة في النطاق الحالي.");
      return;
    }

    for (const id of ids) {
      const trimmed = id.trim();
      if (!trimmed) continue;

      console.log(`Tampermonkey: جاري البحث عن ${trimmed}...`);
      input.value = trimmed;
      input.dispatchEvent(new Event("input", { bubbles: true }));
      input.dispatchEvent(new Event("change", { bubbles: true }));

      // سجّل الانتظار قبل استدعاء findOrders عشان متفوتش الحدث
      const waitPromise = waitForTableUpdate();
      findOrders();
      await waitPromise;

      console.log(`Tampermonkey: اكتمل البحث عن ${trimmed}`);
    }

    console.log("Tampermonkey: تم الانتهاء من البحث عن جميع الـ IDs.");
  }

  // دالة ربط زرار الـ Enter بالـ Input مع دعم المسافات
  function attachEnterListener() {
    const input = document.getElementById("orderId");
    if (!input) return;
    if (input.dataset.enterAttached) return;

    input.addEventListener("keydown", function (e) {
      if (e.key === "Enter") {
        e.preventDefault();
        const raw = input.value || "";
        const ids = raw.split(/\s+/).filter((id) => id.trim() !== "");
        if (ids.length === 0) return;

        if (ids.length === 1) {
          // سلوك عادي لو ID واحد بس
          if (typeof findOrders === "function") {
            findOrders();
          } else {
            console.error("دالة findOrders غير معرفة في النطاق الحالي.");
          }
        } else {
          // لو أكتر من ID، ابدأ اللوب
          console.log(
            `Tampermonkey: تم العثور على ${ids.length} IDs، بدء البحث التسلسلي...`,
          );
          findOrdersSequentially(ids);
        }
      }
    });

    input.dataset.enterAttached = true;
  }

  // مراقبة الـ DOM
  const observer = new MutationObserver(() => {
    var tableFixed = fixExistingTable();
    if (document.getElementById("orderId")) {
      attachEnterListener();
    }
    if (
      tableFixed &&
      document.getElementById("orderId") &&
      document.getElementById("orderId").dataset.enterAttached
    ) {
      observer.disconnect();
    }
  });

  var initialFixed = fixExistingTable();
  attachEnterListener();
  observer.observe(document.body, { childList: true, subtree: true });
})();
