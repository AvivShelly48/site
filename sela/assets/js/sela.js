/* ============================================================================
   SELA FAÇADE — page behaviour
   No runtime dependencies. Shares nothing with the shellygroup.co.il site.

   The hero is the one big motion on this site (§3.4). Everything here that
   touches it runs inside a single rAF-throttled frame, writes only transforms,
   and never reads layout after writing — the 60fps target in §4.2 is the
   constraint the whole file is shaped around.
   ========================================================================= */
(function () {
  'use strict';

  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ------------------------------------------------------------ hero ---- */
  var hero   = document.querySelector('.hero');
  var nav    = document.getElementById('nav');
  var prog   = document.getElementById('prog');
  var layers = [].slice.call(document.querySelectorAll('.ly'));
  var legs   = [].slice.call(document.querySelectorAll('.lg'));
  var air    = document.getElementById('airflow');
  var rig    = document.getElementById('rig');
  var stateEl= document.getElementById('state');
  var pctEl  = document.getElementById('pct');

  /* Per-layer travel from the exploded position to the assembled one, along
     the diagram's depth axis. The six layers do not collapse onto one point —
     each lands flush on the back of the previous, so the build-up closes into
     a real section and the ventilated cavity survives to 100%.
     Order follows catalogue page 05: wall · waterproofing · insulation ·
     sub-construction · cavity · panels. Generated with the geometry, not by
     hand — see scratchpad/gen/iso.py. */
  var TX = [0.0, -72.5, -162.2, -236.5, -314.4, -395.0];
  var TY = [0.0, -33.8,  -75.7, -110.4, -146.8, -184.4];
  var CAVITY = 4;                  /* the airflow rides this layer */

  /* The stack converges onto layer 0, which parks the finished wall hard
     against one corner of the frame. The rig drifts the opposite way as it
     closes so the assembled section lands centred instead. */
  var RIGX = 197, RIGY = 63;

  var ticking = false, lastState = '', lastPct = -1;

  function apply(p) {
    for (var i = 0; i < layers.length; i++) {
      var k = +layers[i].getAttribute('data-i');
      layers[i].setAttribute('transform', 'translate(' + (TX[k] * p) + ',' + (TY[k] * p) + ')');
    }

    /* the airflow belongs to the cavity but must paint above the panels to
       stay legible, so it is moved by hand rather than parented into it */
    if (air) {
      air.setAttribute('transform', 'translate(' + (TX[CAVITY] * p) + ',' + (TY[CAVITY] * p) + ')');
      air.style.opacity = p > 0.84 ? '1' : '0';
    }

    if (rig) rig.setAttribute('transform', 'translate(' + (RIGX * p) + ',' + (RIGY * p) + ')');

    var lit = Math.floor(p * (legs.length + 1));
    for (var j = 0; j < legs.length; j++) legs[j].classList.toggle('on', p < 0.05 || j < lit);

    var s = p > 0.93 ? 'מורכב' : (p > 0.05 ? 'מתכנס' : 'מפורק');
    if (s !== lastState) { stateEl.textContent = s; lastState = s; }

    var n = Math.round(p * 100);
    if (n !== lastPct) { pctEl.textContent = ('00' + n).slice(-3); lastPct = n; }
  }

  function frame() {
    /* one rect read, and height comes from it too: offsetHeight is rounded to
       whole pixels, which leaves the readout short of 100% at the end of the
       scroll range on viewports where 270vh is fractional */
    var r    = hero.getBoundingClientRect();
    var span = r.height - innerHeight;
    var p    = span > 0 ? Math.min(1, Math.max(0, -r.top / span)) : 0;

    apply(p);
    nav.classList.toggle('solid', -r.top > span * 0.62);

    var d = document.documentElement;
    prog.style.width = (scrollY / (d.scrollHeight - innerHeight) * 100) + '%';
    ticking = false;
  }

  function onScroll() { if (!ticking) { ticking = true; requestAnimationFrame(frame); } }

  if (reduce) {
    /* the assembled section is the more informative still — it is the finished
       wall, and the air arrow only reads once the cavity has closed */
    apply(1);
    legs.forEach(function (l) { l.classList.add('on'); });
    nav.classList.add('solid');
  } else {
    frame();
    addEventListener('scroll', onScroll, { passive: true });
    addEventListener('resize', onScroll);
  }

  /* --------------------------------------------------------- reveal ----- */
  if ('IntersectionObserver' in window && !reduce) {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (!e.isIntersecting) return;
        e.target.classList.add('in');
        io.unobserve(e.target);
      });
    }, { threshold: 0.1 });
    document.querySelectorAll('.rev').forEach(function (el) { io.observe(el); });
  } else {
    document.querySelectorAll('.rev').forEach(function (el) { el.classList.add('in'); });
  }

  /* -------------------------------------------------------- counters ---- */
  var counters = document.querySelectorAll('.cnt');
  if ('IntersectionObserver' in window && !reduce) {
    var cio = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (!e.isIntersecting) return;
        cio.unobserve(e.target);
        var to = +e.target.getAttribute('data-to'), t0 = null, dur = 1100;
        if (to === 0) { e.target.textContent = '0'; return; }
        requestAnimationFrame(function step(t) {
          if (!t0) t0 = t;
          var k = Math.min(1, (t - t0) / dur);
          e.target.textContent = Math.round(to * (1 - Math.pow(1 - k, 3)));
          if (k < 1) requestAnimationFrame(step);
        });
      });
    }, { threshold: 0.5 });
    counters.forEach(function (el) { cio.observe(el); });
  } else {
    counters.forEach(function (el) { el.textContent = el.getAttribute('data-to'); });
  }

  /* ---------------------------------------------------- mobile menu ----- */
  var burger = document.getElementById('burger');
  var menu   = document.getElementById('menu');

  function setMenu(open) {
    burger.setAttribute('aria-expanded', String(open));
    burger.setAttribute('aria-label', open ? 'סגירת תפריט' : 'פתיחת תפריט');
    if (open) menu.hidden = false;
    requestAnimationFrame(function () { menu.classList.toggle('open', open); });
    if (!open) setTimeout(function () { if (!menu.classList.contains('open')) menu.hidden = true; }, 360);
    document.body.style.overflow = open ? 'hidden' : '';
  }

  burger.addEventListener('click', function () {
    setMenu(burger.getAttribute('aria-expanded') !== 'true');
  });
  menu.addEventListener('click', function (e) { if (e.target.tagName === 'A') setMenu(false); });
  addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && burger.getAttribute('aria-expanded') === 'true') { setMenu(false); burger.focus(); }
  });

  /* ------------------------------------------------- lead segmentation -- */
  /* Each audience asks a different question (§2), so the copy beside the form
     and the links offered change with the selection. */
  var SEG = {
    contractor: {
      note: 'קצב ותפוקה. מי מנהל את העבודה באתר, מה התפוקה היומית, מה קורה כשלוח נשבר — ואיך נראה תיק המסירה בסוף.',
      links: [['הדרך לחזית — חמשת השלבים', '#process']]
    },
    developer: {
      note: 'עלות לאורך זמן. עמידות, תחזוקה, החלפה נקודתית — וב-BIPV גם מה שהחזית מחזירה במקום רק לעלות.',
      links: [['BIPV — החזית שמייצרת חשמל', '#bipv']]
    },
    architect: {
      note: 'מידות, עוביים, גוונים ופרטי פינה. צרפו תוכנית או חזית ותקבלו פרט תכנוני — לא הצעת מחיר גנרית.',
      links: [['טבלת נתוני מוצר מלאה', '#product'], ['פרטי תכנון · DWG — טרם הועלו', null]]
    }
  };

  var segNote  = document.getElementById('segNote');
  var segLinks = document.getElementById('segLinks');
  var segField = document.getElementById('segField');
  var segBtns  = [].slice.call(document.querySelectorAll('.seg button'));

  function renderSeg(key) {
    var cfg = SEG[key];
    if (!cfg) return;
    segNote.textContent = cfg.note;
    segLinks.innerHTML = cfg.links.map(function (l) {
      return l[1] ? '<a href="' + l[1] + '" style="border-bottom:1px solid var(--gold)">' + l[0] + '</a>'
                  : '<span>' + l[0] + '</span>';
    }).join(' · ');
    segField.value = key;
    segBtns.forEach(function (b) {
      b.setAttribute('aria-pressed', String(b.getAttribute('data-seg') === key));
    });
  }

  segBtns.forEach(function (b) {
    b.addEventListener('click', function () { renderSeg(b.getAttribute('data-seg')); });
  });
  renderSeg('architect');

  /* The destination is still undecided (§8, blocker #4). Until it is wired,
     fail loudly rather than swallowing a real enquiry. */
  document.getElementById('leadForm').addEventListener('submit', function (e) {
    e.preventDefault();
    alert('הטופס אינו מחובר עדיין ליעד. יש להגדיר מייל, CRM או מאנדיי לפני עלייה לאוויר.');
  });
})();
