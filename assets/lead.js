/* ============================================================
   lead.js — לכידת ליד לקמפיין, משותף לכל דפי הנחיתה
   פעולה כפולה בלחיצה אחת:
     1. רישום הליד ב-CRM (Base44 · ישות Lead) — best-effort
     2. פתיחת וואטסאפ עם הודעה מוכנה
   שימוש בדף:  <form data-lead data-variant="a-warm"> ... </form>
   שדות נדרשים בטופס:  name="name"  name="phone"
   ============================================================ */
(function () {
  "use strict";

  var CONFIG = {
    whatsapp: "972542025700",                 // מספר לקבלת לידים
    project: "קרן היסוד · מתחם הצעירים",
    // נקודת קצה לרישום ב-CRM. best-effort: אם לא זמין, הוואטסאפ עדיין נפתח.
    leadEndpoint: "https://app.base44.com/api/apps/6831d279a324b0b9eda7a0f4/functions/intakeLead"
  };

  var VARIANT_LABEL = {
    "a-warm":   "דף A · רגשי",
    "b-clear":  "דף B · ענייני",
    "c-direct": "דף C · ישיר",
    "d-video":  "דף D · וידאו"
  };

  function digits(s) { return (s || "").replace(/[^\d]/g, ""); }

  function validPhone(p) {
    var d = digits(p);
    return d.length >= 9 && d.length <= 11;   // נייד ישראלי
  }

  function waMessage(name, variant) {
    var who = name ? ("שמי " + name + ". ") : "";
    return who + "הגעתי מדף הנחיתה של " + CONFIG.project +
      " ורוצה לקבל פרטים על הדירות. (" + (VARIANT_LABEL[variant] || variant) + ")";
  }

  function recordLead(payload) {
    // רישום ל-CRM ברקע. לא חוסם את חוויית המשתמש; נכשל בשקט אם המנוע לא זמין.
    try {
      fetch(CONFIG.leadEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        keepalive: true,
        mode: "cors"
      }).catch(function () {});
    } catch (e) { /* ignore */ }
  }

  function openWhatsApp(name, variant) {
    var url = "https://wa.me/" + CONFIG.whatsapp +
      "?text=" + encodeURIComponent(waMessage(name, variant));
    window.open(url, "_blank", "noopener");
  }

  function attach(form) {
    var variant = form.getAttribute("data-variant") || "unknown";
    var status = form.querySelector("[data-lead-status]");

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var name = (form.querySelector('[name="name"]') || {}).value || "";
      var phoneEl = form.querySelector('[name="phone"]');
      var phone = (phoneEl || {}).value || "";
      name = name.trim(); phone = phone.trim();

      if (!validPhone(phone)) {
        if (status) { status.textContent = "מספר טלפון לא תקין — בדקו ונסו שוב."; status.dataset.ok = "0"; }
        if (phoneEl) phoneEl.focus();
        return;
      }

      recordLead({
        name: name,
        phone: phone,
        project: CONFIG.project,
        source: "landing:" + variant,
        status: "חדשה",
        timeline: "",
        message: "ליד מדף נחיתה — קרן היסוד",
        page: location.pathname
      });

      if (status) { status.textContent = "מעולה! פותחים וואטסאפ — נחזור אליכם מיד."; status.dataset.ok = "1"; }
      openWhatsApp(name, variant);
      form.reset();
    });
  }

  function init() {
    var forms = document.querySelectorAll("form[data-lead]");
    for (var i = 0; i < forms.length; i++) attach(forms[i]);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else { init(); }
})();
