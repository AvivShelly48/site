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
  var stpEl  = document.getElementById('stp');
  var figure = document.getElementById('heroFig');
  var glCv   = document.getElementById('heroGL');
  var gl3d   = null;

  /* Geometry order is by depth: 0 wall · 1 waterproofing · 2 insulation ·
     3 sub-construction · 4 cavity · 5 panels. That is the cross-section, and
     it is what the assembled state must look like.

     ORDER is something else: the sequence the trades actually work in, taken
     from the installation film — the aluminium goes up on a bare wall and the
     wool is then fitted into the bays between the profiles. So step 3 is the
     sub-construction and step 4 is the insulation, even though the insulation
     ends up behind it. Section order and installation order are two different
     true statements about the same wall; the hero animates the second.        */
  var TX    = [0.0, -72.5, -162.2, -236.5, -314.4, -395.0];
  var TY    = [0.0, -33.8,  -75.7, -110.4, -146.8, -184.4];
  var ORDER = [0, 1, 3, 2, 4, 5];        /* geometry index per install step */
  var CAVITY = 4;

  /* The stack assembles onto layer 0, which sits in a corner of the frame.
     A fixed rig offset centres the finished wall; it no longer animates,
     because the composition is anchored on the wall the whole way through. */
  var RIGX = 197, RIGY = 63;

  /* Layers wait off-frame down the depth axis and fly in on their turn, the
     way the installation film shows them arriving — rather than sitting in a
     queue inside the frame, where a parked layer lands exactly on top of the
     spot the next one is being fixed to. */
  var WAITX = 489, WAITY = 228;

  /* Step 0 is the substrate — it is already standing. The other five arrive
     one at a time, each over its own slice of the scroll, slightly overlapped
     so the sequence reads as continuous rather than as five separate jumps. */
  var SLOT0 = 0.02, SLOTGAP = 0.1845, SLOTLEN = 0.24;

  var stepOf = [];
  for (var q = 0; q < ORDER.length; q++) stepOf[ORDER[q]] = q;

  function ease(t) { return t * t * (3 - 2 * t); }

  function arrival(step, p) {
    if (step === 0) return 1;
    var t = (p - (SLOT0 + (step - 1) * SLOTGAP)) / SLOTLEN;
    return ease(Math.min(1, Math.max(0, t)));
  }

  var ticking = false, lastState = '', lastPct = -1, lastStep = -1;

  function apply(p) {
    for (var i = 0; i < layers.length; i++) {
      var g = +layers[i].getAttribute('data-i');
      var e = arrival(stepOf[g], p);
      var w = 1 - e;
      layers[i].setAttribute('transform',
        'translate(' + (TX[g] + WAITX * w) + ',' + (TY[g] + WAITY * w) + ')');
      layers[i].style.opacity = Math.min(1, e * 3);
    }

    /* the airflow belongs to the cavity but paints last so it stays legible
       over the panels — and it only means anything once they have closed it */
    if (air) {
      var cav = arrival(stepOf[CAVITY], p);
      air.setAttribute('transform',
        'translate(' + (TX[CAVITY] + WAITX * (1 - cav)) + ',' + (TY[CAVITY] + WAITY * (1 - cav)) + ')');
      air.style.opacity = arrival(stepOf[5], p) > 0.5 ? '1' : '0';
    }

    /* at rest the whole legend is readable; once assembly starts it lights
       step by step, so the system is learned in the order it is built */
    if (gl3d) gl3d.render(p, function (step) { return arrival(step, p); });

    var atRest = p < 0.03;
    for (var j = 0; j < legs.length; j++) legs[j].classList.toggle('on', atRest || arrival(j, p) > 0);

    var step = 1;
    for (var k = 1; k < ORDER.length; k++) if (arrival(k, p) > 0) step = k + 1;
    if (step !== lastStep) { stpEl.textContent = ('0' + step).slice(-2); lastStep = step; }

    var s = p > 0.97 ? 'מורכב' : (p > 0.03 ? 'מתכנס' : 'מפורק');
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
    /* Try the rendered hero; the vector one stays in place if this fails.
       The class goes on first — the canvas is display:none until it does, and
       a hidden canvas measures itself as zero and comes up 1x1. */
    if (glCv && window.SELA_HERO3D) {
      figure.classList.add('gl');
      var up = false;
      try { up = window.SELA_HERO3D.init(glCv); } catch (err) { up = false; }
      if (up) { gl3d = window.SELA_HERO3D; gl3d.resize(); }
      else { figure.classList.remove('gl'); }
    }
    frame();
    addEventListener('scroll', onScroll, { passive: true });
    addEventListener('resize', function () { if (gl3d) gl3d.resize(); onScroll(); });
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
