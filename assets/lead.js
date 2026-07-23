/* ============================================================
   lead.js — לכידת ליד לקמפיין, משותף לכל דפי הנחיתה
   יעד: אפליקציית CRM קמפיין נפרדת (Base44) · פונקציה receiveLead
   סכמה: name*, phone*, email, project, rooms(Number), purchase_horizon, message, source
   בלחיצה: (1) POST ל-CRM (keepalive, גיבוי pendingLeads)  (2) מעבר לוואטסאפ
   שימוש בדף:  <form data-lead data-variant="a-warm"> ... </form>
   ============================================================ */
(function () {
  "use strict";

  var CONFIG = {
    whatsapp: "972542025700",
    project: "קרן היסוד · מתחם הצעירים",
    // CRM קמפיין (אפליקציה נפרדת) — לא המערכת הראשית
    leadEndpoint: "https://app.base44.com/api/apps/6a621a13ad33551ddd2b220c/functions/receiveLead"
  };

  var VARIANT_LABEL = {
    "a-warm": "דף A · רגשי", "b-clear": "דף B · ענייני",
    "c-direct": "דף C · ישיר", "d-video": "דף D · וידאו"
  };

  function digits(s) { return (s || "").replace(/[^\d]/g, ""); }
  function validPhone(p) { var d = digits(p); return d.length >= 9 && d.length <= 11; }
  function val(form, name) { var el = form.querySelector('[name="' + name + '"]'); return el ? el.value.trim() : ""; }

  // מקור מדיד: משלב את גרסת הדף עם פרמטרי UTM/מודעה מה-URL
  function buildSource(variant) {
    var q = new URLSearchParams(location.search);
    var parts = ["landing:" + variant];
    ["utm_source", "utm_campaign", "utm_content", "utm_medium"].forEach(function (k) {
      if (q.get(k)) parts.push(q.get(k));
    });
    if (q.get("fbclid") && parts.length === 1) parts.push("meta-ad");
    return parts.join(" | ");
  }

  function waMessage(p, variant) {
    var parts = [];
    if (p.name) parts.push("שמי " + p.name);
    parts.push("הגעתי מדף הנחיתה של " + CONFIG.project + " ורוצה לקבל פרטים על הדירות");
    if (p.rooms) parts.push("מעוניין/ת ב-" + p.rooms + " חדרים");
    if (p.purchase_horizon) parts.push("טווח זמן: " + p.purchase_horizon);
    return parts.join(". ") + ". (" + (VARIANT_LABEL[variant] || variant) + ")";
  }

  function queueBackup(payload, status) {
    try {
      var q = JSON.parse(localStorage.getItem("pendingLeads") || "[]");
      q.push({ payload: payload, at: Date.now(), status: status });
      localStorage.setItem("pendingLeads", JSON.stringify(q));
    } catch (e) { /* localStorage unavailable */ }
  }

  // ok = 201 (נשמר) או 409 (כפילות — הקודם כבר נשמר)
  function isOk(statusCode) { return statusCode === 201 || statusCode === 409; }

  function recordLead(payload) {
    fetch(CONFIG.leadEndpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      keepalive: true
    })
      .then(function (r) {
        if (isOk(r.status)) {
          console.info("lead POST ok", r.status);
        } else {
          console.error("lead POST failed", r.status);
          queueBackup(payload, r.status);
        }
      })
      .catch(function (e) {
        console.error("lead POST error", e);
        queueBackup(payload, "network");
      });
  }

  // ניסיון חוזר לשליחת לידים שנשמרו בגיבוי (למשל אחרי ניתוק רשת)
  function flushQueue() {
    var q;
    try { q = JSON.parse(localStorage.getItem("pendingLeads") || "[]"); }
    catch (e) { return; }
    if (!q.length) return;

    var left = [];
    var done = 0;
    q.forEach(function (item) {
      fetch(CONFIG.leadEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(item.payload)
      })
        .then(function (r) { if (!isOk(r.status)) left.push(item); })
        .catch(function () { left.push(item); })
        .finally(function () {
          if (++done === q.length) localStorage.setItem("pendingLeads", JSON.stringify(left));
        });
    });
  }

  function attach(form) {
    var variant = form.getAttribute("data-variant") || "unknown";
    var status = form.querySelector("[data-lead-status]");
    function say(msg, ok) { if (status) { status.textContent = msg; status.dataset.ok = ok ? "1" : "0"; } }

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var name = val(form, "name"), phone = val(form, "phone");
      var email = val(form, "email"), rooms = val(form, "rooms"), timeline = val(form, "timeline");

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
      var roomsNum = parseInt(rooms, 10);           // "5+" → 5 · "" → NaN (מושמט)
      if (!isNaN(roomsNum)) payload.rooms = roomsNum;
      if (timeline) payload.purchase_horizon = timeline;

      recordLead(payload);
      say("מעולה! פותחים וואטסאפ — נחזור אליכם מיד.", true);

      // מעבר במקום window.open (ספארי בנייד חוסם חלונות שלא מלחיצה ישירה)
      var waUrl = "https://wa.me/" + CONFIG.whatsapp + "?text=" + encodeURIComponent(waMessage(payload, variant));
      setTimeout(function () { location.href = waUrl; }, 350);
    });
  }

  function init() {
    flushQueue();
    var forms = document.querySelectorAll("form[data-lead]");
    for (var i = 0; i < forms.length; i++) attach(forms[i]);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
