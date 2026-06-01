(function () {
  "use strict";

  window.selectedOrders = window.selectedOrders || [];

  const governoratesMap = {
    Cairo: "قاهره",
    Alexandria: "اسكندريه",
    Suez: "سويس",
    Ismailia: "اسماعيلية",
    "Port Said": "بورسعيد",
    Dakhalia: "دقهلية",
    "Al Sharqia": "شرقيه",
    Beheira: "البحيرة",
    Damietta: "دمياط",
    "Kafr El-Sheikh": "كفر الشيخ",
    Qaliubia: "قليوبية",
    Gharbeya: "غربيه",
    Monufeya: "المنوفية",
    Fayoum: "فيوم",
    "Beni Swif": "بني سويف",
    Menia: "منيا",
    Assiut: "اسيوط",
    Sohag: "سوهاج",
    Qena: "قنا",
    Luxor: "اقصر",
    Aswan: "اسوان",

    "North Coast": "قاهره",
    "Marsa Matrouh": "مطروح",
    Sinai: "قاهره",
    Hurghada: "بحر الاحمر",
    "Red Sea": "بحر الاحمر",

    "International Zone 1": "قاهره",
    International: "قاهره",
    "Gov. Zone 3": "قاهره",
    "Gov. Zone 4": "قاهره",
    "Gov. Zone 5": "قاهره",
    "Gov. Zone 6": "قاهره",

    Qalyubia: "قليوبية",
    Minya: "منيا",
    Tanta: "غربيه",
    "Wadi El geded": "وادي جديد",
    Giza: "جيزة",
    Helwan: "قاهره",
    Matrouh: "مطروح",
    Monufia: "المنوفية",
    "New Valley": "وادي جديد",
    "North Sinai": "قاهره",
    "South Sinai": "جنوب سيناء",

    Gharbia: "غربيه",
    Faiyum: "فيوم",
    Dakahlia: "دقهلية",
    "Beni Suef": "بني سويف",
    Asyut: "اسيوط",
    "6th of October": "قاهره",
  };

  // دالة تنظيف الـ HTML الممررة
  function extractTextFromHtml(html) {
    if (typeof html !== "string") return html;
    return html.replace(/<[^>]*>/g, "");
  }

  // دالة تحويل وعمل normalize لبيانات الطلب
  function convertJsonToOrder(json) {
    var result = {};
    result.id = (("" + json[1]).match(/<span class="orderId\s*">(\d+)/) || [
      ,
      "0",
    ])[1];
    result.history = (("" + json[1]).match(
      /href="view-order-history\.php\?([^"]+)"/,
    ) || [, ""])[1];
    result.shipper = (("" + json[4]).match(
      /<small class="text-muted">(.*?)<\/small>/,
    ) || [, ""])[1].trim();
    result.consignee = (("" + json[5]).match(
      /<small class="text-muted">(.*?)<\/small>/,
    ) || [, ""])[1].trim();
    result.phone =
      (("" + json[6]).match(/<small class="text-muted">(.*?)<\/small>/) || [
        ,
        "",
      ])[1]
        .replace(/\D+/g, "")
        .slice(-10) || "";
    result.totalAmount = (("" + json[8]).match(/(-?\d+)/) || [, "0"])[1];
    result.status = (("" + json[9]).match(/badge-pill">(.*?)</) || [
      ,
      "",
    ])[1].trim();
    result.courier = (("" + json[10]).match(
      /<small class="text-muted">(.*?)<\/small>/,
    ) || [, ""])[1].trim();
    result.shipping_fees = (("" + json[11]).match(
      /<small class="text-muted">(.*?)<\/small>/,
    ) || [, ""])[1].trim();
    result.date_in = (("" + json[12]).match(
      /<small class="text-muted">(.*?)<\/small>/,
    ) || [, ""])[1].trim();
    result.address = (("" + json[13]).match(
      /<small class="text-muted">(.*?)<\/small>/,
    ) || [, ""])[1].trim();
    result.gov = (("" + json[14]).match(
      /<small class="text-muted">(.*?)<\/small>/,
    ) || [, ""])[1].trim();
    result.type = (("" + json[16]).match(
      /<small class="text-muted">(.*?)<\/small>/,
    ) || [, ""])[1].trim();
    result.description = (("" + json[17]).match(
      /<small class="text-muted">\s*(.*?)\s*<\/small>/s,
    ) || [, ""])[1].trim();
    result.notes = (("" + json[18]).match(
      /<small class="text-muted">(.*?)<\/small>/,
    ) || [, ""])[1].trim();
    return result;
  }

  // تعديل: جعل الدالة ترجع Promise لضمان انتظار البيانات
  function advance_search({
    id = "",
    courierName = "",
    status = "",
    phone = "",
    shipper = "",
    asJson = true,
  }) {
    return new Promise((resolve, reject) => {
      id = ("" + id).trim();
      courierName = ("" + courierName).toLowerCase().trim();
      shipper = ("" + shipper).toLowerCase().trim();
      status =
        courierName !== "" && status === ""
          ? "outfordelivery"
          : ("" + status).toLowerCase().trim();
      phone = ("" + phone).replace(/\D+/g, "").slice(-10);

      const xhttp = new XMLHttpRequest();

      const params = new URLSearchParams();
      params.append("columns[0][orderable]", "false");
      params.append("columns[1][data]", "1");
      params.append("columns[1][name]", "");
      params.append("columns[1][searchable]", "true");
      params.append("columns[1][orderable]", "true");
      params.append("columns[1][search][value]", id);
      params.append("columns[1][search][regex]", "false");
      params.append("[search][regex]", "false");
      params.append("columns[2][search][regex]", "false");
      params.append("columns[3][search][regex]", "false");
      params.append("columns[4][search][regex]", "false");
      params.append("columns[5][search][regex]", "false");
      params.append("columns[6][search][regex]", "false");
      params.append("columns[7][search][regex]", "false");
      params.append("columns[8][searchable]", "true");
      params.append("columns[9][data]", "9");
      params.append("columns[9][searchable]", "true");
      params.append("columns[9][search][value]", status);
      params.append("columns[10][data]", "10");
      params.append("columns[10][searchable]", "true");
      params.append("columns[10][search][value]", courierName);
      params.append("start", "0");
      params.append("length", "100");
      params.append("columns[6][data]", "6");
      params.append("columns[6][search][value]", phone);
      params.append("columns[6][searchable]", "true");
      params.append("columns[4][data]", "4");
      params.append("columns[4][searchable]", "true");
      params.append("columns[4][orderable]", "true");
      params.append("columns[4][search][value]", shipper);
      params.append("columns[4][search][regex]", "false");

      xhttp.open(
        "GET",
        "/app-assets/php/orders.php?" + params.toString(),
        true,
      );

      xhttp.onreadystatechange = function () {
        if (xhttp.readyState === 4) {
          if (xhttp.status === 200) {
            try {
              const rawData = JSON.parse(xhttp.responseText)["data"];
              const orders = [];

              rawData.map((jsonOrder) => {
                var order = convertJsonToOrder(jsonOrder);

                if (status !== "") {
                  if (status !== order.status.toLowerCase()) {
                    return;
                  }
                }
                orders.push(order);
              });

              if (asJson) {
                console.log("Normalized Orders (JSON):", orders);
                resolve(orders); // إرجاع النتيجة للـ Promise
                return;
              }

              var result = orders.map((order) => {
                return [
                  order.id,
                  order.shipper,
                  order.consignee,
                  order.phone,
                  order.totalAmount,
                  order.status,
                  order.courier,
                  order.shipping_fees,
                  order.date_in,
                  order.address,
                  order.gov,
                  order.type,
                  order.description,
                  order.notes,
                ];
              });

              console.log("Normalized Orders (Array):", result);
              resolve(result); // إرجاع النتيجة للـ Promise
            } catch (e) {
              reject(e);
            }
          } else {
            reject(new Error("Request failed with status " + xhttp.status));
          }
        }
      };

      xhttp.send();
    });
  }

  function addExternalCourierSection() {
    const assignSection = document
      .querySelector('button[onclick="assignCoureir();"]')
      ?.closest(".card-body");

    if (!assignSection) return;
    if (document.getElementById("externalCourierName")) return;

    const wrapper = document.createElement("div");
    wrapper.className = "card-body pl-3 pt-1 pr-3 pb-3";
    wrapper.innerHTML = `
            <div class="row align-items-center">
                <label class="col-sm-3 col-form-label text-sm-end">External Courier</label>
                <div class="col-sm-6">
                    <select id="externalCourierName" class="form-control select2" style="width:100%;">
                        <option value="">Please select..</option>
                        <option value="872">QP</option>
                    </select>
                </div>
                <button class="col-sm-3 btn btn-outline-success btn-sm" id="sendExternalCourierBtn" type="button">Send</button>
            </div>
        `;

    assignSection.parentNode.insertBefore(wrapper, assignSection);

    if (window.$ && $.fn.select2) {
      $("#externalCourierName").select2();
    }

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

        const orders = selectedIds.map((id) => {
          return advance_search({ id, asJson: true });
        });

        QPIntegration(orders);

        // Todo: assign to courier
        console.log("Send orders to:", courierName);
      });
  }

  function QPIntegration(orders) {
    alert(
      "QP Integration is not implemented yet. Orders to send: " +
        JSON.stringify(orders),
    );
  }

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

  function findOrderPromise(orderId) {
    return new Promise((resolve) => {
      if (!orderId || selectedIds.includes(orderId)) {
        resolve();
        return;
      }

      var xhttp = new XMLHttpRequest();
      xhttp.onreadystatechange = async function () {
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

  async function findOrdersSequentially(ids) {
    for (const id of ids) {
      const trimmed = id.trim();
      if (!trimmed) continue;
      await findOrderPromise(trimmed);
    }
    console.log("Tampermonkey: تم الانتهاء من البحث عن جميع الـ IDs.");
  }

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

        // جلب الـ ID من العمود الأول وتنظيفه تماماً من الرموز المخفية والمسافات
        const orderId = tr
          .find("td:first")
          .text()
          .trim()
          .replace(/[\u200e\u200f\s]/g, "");

        if (typeof selectedIds !== "undefined" && Array.isArray(selectedIds)) {
          selectedIds = selectedIds.filter(
            (id) =>
              String(id)
                .trim()
                .replace(/[\u200e\u200f\s]/g, "") !== orderId,
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
