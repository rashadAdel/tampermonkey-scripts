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

  // دالة ربط زرار الـ Enter بالـ Input الحالي
  function attachEnterListener() {
    const input = document.getElementById("orderId");
    if (!input) return;

    if (input.dataset.enterAttached) return;

    input.addEventListener("keydown", function (e) {
      if (e.key === "Enter") {
        e.preventDefault();
        if (typeof findOrders === "function") {
          findOrders();
        } else {
          console.error("دالة findOrders غير معرفة في النطاق الحالي.");
        }
      }
    });
    input.dataset.enterAttached = true;
  }

  // دالة حقن الـ Textarea وزر الـ Add All في الصفحة تلقائياً
  function injectBulkElements() {
    const singleInput = document.getElementById("orderId");
    if (!singleInput) return;

    // التأكد من عدم تكرار إضافة الـ Textarea لو تم تحديث الـ DOM
    if (document.getElementById("bulkOrderIds")) return;

    // إيجاد الـ row الأب للـ input الحالي لكي نضع الـ textarea تحته مباشرة
    const parentRow = singleInput.closest(".row");
    if (!parentRow) return;

    // بناء الـ HTML الخاص بالـ Bulk Add ومطابقته لستايل الصفحة
    const bulkHtml = `
      <div class="row pt-3" id="bulk-orders-row">
        <label class="col-sm-3 col-form-label text-sm-end" for="bulkOrderIds">Bulk Order IDs</label>
        <div class="col-sm-9">
          <div class="input-group">
            <textarea id="bulkOrderIds" class="form-control" rows="4" placeholder="أدخل الأرقام هنا.. سطر جديد لكل رقم معرف (One per line)..." style="resize: vertical;"></textarea>
            <button class="btn btn-primary" id="btnBulkAdd" type="button">Add All</button>
          </div>
        </div>
      </div>
    `;

    // حقن الـ HTML بعد صف الـ Input الأصلي
    parentRow.insertAdjacentHTML("afterend", bulkHtml);

    // ربط كود الـ Click بالزر الجديد بعد حقنه
    document
      .getElementById("btnBulkAdd")
      .addEventListener("click", handleBulkAdd);
    console.log("Tampermonkey: تم إضافة حقل الإدخال المتعدد بنجاح!");
  }

  // الدالة المسؤولة عن قراءة الأسطر وعمل الـ Loop
  // تم استخدام async/await وتأخير زمني بسيط (150ms) لضمان عدم حدوث تضارب في طلبات الـ Ajax مع السيرفر
  async function handleBulkAdd() {
    const textarea = document.getElementById("bulkOrderIds");
    const singleInput = document.getElementById("orderId");

    if (!textarea || !singleInput || typeof findOrders !== "function") {
      alert("حدث خطأ: تأكد من وجود دالة findOrders في الصفحة.");
      return;
    }

    // تقسيم النص بناءً على السطور، تنظيف المسافات، وفلترة السطور الفارغة
    const orderIds = textarea.value
      .split("\n")
      .map((id) => id.trim())
      .filter((id) => id.length > 0);

    if (orderIds.length === 0) {
      alert("الرجاء إدخال رقم واحد على الأقل داخل المربع.");
      return;
    }

    // تعطيل الزر مؤقتاً أثناء المعالجة لحماية السيرفر من الضغط الزائد
    const btn = document.getElementById("btnBulkAdd");
    btn.disabled = true;
    btn.innerText = "جاري الإضافة...";

    // الـ Loop السحري
    for (let i = 0; i < orderIds.length; i++) {
      singleInput.value = orderIds[i]; // وضع الـ ID في الحقل الأصلي
      findOrders(); // استدعاء دالة المنصة الأصلية للبحث والإضافة

      // تأخير بسيط بمقدار 150 ملي ثانية بين كل طلب والآخر للحفاظ على استقرار الـ Ajax
      await new Promise((resolve) => setTimeout(resolve, 150));
    }

    // إعادة الزر لحالته الأصلية ومسح الـ Textarea
    btn.disabled = false;
    btn.innerText = "Add All";
    textarea.value = "";
  }

  // مراقبة الـ DOM لضمان تشغيل وظائف السكريبت فور ظهور العناصر بالصفحة
  const observer = new MutationObserver(() => {
    var tableFixed = fixExistingTable();

    if (document.getElementById("orderId")) {
      attachEnterListener();
      injectBulkElements();
    }

    // إيقاف الـ Observer مؤقتاً لتوفير الأداء لو تم تنفيذ كل شيء بنجاح
    if (
      tableFixed &&
      document.getElementById("orderId") &&
      document.getElementById("orderId").dataset.enterAttached &&
      document.getElementById("bulkOrderIds")
    ) {
      // نتركه يعمل لأن الصفحات المبنية على الـ Ajax قد تعيد بناء العناصر في أي وقت
    }
  });

  // تشغيل مبدئي احتياطي
  fixExistingTable();
  attachEnterListener();
  injectBulkElements();

  // تشغيل الـ Observer للمراقبة المستمرة والتأكد من عدم اختفاء العناصر
  observer.observe(document.body, { childList: true, subtree: true });
})();
