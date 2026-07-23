// ==UserScript==
// @name         Greenline Script Loader
// @author       Rashad Adel
// @namespace    http://tampermonkey.net/
// @version      3.2.1
// @description  Loads scripts from GitHub based on current URL
// @icon         https://system.greenlineco.com/app-assets/images/logo/logo.png
// @match        *://*/*
// @grant        GM_xmlhttpRequest
// @require      https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js
// @require      https://cdnjs.cloudflare.com/ajax/libs/crypto-js/4.2.0/crypto-js.min.js
// @require      https://unpkg.com/pdf-lib@1.17.1/dist/pdf-lib.min.js
// @connect      raw.githubusercontent.com
// @connect      openapi.jtjms-eg.com
// @connect      api.qpxpress.com
// @connect      script.google.com
// @updateURL    https://raw.githubusercontent.com/rashadAdel/tampermonkey-scripts/main/loader.user.js
// @downloadURL  https://raw.githubusercontent.com/rashadAdel/tampermonkey-scripts/main/loader.user.js
// ==/UserScript==

// loader install link
// https://raw.githubusercontent.com/rashadAdel/tampermonkey-scripts/main/loader.user.js
// https://github.com/rashadAdel/tampermonkey-scripts/blob/main/loader.user.js

(function () {
  "use strict";

  // مشاركة دالة الـ Request لنطاق الصفحة كالعادة لضمان عمل الـ Fallbacks
  if (typeof GM_xmlhttpRequest !== "undefined") {
    window.GM_xmlhttpRequest = GM_xmlhttpRequest;
  }

  function gmRequest({ method = "GET", url, headers = {}, data = undefined }) {
    return new Promise((resolve, reject) => {
      GM_xmlhttpRequest({
        method,
        url,
        headers,
        data,
        onload(response) {
          if (response.status >= 200 && response.status < 300) {
            resolve(response);
          } else {
            reject(
              new Error(
                `Request failed with status ${response.status}: ${response.responseText}`,
              ),
            );
          }
        },
        onerror: reject,
      });
    });
  }

  function gmRequestJson(options) {
    return gmRequest(options).then((response) =>
      JSON.parse(response.responseText),
    );
  }

  const currentURL = window.location.href;

  // دالة مطابقة الروابط للتأكد من تشغيل الجزء الصحيح في الصفحة الصحيحة
  function matchesPattern(pattern, url) {
    const regex = new RegExp("^" + pattern.replace(/\*/g, ".*") + "$");
    return regex.test(url);
  }

  // ==========================================
  // 1. سكريبت Courier Sheet Section
  // ==========================================
  if (
    matchesPattern("https://system.greenlineco.com/courier-sheet*", currentURL)
  ) {
    (function () {
      "use strict";

      window.selectedOrders = window.selectedOrders || [];

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

      // دالة لجلب التاريخ الحالي بصيغة YYYY-MM-DD بشكل صريح ومضمون
      function getFormattedDate() {
        const d = new Date();
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, "0");
        const day = String(d.getDate()).padStart(2, "0");
        return `${year}-${month}-${day}`; // النتيجة ستكون دائماً: 2026-06-02
      }

      // دوال إظهار وإخفاء ديالوج التحميل المخصص (Loading Dialog)
      function showLoading(
        message = "جاري معالجة الطلبات وإرسال البيانات... برجاء الانتظار",
      ) {
        if (document.getElementById("tm-loading-overlay")) return;

        const overlay = document.createElement("div");
        overlay.id = "tm-loading-overlay";
        overlay.style = `
          position: fixed; top: 0; left: 0; width: 100%; height: 100%;
          background: rgba(0, 0, 0, 0.7); z-index: 99999;
          display: flex; justify-content: center; align-items: center;
          flex-direction: column; font-family: sans-serif; direction: rtl;
        `;

        const box = document.createElement("div");
        box.style = `
          background: #fff; padding: 30px; border-radius: 8px;
          text-align: center; box-shadow: 0 4px 15px rgba(0,0,0,0.3);
        `;

        const spinner = document.createElement("div");
        spinner.style = `
          border: 4px solid #f3f3f3; border-top: 4px solid #28a745;
          border-radius: 50%; width: 40px; height: 40px;
          animation: tm-spin 1s linear infinite; margin: 0 auto 15px;
        `;

        // إضافة الأنيميشن الخاص بالسبينر لصفحة الموقع
        if (!document.getElementById("tm-spin-style")) {
          const style = document.createElement("style");
          style.id = "tm-spin-style";
          style.innerHTML =
            "@keyframes tm-spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }";
          document.head.appendChild(style);
        }

        const text = document.createElement("p");
        text.id = "tm-loading-text";
        text.textContent = message;
        text.style =
          "margin: 0; font-size: 16px; color: #333; font-weight: bold;";

        box.appendChild(spinner);
        box.appendChild(text);
        overlay.appendChild(box);
        document.body.appendChild(overlay);
      }

      function hideLoading() {
        const overlay = document.getElementById("tm-loading-overlay");
        if (overlay) overlay.remove();
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

      function downloadExcel(data, name) {
        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.aoa_to_sheet(data);

        // ضبط الاتجاه من اليمين لليسار لدعم اللغة العربية
        if (!ws["!views"]) ws["!views"] = [];
        ws["!views"].push({ RTL: true });

        XLSX.utils.book_append_sheet(wb, ws, "البيانات");
        XLSX.writeFile(wb, name + ".xlsx");
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
                            <option value="873">QP - Kulture</option>
                            <option value="871">J and T</option>
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
          .addEventListener("click", async function () {
            const courierElement = document.getElementById(
              "externalCourierName",
            );
            const courier_id = courierElement.value;
            const courierName =
              courierElement.options[courierElement.selectedIndex].text;

            if (!courier_id) {
              alert("Please select external courier");
              return;
            }

            // إظهار اللودينج بمجرد البدء بالعملية
            showLoading();

            try {
              $("#courierName").val(courier_id).trigger("change");

              //search for orders details from selectedIdss
              const orders = (
                await Promise.all(
                  selectedIds.map((id) => {
                    return advance_search({ id, asJson: true });
                  }),
                )
              ).flat();

              const headers = [
                "Date_out",
                "OtherID",
                "ID",
                "Shipper",
                "Consignee",
                "Phone",
                "Total Amount",
                "Status",
                "Courier",
                "Shipping Fees",
                "Date In",
                "Address",
                "Gov",
                "Type",
                "Description",
                "Notes",
              ];
              let createdOrders;
              switch (courierName.trim()) {
                case "QP - Kulture":
                  createdOrders = await QPIntegration(
                    orders,
                    "brstvs@qpx",
                    "88066611",
                    "13487",
                  );
                  break;
                case "J and T":
                  createdOrders = await JTIntegration(orders);
                  break;
                default:
                  alert(
                    "Integration for " +
                      courierName +
                      " is not implemented yet.",
                  );
                  return;
              }

              if (!createdOrders?.length) {
                alert("لم يتم إنشاء أي طلبات.");
                return;
              }

              // استخدام الدالة الجديدة لضمان الترتيب الصحيح للتاريخ
              const today = getFormattedDate();

              await downloadExcel(
                [headers, ...createdOrders],
                courierName + "_orders_" + today,
              );

              sendToSheets(createdOrders, courierName);
              await assignCoureir();
            } catch (err) {
              console.error(err);
              alert("حدث خطأ أثناء تنفيذ العملية: " + err.message);
            } finally {
              // إخفاء اللودينج دائماً في النهاية سواء نجحت العملية أو فشلت
              hideLoading();
            }
          });
      }

      function sendToSheets(data, sheet_name) {
        const url =
          "https://script.google.com/macros/s/AKfycby3wfyqTc9Jhz2myh0ldkVFMRsrO5pAwi7_QEPw49B3wth4eC-QT_UqW8Mu9y5XKhUx/exec";

        gmRequest({
          method: "POST",
          url,
          headers: { "Content-Type": "application/json" },
          data: JSON.stringify({ data, sheet_name, method: "insertOrders" }),
        })
          .then((response) => {
            console.log(
              "تم إرسال البيانات بنجاح إلى Sheets:",
              response.responseText,
            );
          })
          .catch((error) => {
            console.error("فشل إرسال البيانات لجوجل:", error);
          });
      }

      async function QPIntegration(orders, username, password, customer) {
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

        async function getAccessToken() {
          const loginData = {
            username,
            password,
          };

          try {
            const jsonResponse = await gmRequestJson({
              method: "POST",
              url: "https://api.qpxpress.com/api/token/",
              headers: {
                Accept: "application/json",
                "Content-Type": "application/json",
              },
              data: JSON.stringify(loginData),
            });
            return jsonResponse.access;
          } catch (error) {
            console.error("خطأ في جلب التوكن:", error.message);
            throw error;
          }
        }

        async function createOrders(flatOrders) {
          try {
            const orders_data = {};
            const today = getFormattedDate();
            const accessToken = await getAccessToken();

            const mappedOrders = flatOrders.map((order) => {
              orders_data[order.id] = [
                today,
                0,
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
              return {
                shipment_contents: order.description || "No description",
                full_name: `${order.consignee} - #${order.id} - ${("" + order.shipper).toUpperCase().slice(0, 3)}`,
                phone: `0${order.phone}`,
                total_amount: order.totalAmount || "0",
                city: governoratesMap[order.gov] || "قاهره",
                address: order.address || " ",
                notes: order.type == "Exchange" ? "طرد مقابل طرد" : "",
                referenceID: order.id,
                customer,
              };
            });

            const finalPayload = [mappedOrders];

            await gmRequestJson({
              method: "POST",
              url: "https://api.qpxpress.com/addorders/uploadfile/",
              headers: {
                Accept: "application/json",
                "Content-Type": "application/json",
                Authorization: "Bearer " + accessToken,
              },
              data: JSON.stringify(finalPayload),
            });

            const notPrintedUrl =
              "https://api.qpxpress.com/addorders/order/?rejected=0&order_serial=&full_name=&phone_number=&city=&status=&printO=False&order_date=&to_date=&page=1&page_size=1000";

            try {
              const notPrintedData = await gmRequestJson({
                method: "GET",
                url: notPrintedUrl,
                headers: {
                  Accept: "application/json",
                  "Content-Type": "application/json",
                  Authorization: "Bearer " + accessToken,
                },
              });
              notPrintedData.results.forEach((order) => {
                const serial = order.serial;
                const full_name = order.full_name;
                const id = full_name.match(/#(\d+)/)?.[1] ?? null;
                orders_data[id][1] = serial;
              });
            } catch (error) {
              console.error(
                "خطأ في جلب بيانات الطلبات غير المطبوعة:",
                error.message,
              );
            }

            return Object.values(orders_data);
          } catch (error) {
            console.error(
              "حدث خطأ في الاتصال أثناء إنشاء الطلبات:",
              error.message,
            );
            throw error;
          }
        }

        try {
          const result = await createOrders(orders);
          console.log("تمت العملية بنجاح:", result);

          window.open(
            "https://qpxpress.com/customerdashboard/orders/printorders",
            "_blank",
          );
          return result;
        } catch (err) {
          alert("لم يتم إنشاء الطلبات بسبب خطأ: " + err.message);
        }
      }

      async function JTIntegration(orders) {
        const apiAccount = "937255315324284985";
        const privateKey = "2b286c37f1524f108550066791b397cd";
        const customerCode = "J0086009627";
        const bodyDigest = "mVMfYDqwwqq9mVauAYFg7A==";
        const createOrderUrl =
          "https://openapi.jtjms-eg.com/webopenplatformapi/api/order/addOrder";
        const printOrderUrl =
          "https://openapi.jtjms-eg.com/webopenplatformapi/api/order/printOrder";

        const today = getFormattedDate();
        const errors = [];
        const successes = [];

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
          Giza: "جيزة",
          Matrouh: "مطروح",
          Monufia: "المنوفية",
          "New Valley": "وادي جديد",
          "South Sinai": "جنوب سيناء",
          Gharbia: "غربيه",
          Faiyum: "فيوم",
          Dakahlia: "دقهلية",
          "Beni Suef": "بني سويف",
          Asyut: "اسيوط",
          "6th of October": "قاهره",
          Qalyubia: "قليوبية",
          Minya: "منيا",
          Helwan: "قاهره",
        };

        function toArabicGov(gov) {
          return governoratesMap[gov] || gov || "قاهره";
        }

        function generateHeaderDigest(bizContentJson, key) {
          return CryptoJS.enc.Base64.stringify(
            CryptoJS.MD5(bizContentJson + key),
          );
        }

        // ==========================================
        // دالة جلب البوليسات ودمجها ثم فتحها للمستخدم
        // ==========================================
        async function printAndMergeWaybills(billCodes) {
          if (!billCodes || billCodes.length === 0) return;

          // 1. حماية أولى: إزالة أي تكرار في مصفوفة الأكواد القادمة من دالة الإنشاء
          const uniqueBillCodes = [...new Set(billCodes)];

          console.log(
            `جاري جلب البوليسات ودمجها بالتوازي لعدد (${uniqueBillCodes.length}) كود فريد...`,
          );

          // استخدام الكائن المتاح من الـ @require في Tampermonkey
          const mergedPdf = await PDFLib.PDFDocument.create();

          // إرسال طلبات الطباعة للأكواد الفريدة فقط بالتوازي
          const printPromises = uniqueBillCodes.map(async (billCode) => {
            try {
              const bizContent = {
                customerCode,
                digest: bodyDigest,
                billCode: billCode,
                printSize: 2,
                printCod: 1,
                showCustomerOrderId: 1,
              };

              const bizContentJson = JSON.stringify(bizContent);
              const timestamp = Date.now();

              const response = await gmRequestJson({
                method: "POST",
                url: printOrderUrl,
                headers: {
                  apiAccount: String(apiAccount),
                  digest: generateHeaderDigest(bizContentJson, privateKey),
                  timestamp: String(timestamp),
                  "Content-Type": "application/x-www-form-urlencoded",
                },
                data: `bizContent=${encodeURIComponent(bizContentJson)}`,
              });

              if (response.code === "1" || response.code === 1) {
                return { billCode, base64: response.data?.base64EncodeContent };
              } else {
                console.error(`فشل جلب بوليصة ${billCode}: ${response.msg}`);
                return null; // نرجع null بدل الأخطاء لسهولة الفلترة
              }
            } catch (err) {
              console.error(`خطأ أثناء جلب بوليصة ${billCode}:`, err);
              return null;
            }
          });

          const results = await Promise.all(printPromises);
          let embeddedPagesCount = 0;

          // دمج ملفات الـ PDF المسترجعة داخل الملف الرئيسي مع استبعاد أي قيمة فارغة
          for (const res of results) {
            if (res && res.base64) {
              try {
                // تحويل الـ Base64 إلى مصفوفة بايتات تناسب متصفحات الويب
                const pdfBytes = Uint8Array.from(atob(res.base64), (c) =>
                  c.charCodeAt(0),
                );
                const currentPdf = await PDFLib.PDFDocument.load(pdfBytes);
                const copiedPages = await mergedPdf.copyPages(
                  currentPdf,
                  currentPdf.getPageIndices(),
                );
                copiedPages.forEach((page) => mergedPdf.addPage(page));
                embeddedPagesCount++;
              } catch (mergeErr) {
                console.error(
                  `خطأ أثناء دمج البوليصة ${res.billCode}:`,
                  mergeErr,
                );
              }
            }
          }

          // لو تم الدمج بنجاح، حولها لـ Blob وافتحها في Tab جديد فوراً
          if (embeddedPagesCount > 0) {
            const mergedPdfBytes = await mergedPdf.save();
            const blob = new Blob([mergedPdfBytes], {
              type: "application/pdf",
            });
            const blobUrl = URL.createObjectURL(blob);

            // فتح التبويب الجديد
            window.open(blobUrl, "_blank");
            console.log(
              `تم دمج وفتح عدد (${embeddedPagesCount}) بوليصة فريدة بنجاح.`,
            );
          } else {
            alert(
              "فشل جلب بوليسات الشحن، تأكد من أن حالة الطلبات جاهزة للطباعة على سيستم J&T.",
            );
          }
        }

        // ==========================================
        // دالة إنشاء الطلب الأصلي
        // ==========================================
        async function createOrder(order) {
          const receiverGov = toArabicGov(order.gov);

          // 1. إعداد بيانات الراسل الأصلية
          let senderData = {
            name: order.shipper,
            mobile: "01011876569",
            phone: "01011876569",
            countryCode: "EGY",
            prov: "قاهره",
            city: "قاهره",
            area: "مدينة نصر",
            street: "Nasr City street",
          };

          // 2. إعداد بيانات المرسل إليه الأصلية
          let receiverData = {
            name: order.consignee,
            mobile: `0${order.phone}`,
            phone: `0${order.phone}`,
            countryCode: "EGY",
            prov: receiverGov,
            city: receiverGov,
            area: receiverGov,
            street: order.address || "empty ",
          };

          // 3. لو الأوردر Refund، شقلب الراسل والمرسل إليه
          if (order.type === "Refund") {
            const temp = senderData;
            senderData = receiverData;
            receiverData = temp;
          }

          const bizContent = {
            customerCode,
            digest: bodyDigest,
            txlogisticId: String(order.id),
            expressType:
              order.type === "Exchange"
                ? "EX"
                : order.type === "Refund"
                  ? "DR"
                  : "EZ",
            deliveryType: "04",
            goodsType: "ITN16",
            weight: "1",
            totalQuantity: 1,
            operateType: 1,
            itemsValue:
              order.type === "Refund" ? "0" : String(order.totalAmount || "0"),
            payType: "PP_CASH",
            priceCurrency: "EGP",
            remark: order.description || "",
            sender: senderData,
            receiver: receiverData,
          };

          if (order.type === "Exchange" || order.type === "Refund") {
            bizContent.EXDR_DESCRIPTION = order.description;
          }

          const bizContentJson = JSON.stringify(bizContent);
          const timestamp = Date.now();

          const data = await gmRequestJson({
            method: "POST",
            url: createOrderUrl,
            headers: {
              apiAccount: String(apiAccount),
              digest: generateHeaderDigest(bizContentJson, privateKey),
              timestamp: String(timestamp),
              "Content-Type": "application/x-www-form-urlencoded",
            },
            data: `bizContent=${encodeURIComponent(bizContentJson)}`,
          });

          if (data.code !== "1" && data.code !== 1) {
            throw new Error(data.msg || `كود: ${data.code}`);
          }

          return [
            today,
            data.data?.billCode || 0,
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
        }

        // التنفيذ الفعلي والـ Loop الخاص بإنشاء الطلبات أولاً
        const createdBillCodes = [];

        for (const order of orders) {
          try {
            const orderData = await createOrder(order);
            successes.push(orderData);

            // تجميع الـ billCode المرتجع للبوليسات الناجحة فقط
            if (orderData[1] && orderData[1] !== 0) {
              createdBillCodes.push(orderData[1]);
            }
          } catch (err) {
            errors.push(`#${order.id}: ${err.message}`);
          }
        }

        if (errors.length) {
          const msgError = "فشل إنشاء بعض الطلبات:\n" + errors.join("\n");
          console.error(msgError);
          alert(msgError);
        }

        // استدعاء دالة الطباعة المدمجة تلقائياً إذا وُجدت أكواد ناجحة
        if (createdBillCodes.length > 0) {
          await printAndMergeWaybills(createdBillCodes);
        }

        return successes;
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
            "Tampermonkey: تم ترويض الجدول بنجاح وإلغائي الترتيب التلقائي!",
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
        // إظهار اللودينج أثناء جلب الطلبات المتعددة بالـ IDs
        showLoading("جاري البحث عن الطلبات المضافة... برجاء الانتظار");
        try {
          for (const id of ids) {
            const trimmed = id.trim();
            if (!trimmed) continue;
            await findOrderPromise(trimmed);
          }
        } finally {
          hideLoading();
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

            const orderId = tr
              .find("td:first")
              .text()
              .trim()
              .replace(/[\u200e\u200f\s]/g, "");

            if (
              typeof selectedIds !== "undefined" &&
              Array.isArray(selectedIds)
            ) {
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
  }

  // ==========================================
  // 2. سكريبت Bulk Status Section
  // ==========================================
  if (
    matchesPattern("https://system.greenlineco.com/bulk-status*", currentURL)
  ) {
    (function () {
      "use strict";

      // دالة مساعدة لتحديث حالة الزرار (Loading / Normal)
      function toggleLoading(isLoading) {
        const btn = document.getElementById("customDeleteBtn");
        if (!btn) return;
        if (isLoading) {
          btn.disabled = true;
          btn.innerHTML = `<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> جارٍ الحذف...`;
        } else {
          btn.disabled = false;
          btn.innerHTML = "Delete";
        }
      }

      function deleteFromSheet(data, sheet_name) {
        const url =
          "https://script.google.com/macros/s/AKfycby3wfyqTc9Jhz2myh0ldkVFMRsrO5pAwi7_QEPw49B3wth4eC-QT_UqW8Mu9y5XKhUx/exec";

        // بنرجع الـ Promise عشان ننتظره في الـ Loading
        return gmRequest({
          method: "POST",
          url,
          headers: { "Content-Type": "application/json" },
          data: JSON.stringify({ data, sheet_name, method: "deleteOrders" }),
        })
          .then((response) => {
            console.log(
              "تم إرسال البيانات بنجاح إلى Sheets:",
              response.responseText,
            );
          })
          .catch((error) => {
            // المشكلة غالباً بسبب الـ Redirect الخاص بجوجل، لو الشيت بيسمع فعلاً يبقى الإجراء تم بنجاح رغم الـ Error
            console.warn(
              "تنبيــه بخصوص جوجل شيت (قد تكون البيانات وصلت بالفعل):",
              error,
            );
          });
      }

      function addCustomDeleteSection() {
        const statusSelect = document.getElementById("newStatus");
        const statusCard = statusSelect?.closest(".card");

        if (statusCard && !document.getElementById("customDeleteSelect")) {
          const wrapper = document.createElement("div");
          wrapper.className = "card mb-4";
          wrapper.innerHTML = `
        <div class="card-header">
            <h5 class="mb-b fw-normal">Control Section</h5> </div>
        <div class="card-body pl-3 pt-1 pr-3 pb-3">
            <div class="row align-items-center">
                <label class="col-sm-3 col-form-label text-sm-end">Action Type</label> <div class="col-sm-6">
                    <select id="customDeleteSelect" class="form-control" style="width:100%;">
                        <option value="">Please select..</option>
                        <option value="J and T">J and T 2</option>
                    </select>
                </div>
                <button class="col-sm-3 btn btn-outline-danger btn-sm" id="customDeleteBtn" type="button">Delete</button>
            </div>
        </div>
    `;

          statusCard.parentNode.insertBefore(wrapper, statusCard);

          document
            .getElementById("customDeleteBtn")
            .addEventListener("click", async function () {
              const selectedValue =
                document.getElementById("customDeleteSelect").value;
              if (!selectedValue) {
                alert("Please select an option first!");
                return;
              }

              const newStatus = document.getElementById("newStatus");
              if (!newStatus.value) {
                $("#newStatus").val("OutOfStock").trigger("change");
              }

              // جلب الـ IDs الحقيقية بشكل صحيح
              let ids = [];
              try {
                ids = JSON.parse(orderIds.value);
              } catch (e) {
                ids = orderIds.value ? [orderIds.value] : [];
              }

              if (!ids || ids.length === 0) {
                alert("No orders selected/found!");
                return;
              }

              // تشغيل الـ Loading
              toggleLoading(true);

              console.log(`Deleting orders`, ids, selectedValue);

              try {
                // 1. الحذف من الجوجل شيت أولاً وانتظاره
                await deleteFromSheet(ids, selectedValue);

                // 2. تشغيل حذف الـ J&T بناءً على الشرط وتمرير الـ ids وليس الـ selectedValue!
                switch (selectedValue) {
                  case "J and T":
                    await JTDelete(ids); // تعديل هنا: مررنا الـ ids الحقيقية
                    break;
                  default:
                    alert("not supported");
                    break;
                }
                $("#newStatus").closest("form").submit();
              } catch (globalError) {
                console.error("حدث خطأ أثناء تنفيذ العمليات:", globalError);
              } finally {
                // إيقاف الـ Loading في كل الأحوال (نجاح أو فشل)
                toggleLoading(false);
              }
            });
        }
      }

      async function JTDelete(ids) {
        const apiAccount = "937255315324284985";
        const privateKey = "2b286c37f1524f108550066791b397cd";
        const customerCode = "J0086009627";
        const bodyDigest = "mVMfYDqwwqq9mVauAYFg7A==";
        const cancelOrderUrl =
          "https://openapi.jtjms-eg.com/webopenplatformapi/api/order/cancelOrder";

        function generateHeaderDigest(bizContentJson, key) {
          return CryptoJS.enc.Base64.stringify(
            CryptoJS.MD5(bizContentJson + key),
          );
        }

        if (!ids || !Array.isArray(ids) || ids.length === 0) return;

        const errors = [];
        const successes = [];

        for (const id of ids) {
          try {
            const trimmedId = String(id).trim();
            if (!trimmedId) continue;

            const bizContent = {
              customerCode: customerCode,
              digest: bodyDigest,
              orderType: "1",
              txlogisticId: trimmedId,
              reason: "out of stock",
            };

            const bizContentJson = JSON.stringify(bizContent);
            const timestamp = Date.now();
            const digestHeader = generateHeaderDigest(
              bizContentJson,
              privateKey,
            );

            const response = await gmRequestJson({
              method: "POST",
              url: cancelOrderUrl,
              headers: {
                apiAccount: String(apiAccount),
                digest: digestHeader,
                timestamp: String(timestamp),
                "Content-Type": "application/x-www-form-urlencoded",
              },
              data: `bizContent=${encodeURIComponent(bizContentJson)}`,
            });

            if (response.code === "1" || response.code === 1) {
              successes.push(trimmedId);
              console.log(`[J&T] تم إلغاء الطلب رقم #${trimmedId} بنجاح.`);
            } else {
              throw new Error(response.msg || `كود الخطأ: ${response.code}`);
            }
          } catch (err) {
            errors.push(`#${id}: ${err.message}`);
          }
        }

        if (successes.length > 0) {
          alert(`تم إلغاء عدد (${successes.length}) طلب بنجاح على J&T.`);
        }

        if (errors.length > 0) {
          const msgError = "فشل إلغاء بعض الطلبات:\n" + errors.join("\n");
          console.error(msgError);
          alert(msgError);
        }
      }

      function patchInput() {
        const input = document.querySelector(
          '#ordersDiv input[name="orderId"]',
        );
        if (!input) return;

        input.type = "text";
        input.placeholder = "Order id... (أو أكتر مفصولين بمسافة)";
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

      const observer = new MutationObserver(() => {
        const input = document.querySelector(
          '#ordersDiv input[name="orderId"]',
        );
        if (input) {
          observer.disconnect();
          patchInput();
          addCustomDeleteSection();
        }
      });

      observer.observe(document.body, { childList: true, subtree: true });
    })();
  }
})();
