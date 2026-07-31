/* ============================================================
   NORMA — page behaviour
   No dependencies. No shared code with the shellygroup.co.il site.
   ============================================================ */
(function () {
  'use strict';

  var fmt = function (n, d) {
    return n.toLocaleString('en-US', {
      minimumFractionDigits: d === undefined ? 0 : d,
      maximumFractionDigits: d === undefined ? 0 : d
    });
  };

  /* ---------- nav: solid background after first scroll ---------- */
  var nav = document.getElementById('nav');
  var onScroll = function () {
    nav.classList.toggle('stuck', window.scrollY > 24);
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* ---------- reveal on enter ---------- */
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        e.target.classList.add('in');
        io.unobserve(e.target);
      });
    }, { threshold: 0.18, rootMargin: '0px 0px -40px' });
    document.querySelectorAll('.rv').forEach(function (el, i) {
      el.style.transitionDelay = (i % 3) * 90 + 'ms';
      io.observe(el);
    });
  } else {
    document.querySelectorAll('.rv').forEach(function (el) { el.classList.add('in'); });
  }

  /* ---------- hero gauge: fill the bars once visible ---------- */
  var gauge = document.getElementById('gauge');
  if (gauge) {
    var fillBars = function () {
      gauge.querySelectorAll('.bar__fill').forEach(function (f) {
        f.style.width = f.getAttribute('data-w') + '%';
      });
    };
    if ('IntersectionObserver' in window) {
      var gio = new IntersectionObserver(function (entries) {
        if (entries[0].isIntersecting) { fillBars(); gio.disconnect(); }
      }, { threshold: 0.35 });
      gio.observe(gauge);
    } else {
      fillBars();
    }
  }

  /* ---------- the norm calculator ----------
     norm × thickness × price = material estimate per work unit.
     Then: actual purchased ÷ work quantity = actual consumption, and the
     difference against the norm is the waste — the calculation from the spec. */
  var el = function (id) { return document.getElementById(id); };
  var itemSel = el('c-item');

  if (itemSel) {
    var thick   = el('c-thick');
    var price   = el('c-price');
    var area    = el('c-area');
    var actual  = el('c-actual');
    var WASTE_PCT = 5;

    var parse = function () {
      var p = itemSel.value.split('|');
      return {
        norm: parseFloat(p[0]),          // qty per work unit (per mm if usesThickness)
        price: parseFloat(p[1]),         // ₪ per material unit
        unit: p[2],                      // display unit of the norm
        usesThickness: p[3] === '1'
      };
    };

    var materialUnit = function (spec) {
      return spec.unit.indexOf('יח') === 0 ? 'יח׳' : 'ק״ג';
    };

    var num = function (input, fallback) {
      var v = parseFloat(input.value);
      return isFinite(v) && v >= 0 ? v : fallback;
    };

    var render = function () {
      var spec = parse();
      var mm   = parseFloat(thick.value);
      var pr   = num(price, 0);
      var ar   = num(area, 0);
      var act  = num(actual, 0);
      var mu   = materialUnit(spec);

      /* thickness only applies to materials whose norm is stated per mm */
      el('c-thick-field').style.display = spec.usesThickness ? '' : 'none';
      el('c-thick-v').textContent = mm + ' מ״מ';
      el('c-unit-lbl').textContent = mu;

      var perM2       = spec.usesThickness ? spec.norm * mm : spec.norm;
      var perM2Waste  = perM2 * (1 + WASTE_PCT / 100);
      var shekelPerM2 = perM2 * pr;
      var projectQty  = perM2Waste * ar;
      var projectCost = projectQty * pr;

      /* each numeral is its own isolated LTR run — a single mixed string
         gets reordered by the bidi algorithm and reads scrambled */
      var n = function (v, d) { return '<span class="num">' + fmt(v, d) + '</span>'; };

      el('o-perm2').innerHTML     = n(perM2, 2) + ' ' + mu + '/מ״ר';
      el('o-withwaste').innerHTML = n(perM2Waste, 2) + ' ' + mu + '/מ״ר';
      el('o-total').innerHTML     = n(projectQty, 0) + ' ' + mu + ' · ' + n(projectCost, 0) + ' ₪';
      el('o-big').textContent     = fmt(shekelPerM2, 2);

      /* the equation stays in Latin units — Hebrew inside an LTR formula
         gets reordered by the bidi algorithm and reads scrambled */
      var uSym = mu === 'יח׳' ? 'un' : 'kg';
      el('o-eq').textContent = spec.usesThickness
        ? fmt(spec.norm, 1) + ' ' + uSym + '/m²/mm  ×  ' + mm + ' mm  ×  ' + fmt(pr, 2) + ' ₪  =  ' + fmt(shekelPerM2, 2) + ' ₪/m²'
        : fmt(spec.norm, 1) + ' ' + uSym + '/m²  ×  ' + fmt(pr, 2) + ' ₪  =  ' + fmt(shekelPerM2, 2) + ' ₪/m²';

      /* verdict: actual consumption vs. the norm, over the same work quantity */
      var v = el('o-verdict');
      if (!ar || !act) {
        v.className = 'verdict verdict--ok';
        v.textContent = 'הזן שטח עבודה וכמות שנרכשה כדי לראות את הפחת בפועל.';
        return;
      }
      var actualPerM2 = act / ar;
      var deltaPct    = perM2 > 0 ? ((actualPerM2 / perM2) - 1) * 100 : 0;
      var excessQty   = act - perM2Waste * ar;
      var excessCost  = excessQty * pr;

      /* units live outside <b> so each bold run is a bare numeral */
      if (deltaPct > WASTE_PCT) {
        v.className = 'verdict verdict--bad';
        v.innerHTML = 'צריכה בפועל <b>' + fmt(actualPerM2, 2) + '</b> ' + mu + '/מ״ר — חריגה של <b>' +
          fmt(deltaPct, 0) + '%</b> מעל הנורמה. עודף <b>' + fmt(excessQty, 0) + '</b> ' + mu +
          ' = <b>' + fmt(excessCost, 0) + '</b> ₪ בסעיף הזה.';
      } else {
        v.className = 'verdict verdict--ok';
        v.innerHTML = 'צריכה בפועל <b>' + fmt(actualPerM2, 2) + '</b> ' + mu +
          '/מ״ר — בתוך הנורמה ופחת מוכר. אין חריגה לתחקר.';
      }
    };

    /* selecting a different item pulls its book price with it */
    itemSel.addEventListener('change', function () {
      price.value = parse().price.toFixed(2);
      render();
    });
    [thick, price, area, actual].forEach(function (i) {
      i.addEventListener('input', render);
    });
    render();
  }
})();
