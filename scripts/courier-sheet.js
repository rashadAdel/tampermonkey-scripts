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

  // دالة البحث عن قائمة IDs واحد واحد مع تأخير بينهم
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

      // إطلاق event علشان الصفحة تاخد بالها من التغيير لو بتستمع
      input.dispatchEvent(new Event("input", { bubbles: true }));
      input.dispatchEvent(new Event("change", { bubbles: true }));

      findOrders();

      // انتظر ثانية بين كل طلب والتاني (عدّلها حسب سرعة السيرفر)
      await new Promise((resolve) => setTimeout(resolve, 1000));
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
