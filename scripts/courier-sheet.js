(function () {
  "use strict";

  // دالة لتعديل إعدادات الجدول الأصلي لمنع الترتيب
  function fixExistingTable() {
    if ($.fn.DataTable.isDataTable("#orders-list")) {
      var table = $("#orders-list").DataTable();

      // 1. تصغير وتصفير المصفوفة المسؤولية عن الترتيب الحالي والمستقبلي
      table.settings()[0].aaSorting = [];
      table.context[0].aaSorting = [];
      table.order([]).draw(false); // draw(false) بتحدث الجدول في مكانه بدون إعادة ترتيب

      // 2. عمل Overwrite دبلماسي لدالة draw الافتراضية للجدول ده
      // علشان لو الفانكشنز الأصلية ندهت table.draw() نغصبها ما ترتبش
      var originalDraw = table.draw;
      table.draw = function (userSettings) {
        if (userSettings === undefined || userSettings === true) {
          return originalDraw.call(this, false); // نجبرها دايماً تشتغل كـ false لمنع الـ Sort
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

  // دالة ربط زرار الـ Enter بالـ Input
  function attachEnterListener() {
    const input = document.getElementById("orderId");
    if (!input) return;

    // تأكيد عدم تكرار الـ Listener
    if (input.dataset.enterAttached) return;

    input.addEventListener("keydown", function (e) {
      if (e.key === "Enter") {
        e.preventDefault();
        // نتحقق إن الدالة الأصلية موجودة في الـ Window قبل ما نطلبها
        if (typeof findOrders === "function") {
          findOrders();
        } else {
          console.error("دالة findOrders غير معرفة في النطاق الحالي.");
        }
      }
    });
    input.dataset.enterAttached = true;
  }

  // مراقبة الـ DOM لضمان تشغيل الكود فور ظهور العناصر
  const observer = new MutationObserver(() => {
    var tableFixed = fixExistingTable();
    if (document.getElementById("orderId")) {
      attachEnterListener();
    }
    // لو الجدول اتظبط والـ input اتظبط وقف الـ Observer لتوفير الأداء
    if (
      tableFixed &&
      document.getElementById("orderId") &&
      document.getElementById("orderId").dataset.enterAttached
    ) {
      observer.disconnect();
    }
  });

  // تشغيل مبدئي في حالة السكريبت لقط الصفحة جاهزة
  var initialFixed = fixExistingTable();
  attachEnterListener();

  // تشغيل الـ Observer للمراقبة المستمرة
  observer.observe(document.body, { childList: true, subtree: true });
})();
