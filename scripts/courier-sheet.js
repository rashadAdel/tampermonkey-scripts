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
    text.style = "margin: 0; font-size: 16px; color: #333; font-weight: bold;";

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

  async function downloadExcel(data, name) {
    // 1. التأكد من تحميل المكتبة، وإذا لم تكن موجودة يتم تحميلها فوراً
    if (typeof XLSX === "undefined") {
      console.log("جاري تحميل مكتبة XLSX...");
      await new Promise((resolve, reject) => {
        const script = document.createElement("script");
        script.src =
          "https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js";
        script.onload = () => resolve();
        script.onerror = () => reject(new Error("فشل تحميل مكتبة الإكسيل"));
        document.head.appendChild(script);
      });
      console.log("تم تحميل المكتبة بنجاح!");
    }

    // 2. صناعة ملف الإكسيل وتحميله
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
                        <option value="872">QP</option>
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
        const courierElement = document.getElementById("externalCourierName");
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
          const orders = await Promise.all(
            selectedIds.map((id) => {
              return advance_search({ id, asJson: true });
            }),
          );

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
            case "QP":
              createdOrders = await QPIntegration(orders);
              break;
            case "J and T":
              createdOrders = await JTIntegration(orders);
              break;
            default:
              alert(
                "Integration for " + courierName + " is not implemented yet.",
              );
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

  // تعديل الدالة لتعمل من خلال سياق المتصفح الممرر من اللودر لتخطي CORS
  function sendToSheets(data, sheet_name) {
    try {
      const url =
        "https://script.google.com/macros/s/AKfycby3wfyqTc9Jhz2myh0ldkVFMRsrO5pAwi7_QEPw49B3wth4eC-QT_UqW8Mu9y5XKhUx/exec";

      const httpRequester =
        window.GM_xmlhttpRequest ||
        (typeof GM_xmlhttpRequest !== "undefined" ? GM_xmlhttpRequest : null);

      if (httpRequester) {
        httpRequester({
          method: "POST",
          url: url,
          headers: {
            "Content-Type": "application/json",
          },
          data: JSON.stringify({ data, sheet_name }),
          onload: function (response) {
            if (response.status === 200 || response.status === 302) {
              console.log(
                "تم إرسال البيانات بنجاح إلى Sheets عبر GM_xmlhttpRequest:",
                response.responseText,
              );
            } else {
              console.error("فشل الإرسال لجوجل، كود الرد:", response.status);
            }
          },
          onerror: function (error) {
            console.error("خطأ شبكة أثناء إرسال البيانات لجوجل:", error);
          },
        });
      } else {
        // Fallback في حال فشل التمرير لأي سبب
        console.warn(
          "GM_xmlhttpRequest غير متوفرة، جاري المحاولة بـ fetch (قد يفشل بسبب CORS)",
        );
        fetch(url, {
          method: "POST",
          mode: "no-cors",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ data, sheet_name }),
        })
          .then(() => console.log("تم الإرسال بوضعية fallback no-cors"))
          .catch((err) => console.error("فشل إرسال الـ fallback:", err));
      }
    } catch (e) {
      console.error("خطأ غير متوقع في sendToSheets:", e);
      return;
    }
  }

  async function QPIntegration(orders) {
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
        username: "greenL@qpx",
        password: "80113761",
      };

      try {
        const response = await fetch("https://api.qpxpress.com/api/token/", {
          method: "POST",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
          },
          body: JSON.stringify(loginData),
        });

        if (!response.ok) {
          throw new Error("فشل طلب التوكن بكود: " + response.status);
        }

        const jsonResponse = await response.json();
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
            full_name: `${order.consignee} - #${order.id} - ${order.shipper}`,
            phone: `0${order.phone}`,
            total_amount: order.totalAmount || "0",
            city: governoratesMap[order.gov] || "قاهره",
            address: order.address || " ",
            notes: order.type == "Exchange" ? "طرد مقابل طرد" : "",
            referenceID: order.id,
            customer: 13187,
          };
        });

        const finalPayload = [mappedOrders];

        const response = await fetch(
          "https://api.qpxpress.com/addorders/uploadfile/",
          {
            method: "POST",
            headers: {
              Accept: "application/json",
              "Content-Type": "application/json",
              Authorization: "Bearer " + accessToken,
            },
            body: JSON.stringify(finalPayload),
          },
        );

        if (!response.ok) {
          throw new Error("فشل إرسال الطلبات بكود: " + response.status);
        }

        await response.json();
        const notPrintedUrl =
          "https://api.qpxpress.com/addorders/order/?rejected=0&order_serial=&full_name=&phone_number=&city=&status=&printO=False&order_date=&to_date=&page=1&page_size=1000";

        try {
          const notPrintedResponse = await fetch(notPrintedUrl, {
            method: "GET",
            headers: {
              Accept: "application/json",
              "Content-Type": "application/json",
              Authorization: "Bearer " + accessToken,
            },
          });
          const notPrintedData = await notPrintedResponse.json();
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
        console.error("حدث خطأ في الاتصال أثناء إنشاء الطلبات:", error.message);
        throw error;
      }
    }

    try {
      const flatOrders = orders.flat();
      const result = await createOrders(flatOrders);
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

  // async function JTIntegration(orders) {
  //   await loadCryptoJS();
  //   const bodyDigest = "mVMfYDqwwqq9mVauAYFg7A==";
  //   const privateKey = "2b286c37f1524f108550066791b397cd";
  //   const apiAccount = "937255315324284985";
  //   const customerCode = "J0086009627";
  //   const apiUrl =
  //     "https://openapi.jtjms-eg.com/webopenplatformapi/api/order/addOrder";

  //   function generateDigest(bizContent, privateKey) {
  //     const jsonString = JSON.stringify(bizContent);
  //     const raw = jsonString + privateKey;

  //     const md5 = CryptoJS.MD5(raw);

  //     return CryptoJS.enc.Base64.stringify(md5);
  //   }

  //   async function createOrder(order) {
  //     const body = {
  //       customerCode,
  //       digest: bodyDigest,
  //       txlogisticId: order.id,
  //       expressType:
  //         order.type === "Exchange"
  //           ? "EX"
  //           : order.type === "Refund"
  //             ? "DR"
  //             : "EZ",
  //       deliveryType: "04",
  //       goodsType: "ITN16",
  //       weight: "1",
  //       totalQuantity: "1",
  //       operateType: "1",
  //       itemsValue: order.totalAmount || "0",
  //       payType: "PP_CASH",
  //       priceCurrency: "EGP",
  //       remark: order.description || "",
  //       sender: {
  //         name: order.shipper,
  //         mobile: "01011876569",
  //         phone: "01011876569",
  //         countryCode: "EGY",
  //         prov: "Cairo",
  //         city: "Cairo",
  //         area: "Nasr City",
  //         street: "Nasr City street",
  //       },
  //       receiver: {
  //         name: order.consignee,
  //         mobile: `0${order.phone}`,
  //         phone: `0${order.phone}`,
  //         countryCode: "EGY",
  //         prov: order.gov || "Cairo",
  //         city: order.gov || "Cairo",
  //         area: order.gov || "Cairo",
  //         street: "Nasr City street",
  //       },
  //     };
  //     const HeaderDigest = generateDigest(body, privateKey);
  //     const timestamp = new Date().now();

  //     const response = await fetch(apiUrl, {
  //       method: "POST",
  //       headers: {
  //         apiAccount,
  //         digest: HeaderDigest,
  //         timestamp,
  //       },
  //       body: JSON.stringify(body),
  //     });
  //     return response.json();
  //   }
  //   try {
  //     orders.forEach(async (order) => {
  //       const result = await createOrder(order);
  //     });
  //   } catch (err) {
  //     alert("لم يتم إنشاء الطلبات بسبب خطأ: " + err.message);
  //   }
  // }

  async function JTIntegration(orders) {
    await loadCryptoJS();
    const bodyDigest = "mVMfYDqwwqq9mVauAYFg7A==";
    const privateKey = "2b286c37f1524f108550066791b397cd";
    const apiAccount = "937255315324284985";
    const customerCode = "J0086009627";
    const apiUrl =
      "https://openapi.jtjms-eg.com/webopenplatformapi/api/order/addOrder";

    function generateDigest(bizContent, privateKey) {
      const jsonString = JSON.stringify(bizContent);
      const raw = jsonString + privateKey;
      const md5 = CryptoJS.MD5(raw);
      return CryptoJS.enc.Base64.stringify(md5);
    }

    async function createOrder(order) {
      const body = {
        customerCode,
        digest: bodyDigest,
        txlogisticId: order.id,
        expressType:
          order.type === "Exchange"
            ? "EX"
            : order.type === "Refund"
              ? "DR"
              : "EZ",
        deliveryType: "04",
        goodsType: "ITN16",
        weight: "1",
        totalQuantity: "1",
        operateType: "1",
        itemsValue: order.totalAmount || "0",
        payType: "PP_CASH",
        priceCurrency: "EGP",
        remark: order.description || "",
        sender: {
          name: order.shipper,
          mobile: "01011876569",
          phone: "01011876569",
          countryCode: "EGY",
          prov: "Cairo",
          city: "Cairo",
          area: "Nasr City",
          street: "Nasr City street",
        },
        receiver: {
          name: order.consignee,
          mobile: `0${order.phone}`,
          phone: `0${order.phone}`,
          countryCode: "EGY",
          prov: order.gov || "Cairo",
          city: order.gov || "Cairo",
          area: order.gov || "Cairo",
          street: "Nasr City street",
        },
      };

      const HeaderDigest = generateDigest(body, privateKey);
      const timestamp = Date.now(); // تعديل الخطأ هنا

      const response = await fetch(apiUrl, {
        method: "POST",
        headers: {
          apiAccount,
          digest: HeaderDigest,
          timestamp: String(timestamp),
        },
        body: JSON.stringify(body),
      });

      const apiResult = await response.json();

      // هنا نقوم بعمل mapping للبيانات لتطابق الـ Headers المطلوبة للإكسيل والشيت
      // الـ Headers المتوقعة: ["Date_out", "OtherID", "ID", "Shipper", "Consignee", "Phone", "Total Amount", "Status", "Courier", "Shipping Fees", "Date In", "Address", "Gov", "Type", "Description", "Notes"]
      const today = getFormattedDate();

      // يمكنك استخراج رقم الشحنة (BillCode) من رد J&T إذا كان متاحاً في apiResult وضعه مكان "OtherID"
      const billCode = apiResult?.data?.billCode || "";

      return [
        today,
        billCode, // OtherID
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

    try {
      // تفكيك المصفوفات المتداخلة إذا كانت قادمة من Promise.all الخارجي
      const flatOrders = orders.flat();

      // استخدام Promise.all لانتظار كل الطلبات وتجميع النتائج
      const result = await Promise.all(
        flatOrders.map((order) => createOrder(order)),
      );

      console.log("تم إنشاء طلبات J&T بنجاح:", result);
      return result; // إرجاع المصفوفة النهائية للزر
    } catch (err) {
      console.error("خطأ في تكامل J&T:", err);
      alert("لم يتم إنشاء الطلبات بسبب خطأ: " + err.message);
      throw err;
    }
  }
  async function loadCryptoJS() {
    if (typeof CryptoJS === "undefined") {
      console.log("جاري تحميل مكتبة CryptoJS...");
      await new Promise((resolve, reject) => {
        const script = document.createElement("script");
        script.src =
          "https://cdnjs.cloudflare.com/ajax/libs/crypto-js/4.2.0/crypto-js.min.js";
        script.onload = () => resolve();
        script.onerror = () => reject(new Error("فشل تحميل مكتبة CryptoJS"));
        document.head.appendChild(script);
      });
      console.log("تم تحميل مكتبة CryptoJS بنجاح!");
    }
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
