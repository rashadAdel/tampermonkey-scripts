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

  // wrapper لـ findOrders يحولها لـ Promise
  function findOrderPromise(orderId) {
    return new Promise((resolve) => {
      if (!orderId || selectedIds.includes(orderId)) {
        resolve();
        return;
      }

      var xhttp = new XMLHttpRequest();
      xhttp.onreadystatechange = function () {
        if (this.readyState == 4 && this.status == 200) {
          var order = this.responseText;
          if (
            order == "No such order exists" ||
            order == "Order id is invalid"
          ) {
            document.getElementById("orderError").textContent = order;
            document.getElementById("orderError").style.display = "block";
          } else if (isJson(order)) {
            document.getElementById("orderError").style.display = "none";
            order = JSON.parse(order);
            var table = $("#orders-list").DataTable();
            table.row.add(order).draw();
            document.getElementById("orderId").value = "";
            selectedIds.push(orderId);
          } else {
            document.getElementById("orderError").textContent =
              "Something went wrong please try again";
            document.getElementById("orderError").style.display = "block";
          }
          resolve();
        }
      };
      xhttp.open("POST", "app-assets/php/courierSheet.php", true);
      xhttp.setRequestHeader(
        "Content-type",
        "application/x-www-form-urlencoded",
      );
      xhttp.send("orderId=" + orderId);
    });
  }

  // دالة البحث عن قائمة IDs واحد واحد مع انتظار اكتمال كل عملية
  async function findOrdersSequentially(ids) {
    for (const id of ids) {
      const trimmed = id.trim();
      if (!trimmed) continue;
      await findOrderPromise(trimmed);
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
