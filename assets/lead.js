/* ============================================================
   lead.js — לכידת ליד לקמפיין, משותף לכל דפי הנחיתה
   פעולה כפולה בלחיצה אחת:
     1. רישום הליד ב-CRM (Base44 · submitLead) — עם גיבוי localStorage
     2. פתיחת וואטסאפ עם הודעה מוכנה
   שימוש בדף:  <form data-lead data-variant="a-warm"> ... </form>
   שדות בטופס:  name (חובה) · phone (חובה) · email · rooms · timeline
   ============================================================ */
(function () {
  "use strict";

  var CONFIG = {
    whatsapp: "972542025700",
    project: "קרן היסוד · מתחם הצעירים",
    // פונקציית קליטת לידים ב-Base44 (מפעילה גם מייל אישור ממותג כשיש email)
    leadEndpoint: "https://app.base44.com/api/apps/6831d279a324b0b9eda7a0f4/functions/submitLead"
  };

  var VARIANT_LABEL = {
    "a-warm": "דף A · רגשי", "b-clear": "דף B · ענייני",
    "c-direct": "דף C · ישיר", "d-video": "דף D · וידאו"
  };

  function digits(s) { return (s || "").replace(/[^\d]/g, ""); }
  function validPhone(p) { var d = digits(p); return d.length >= 9 && d.length <= 11; }
  function val(form, name) { var el = form.querySelector('[name="' + name + '"]'); return el ? el.value.trim() : ""; }

  function waMessage(payload, variant) {
    var parts = [];
    if (payload.name) parts.push("שמי " + payload.name);
    parts.push("הגעתי מדף הנחיתה של " + CONFIG.project + " ורוצה לקבל פרטים על הדירות");
    if (payload.rooms) parts.push("מעוניין/ת ב-" + payload.rooms + " חדרים");
    if (payload.timeline) parts.push("טווח זמן: " + payload.timeline);
    return parts.join(". ") + ". (" + (VARIANT_LABEL[variant] || variant) + ")";
  }

  function saveBackup(payload, reason) {
    try {
      var KEY = "shelly_lead_backup";
      var arr = JSON.parse(localStorage.getItem(KEY) || "[]");
      arr.push({ payload: payload, reason: reason, at: new Date().toISOString() });
      localStorage.setItem(KEY, JSON.stringify(arr));
    } catch (e) { /* localStorage unavailable */ }
  }

  function recordLead(payload) {
    // רישום ל-CRM. לא חוסם את הוואטסאפ. הצלחה = 201; אחרת console + גיבוי.
    try {
      fetch(CONFIG.leadEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      }).then(function (res) {
        if (res.status !== 201) {
          console.error("[lead] submitLead returned HTTP " + res.status + " (expected 201) — lead saved to localStorage backup", payload);
          saveBackup(payload, "http_" + res.status);
        } else {
          console.info("[lead] submitLead OK (201)");
        }
      }).catch(function (err) {
        console.error("[lead] submitLead network error — lead saved to localStorage backup", err, payload);
        saveBackup(payload, "network");
      });
    } catch (e) {
      console.error("[lead] submitLead threw — lead saved to localStorage backup", e, payload);
      saveBackup(payload, "exception");
    }
  }

  function openWhatsApp(payload, variant) {
    var url = "https://wa.me/" + CONFIG.whatsapp + "?text=" + encodeURIComponent(waMessage(payload, variant));
    window.open(url, "_blank", "noopener");
  }

  function attach(form) {
    var variant = form.getAttribute("data-variant") || "unknown";
    var status = form.querySelector("[data-lead-status]");

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var name = val(form, "name"), phone = val(form, "phone");

      if (!validPhone(phone)) {
        if (status) { status.textContent = "מספר טלפון לא תקין — בדקו ונסו שוב."; status.dataset.ok = "0"; }
        var pe = form.querySelector('[name="phone"]'); if (pe) pe.focus();
        return;
      }

      var payload = {
        name: name,
        phone: phone,
        email: val(form, "email"),
        rooms: val(form, "rooms"),
        timeline: val(form, "timeline"),
        project: CONFIG.project,
        source: "landing:" + variant,
        status: "חדשה",
        message: "ליד מדף נחיתה — קרן היסוד",
        page: location.pathname
      };

      recordLead(payload);

      if (status) { status.textContent = "מעולה! פותחים וואטסאפ — נחזור אליכם מיד."; status.dataset.ok = "1"; }
      openWhatsApp(payload, variant);
      form.reset();
    });
  }

  function init() {
    var forms = document.querySelectorAll("form[data-lead]");
    for (var i = 0; i < forms.length; i++) attach(forms[i]);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
