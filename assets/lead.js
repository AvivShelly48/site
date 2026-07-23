/* ============================================================
   lead.js — לכידת ליד לקמפיין, משותף לכל דפי הנחיתה
   פעולה כפולה בלחיצה אחת:
     1. רישום הליד ב-CRM (Base44 · submitLead). כישלון → console + תור pendingLeads
     2. פתיחת וואטסאפ עם הודעה מוכנה
   שימוש בדף:  <form data-lead data-variant="a-warm"> ... </form>
   שדות בסכמה: name*, phone*, email, project, rooms, budget, timeline, message, source, status
   ============================================================ */
(function () {
  "use strict";

  var CONFIG = {
    whatsapp: "972542025700",
    project: "קרן היסוד · מתחם הצעירים",
    // מפעיל גם מייל אישור ממותג בעברית כשמצורף email
    leadEndpoint: "https://app.base44.com/api/apps/6831d279a324b0b9eda7a0f4/functions/submitLead"
  };

  var VARIANT_LABEL = {
    "a-warm": "דף A · רגשי", "b-clear": "דף B · ענייני",
    "c-direct": "דף C · ישיר", "d-video": "דף D · וידאו"
  };

  function digits(s) { return (s || "").replace(/[^\d]/g, ""); }
  function validPhone(p) { var d = digits(p); return d.length >= 9 && d.length <= 11; }
  function val(form, name) { var el = form.querySelector('[name="' + name + '"]'); return el ? el.value.trim() : ""; }

  function waMessage(p, variant) {
    var parts = [];
    if (p.name) parts.push("שמי " + p.name);
    parts.push("הגעתי מדף הנחיתה של " + CONFIG.project + " ורוצה לקבל פרטים על הדירות");
    if (p.rooms) parts.push("מעוניין/ת ב-" + p.rooms + " חדרים");
    if (p.timeline) parts.push("טווח זמן: " + p.timeline);
    return parts.join(". ") + ". (" + (VARIANT_LABEL[variant] || variant) + ")";
  }

  function queueBackup(payload, status) {
    try {
      var q = JSON.parse(localStorage.getItem("pendingLeads") || "[]");
      q.push({ payload: payload, at: Date.now(), status: status });
      localStorage.setItem("pendingLeads", JSON.stringify(q));
    } catch (e) { /* localStorage unavailable */ }
  }

  // רישום ל-CRM. לא חוסם את המשתמש; לא בולע כישלון — לא לאבד ליד בשקט.
  function recordLead(payload) {
    fetch(CONFIG.leadEndpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    })
      .then(function (r) {
        if (!r.ok) {
          console.error("lead POST failed", r.status);
          queueBackup(payload, r.status);
        } else {
          console.info("lead POST ok", r.status);
        }
      })
      .catch(function (e) {
        console.error("lead POST error", e);
        queueBackup(payload, "network");
      });
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
      var email = val(form, "email"), rooms = val(form, "rooms"), timeline = val(form, "timeline");

      if (!validPhone(phone)) {
        if (status) { status.textContent = "מספר טלפון לא תקין — בדקו ונסו שוב."; status.dataset.ok = "0"; }
        var pe = form.querySelector('[name="phone"]'); if (pe) pe.focus();
        return;
      }

      // רק שדות מהסכמה; אופציונליים ריקים מושמטים; page מקופל לתוך message
      var payload = {
        name: name,
        phone: phone,
        project: CONFIG.project,
        source: "landing:" + variant,
        status: "חדשה",
        message: "ליד מדף נחיתה — קרן היסוד · " + location.pathname
      };
      if (email) payload.email = email;
      if (rooms) payload.rooms = rooms;
      if (timeline) payload.timeline = timeline;

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
