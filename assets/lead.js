/* ============================================================
   lead.js — לכידת ליד לקמפיין, משותף לכל דפי הנחיתה
   יעד: אפליקציית CRM קמפיין נפרדת (Base44) · פונקציה receiveLead
   סכמה: name*, phone*, email, project, rooms(Number), purchase_horizon, message, source
   ============================================================ */
(function () {
  "use strict";

  var CONFIG = {
    whatsapp: "972542025700",
    project: "קרן היסוד · מתחם הצעירים",
    leadEndpoint: "https://leadflow.base44.app/api/apps/6a621a13ad33551ddd2b220c/functions/receiveLead",
    videoUrl: "https://res.cloudinary.com/qwjrim41/video/upload/f_auto,q_auto/v1784870055/%D7%99%D7%A9_%D7%A8%D7%92%D7%A2%D7%99%D7%9D_%D7%A9%D7%97%D7%95%D7%95%D7%99%D7%9D_%D7%A8%D7%A7_%D7%A9%D7%92%D7%A8%D7%99%D7%9D_%D7%A7%D7%A8%D7%95%D7%91_ss59uq.mp4",
    allowedRooms: [2.5, 3, 3.5, 4, 4.5, 5]
  };

  var VARIANT_LABEL = {
    "a-warm": "דף A · רגשי",
    "b-clear": "דף B · ענייני",
    "c-direct": "דף C · ישיר",
    "d-video": "דף D · וידאו"
  };

  function digits(s) { return (s || "").replace(/[^\d]/g, ""); }
  function validPhone(p) {
    var d = digits(p);
    return /^(?:9725|05)\d{8}$/.test(d) || (d.length >= 9 && d.length <= 11);
  }
  function val(form, name) {
    var el = form.querySelector('[name="' + name + '"]');
    return el ? el.value.trim() : "";
  }

  function buildSource(variant) {
    var q = new URLSearchParams(location.search);
    var parts = ["landing:" + variant];
    ["utm_source", "utm_campaign", "utm_content", "utm_medium", "utm_term"].forEach(function (k) {
      if (q.get(k)) parts.push(k.replace("utm_", "") + ":" + q.get(k));
    });
    if (q.get("fbclid")) parts.push("meta-ad");
    return parts.join(" | ");
  }

  function waMessage(p, variant) {
    var parts = [];
    if (p.name) parts.push("שמי " + p.name);
    parts.push("הגעתי מדף הנחיתה של " + CONFIG.project + " ורוצה לקבל פרטים על הדירות");
    if (p.rooms) parts.push("מעוניין/ת ב-" + p.rooms + " חדרים");
    if (p.purchase_horizon) parts.push("טווח זמן: " + p.purchase_horizon);
    parts.push(VARIANT_LABEL[variant] || variant);
    parts.push(buildSource(variant));
    return parts.join(". ") + ".";
  }

  function isOk(statusCode) { return statusCode === 201 || statusCode === 409; }

  function postLead(payload) {
    return fetch(CONFIG.leadEndpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      keepalive: true
    });
  }

  function recordLead(payload) {
    return postLead(payload).then(function (r) {
      if (!isOk(r.status)) {
        throw new Error("Lead endpoint returned " + r.status);
      }
      return r.status;
    });
  }

  function sanitizeRoomOptions(form) {
    var select = form.querySelector('[name="rooms"]');
    if (!select) return;
    // נבנה מ-allowedRooms כדי שהרשימה בטופס והסינון בשליחה לא ייפרדו
    var html = '<option value="">מספר חדרים</option>';
    CONFIG.allowedRooms.forEach(function (r) {
      html += '<option value="' + r + '">' + r + ' חדרים</option>';
    });
    select.innerHTML = html;
  }

  function attachCloudinaryVideo() {
    var videos = document.querySelectorAll("video");
    for (var i = 0; i < videos.length; i++) {
      var video = videos[i];
      var current = video.getAttribute("src") || "";
      if (current.indexOf("keren-hayesod-reel-web.mp4") !== -1 || current.indexOf("cloudinary.com/qwjrim41") !== -1) {
        video.src = CONFIG.videoUrl;
        video.setAttribute("playsinline", "");
        video.setAttribute("preload", "metadata");
        video.load();
      }
    }
  }

  function attachDirectWhatsAppLinks() {
    var links = document.querySelectorAll('a[href*="wa.me/972542025700"]');
    for (var i = 0; i < links.length; i++) {
      (function (link) {
        var form = link.closest(".lead") && link.closest(".lead").querySelector("form[data-lead]");
        var variant = form ? form.getAttribute("data-variant") : "direct-link";
        var msg = "הגעתי מקמפיין קרן היסוד ורוצה לקבל פרטים. " + buildSource(variant);
        link.href = "https://wa.me/" + CONFIG.whatsapp + "?text=" + encodeURIComponent(msg);
      })(links[i]);
    }
  }

  function attach(form) {
    sanitizeRoomOptions(form);
    var variant = form.getAttribute("data-variant") || "unknown";
    var status = form.querySelector("[data-lead-status]");
    var submit = form.querySelector('[type="submit"]');

    function say(msg, ok, whatsappUrl) {
      if (status) {
        status.textContent = msg;
        status.dataset.ok = ok ? "1" : "0";
        if (whatsappUrl) {
          var separator = document.createTextNode(" ");
          var link = document.createElement("a");
          link.href = whatsappUrl;
          link.target = "_blank";
          link.rel = "noopener";
          link.textContent = "אפשר לפנות אלינו ב-WhatsApp.";
          status.appendChild(separator);
          status.appendChild(link);
        }
      }
    }

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var name = val(form, "name");
      var phone = val(form, "phone");
      var email = val(form, "email");
      var rooms = val(form, "rooms");
      var timeline = val(form, "timeline");

      if (name.length < 2) {
        say("נא למלא שם מלא", false);
        var ne = form.querySelector('[name="name"]'); if (ne) ne.focus();
        return;
      }
      if (!validPhone(phone)) {
        say("מספר טלפון לא תקין — בדקו ונסו שוב.", false);
        var pe = form.querySelector('[name="phone"]'); if (pe) pe.focus();
        return;
      }

      var payload = {
        name: name,
        phone: phone,
        project: CONFIG.project,
        source: buildSource(variant),
        message: "ליד מדף נחיתה — קרן היסוד · " + location.pathname
      };
      if (email) payload.email = email;
      var roomsNum = parseFloat(rooms);
      if (CONFIG.allowedRooms.indexOf(roomsNum) !== -1) payload.rooms = roomsNum;
      if (timeline) payload.purchase_horizon = timeline;

      if (submit) submit.disabled = true;
      say("שומרים את הפרטים...", true);

      recordLead(payload).then(function () {
        say("מעולה! הפרטים נשמרו — פותחים וואטסאפ.", true);
        var waUrl = "https://wa.me/" + CONFIG.whatsapp + "?text=" + encodeURIComponent(waMessage(payload, variant));
        setTimeout(function () { location.href = waUrl; }, 120);
      }).catch(function () {
        var waUrl = "https://wa.me/" + CONFIG.whatsapp + "?text=" + encodeURIComponent(waMessage(payload, variant));
        say("שליחת הפרטים נכשלה. לא נוצר ליד במערכת. אפשר לנסות שוב או לפנות אלינו ישירות.", false, waUrl);
        if (submit) submit.disabled = false;
      });
    });
  }

  function init() {
    // Remove legacy queued PII. Failed submissions are now reported explicitly
    // and are never represented as successfully stored.
    try { localStorage.removeItem("pendingLeads"); } catch (e) {}
    attachCloudinaryVideo();
    var forms = document.querySelectorAll("form[data-lead]");
    for (var i = 0; i < forms.length; i++) attach(forms[i]);
    attachDirectWhatsAppLinks();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
