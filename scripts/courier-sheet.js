(function () {
  "use strict";

  window.__state = window.__state || {
    selectedOrders: [],
    selectedIds: [],
  };

  window.selectedOrders = window.__state.selectedOrders;
  window.selectedIds = window.__state.selectedIds;

  function addExternalCourierSection() {
    const assignSection = document
      .querySelector('button[onclick="assignCoureir();"]')
      ?.closest(".card-body");

    if (!assignSection) return;

    // Prevent duplicate insertion
    if (document.getElementById("externalCourierName")) return;

    const wrapper = document.createElement("div");

    wrapper.className = "card-body pl-3 pt-1 pr-3 pb-3";

    wrapper.innerHTML = `
            <div class="row align-items-center">

                <label class="col-sm-3 col-form-label text-sm-end">
                    External Courier
                </label>

                <div class="col-sm-6">
                    <select
                        id="externalCourierName"
                        class="form-control select2"
                        style="width:100%;"
                    >
                        <option value="">Please select..</option>
                        <option value="871">J&T</option>
                    </select>
                </div>

                <button
                    class="col-sm-3 btn btn-outline-success btn-sm"
                    id="sendExternalCourierBtn"
                    type="button"
                >
                    Send
                </button>

            </div>
        `;

    // Insert above current courier assign section
    assignSection.parentNode.insertBefore(wrapper, assignSection);

    // Init select2 if loaded
    if (window.$ && $.fn.select2) {
      $("#externalCourierName").select2();
    }

    // Button click
    document
      .getElementById("sendExternalCourierBtn")
      .addEventListener("click", function () {
        const courierElement = document.getElementById("externalCourierName");
        const courier_id = courierElement.value;
        const courierName =
          courierElement.options[courierElement.selectedIndex].text;
        if (!courier_id) {
          alert("Please select external courier");
          return;
        }
        $("#courierName").val(courier_id).trigger("change");
        console.log("Send orders to:", courierName);

        // TODO:
        // Send selected orders to external courier API
      });
  }

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
            window.selectedOrders.push(order);
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

        findOrdersSequentially(ids);
      }
    });

    input.dataset.enterAttached = true;
  }

  // مراقبة الـ DOM
  const observer = new MutationObserver(() => {
    addExternalCourierSection();

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

  function fixRemoveButton() {
    if (window.__tm_remove_fixed) return;
    window.__tm_remove_fixed = true;

    $("#orders-list")
      .off("click.tmRemove")
      .on("click.tmRemove", ".removeButton", function () {
        const tr = $(this).closest("tr");

        const table = $("#orders-list").DataTable();
        const row = table.row(tr);

        const orderId = tr.find("td:first").text().trim();

        if (typeof selectedIds !== "undefined" && Array.isArray(selectedIds)) {
          selectedIds = selectedIds.filter(
            (id) => String(id).trim() !== String(orderId).trim(),
          );
        }
        if (Array.isArray(window.selectedOrders)) {
          window.selectedOrders = window.selectedOrders.filter(
            (order) => String(order[0]).trim() !== String(orderId).trim(),
          );
        }

        row.remove().draw(false);
      });
  }

  addExternalCourierSection();
  fixExistingTable();
  attachEnterListener();
  fixRemoveButton();

  observer.observe(document.body, { childList: true, subtree: true });
})();
