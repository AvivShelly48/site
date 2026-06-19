/* ============================================================
   SHELLY URBAN — Accessibility toolkit (ת"י 5568 / WCAG 2.0 AA)
   Self-contained: injects skip-link, focus styles, and an
   accessibility widget. Include once per page:
     <script src="assets/a11y.js" defer></script>
   ============================================================ */
(function(){
  "use strict";
  var KEY="shelly-a11y";
  var state={scale:1, contrast:false, links:false, font:false, motion:false};
  try{ var s=JSON.parse(localStorage.getItem(KEY)); if(s) state=Object.assign(state,s); }catch(e){}

  /* ---------- styles ---------- */
  var css=''
  + '.a11y-skip{position:fixed;top:-60px;inset-inline-start:12px;z-index:100000;background:#17151a;color:#fff;'
  +   'padding:12px 20px;border-radius:0 0 8px 8px;font:600 15px/1 Heebo,system-ui,sans-serif;transition:top .2s;}'
  + '.a11y-skip:focus{top:0;outline:3px solid #84bf52;outline-offset:2px;}'
  + ':focus-visible{outline:3px solid #0a66c2 !important;outline-offset:2px !important;border-radius:2px;}'
  + 'body.a11y-contrast{--ink:#000;--ink-dim:#161616;--ink-faint:#333;--green-deep:#1f5d00;}'
  + 'body.a11y-contrast a{text-decoration:underline;}'
  + 'body.a11y-contrast .hero .bgimg::after{background:rgba(12,10,14,.9) !important;}'
  + 'body.a11y-links a{text-decoration:underline !important;}'
  + 'body.a11y-font, body.a11y-font *{font-family:Arial,"Heebo",system-ui,sans-serif !important;letter-spacing:normal !important;}'
  + 'body.a11y-motion *{animation:none !important;transition:none !important;scroll-behavior:auto !important;}'
  /* widget */
  + '.a11y-fab{position:fixed;inset-block-end:18px;inset-inline-start:18px;z-index:99990;width:52px;height:52px;border-radius:50%;'
  +   'background:#17151a;color:#fff;border:2px solid #84bf52;display:grid;place-items:center;font-size:24px;cursor:pointer;'
  +   'box-shadow:0 10px 28px -10px rgba(0,0,0,.5);transition:transform .25s,background .25s;}'
  + '.a11y-fab:hover{transform:scale(1.07);background:#2c2a30;}'
  + '.a11y-panel{position:fixed;inset-block-end:80px;inset-inline-start:18px;z-index:99991;width:288px;max-width:calc(100vw - 36px);'
  +   'background:#fff;color:#17151a;border-radius:16px;box-shadow:0 26px 60px -20px rgba(0,0,0,.45);'
  +   'border:1px solid rgba(0,0,0,.1);padding:16px;display:none;font-family:Heebo,system-ui,sans-serif;}'
  + '.a11y-panel.open{display:block;}'
  + '.a11y-panel h2{font-size:15px;font-weight:700;margin:0 0 4px;}'
  + '.a11y-panel .sub{font-size:11.5px;color:#6b675f;margin-bottom:12px;}'
  + '.a11y-row{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:8px;}'
  + '.a11y-btn{flex:1;background:#f1efea;border:1px solid rgba(0,0,0,.1);border-radius:10px;padding:11px 10px;'
  +   'font:600 13.5px/1.2 Heebo,system-ui,sans-serif;color:#17151a;cursor:pointer;text-align:center;transition:.2s;}'
  + '.a11y-btn:hover{background:#e7e2d8;}'
  + '.a11y-btn[aria-pressed="true"]{background:#5f9c36;color:#fff;border-color:#447327;}'
  + '.a11y-stepper{display:flex;align-items:center;gap:6px;}'
  + '.a11y-stepper button{width:40px;height:40px;border-radius:10px;border:1px solid rgba(0,0,0,.1);background:#f1efea;'
  +   'font:700 18px Heebo,sans-serif;cursor:pointer;}'
  + '.a11y-stepper button:hover{background:#e7e2d8;}'
  + '.a11y-stepper .val{flex:1;text-align:center;font:600 13px Heebo,sans-serif;}'
  + '.a11y-reset{width:100%;background:#17151a;color:#fff;border:none;border-radius:10px;padding:11px;'
  +   'font:600 13.5px Heebo,sans-serif;cursor:pointer;margin-top:4px;}'
  + '.a11y-state{display:block;text-align:center;font-size:12px;color:#447327;margin-top:10px;text-decoration:underline;}'
  + '@media(prefers-reduced-motion:reduce){.a11y-fab,.a11y-panel{transition:none;}}';
  var st=document.createElement('style'); st.id='a11y-style'; st.textContent=css;
  document.head.appendChild(st);

  /* ---------- skip link + main landmark ---------- */
  var skip=document.createElement('a');
  skip.className='a11y-skip'; skip.href='#a11y-main'; skip.textContent='דילוג לתוכן';
  document.body.insertBefore(skip, document.body.firstChild);
  var main=document.querySelector('main, header.hero, .cinema, section');
  if(main){ if(!main.id) main.id='a11y-main'; else skip.href='#'+main.id; main.setAttribute('tabindex','-1'); }

  /* ---------- apply state ---------- */
  function apply(){
    var b=document.body;
    b.classList.toggle('a11y-contrast', state.contrast);
    b.classList.toggle('a11y-links', state.links);
    b.classList.toggle('a11y-font', state.font);
    b.classList.toggle('a11y-motion', state.motion);
    document.documentElement.style.zoom = state.scale!==1 ? state.scale : '';
    try{ localStorage.setItem(KEY, JSON.stringify(state)); }catch(e){}
  }

  /* ---------- widget DOM ---------- */
  var fab=document.createElement('button');
  fab.className='a11y-fab'; fab.type='button';
  fab.setAttribute('aria-label','תפריט נגישות'); fab.setAttribute('aria-expanded','false');
  fab.setAttribute('aria-controls','a11y-panel'); fab.innerHTML='<span aria-hidden="true">♿</span>';

  var panel=document.createElement('div');
  panel.className='a11y-panel'; panel.id='a11y-panel'; panel.setAttribute('role','dialog');
  panel.setAttribute('aria-label','הגדרות נגישות');
  panel.innerHTML=''
    + '<h2>נגישות</h2><div class="sub">התאמת האתר לצרכים שלך</div>'
    + '<div class="a11y-stepper" role="group" aria-label="גודל טקסט">'
    +   '<button type="button" data-act="dec" aria-label="הקטנת טקסט">א−</button>'
    +   '<span class="val" id="a11y-scaleval">100%</span>'
    +   '<button type="button" data-act="inc" aria-label="הגדלת טקסט">א+</button>'
    + '</div>'
    + '<div class="a11y-row"><button class="a11y-btn" type="button" data-toggle="contrast" aria-pressed="false">ניגודיות גבוהה</button>'
    +   '<button class="a11y-btn" type="button" data-toggle="links" aria-pressed="false">הדגשת קישורים</button></div>'
    + '<div class="a11y-row"><button class="a11y-btn" type="button" data-toggle="font" aria-pressed="false">גופן קריא</button>'
    +   '<button class="a11y-btn" type="button" data-toggle="motion" aria-pressed="false">עצירת אנימציות</button></div>'
    + '<button class="a11y-reset" type="button" data-act="reset">איפוס הגדרות</button>'
    + '<a class="a11y-state" href="accessibility.html">הצהרת נגישות מלאה</a>';

  document.body.appendChild(fab);
  document.body.appendChild(panel);

  function syncUI(){
    document.getElementById('a11y-scaleval').textContent=Math.round(state.scale*100)+'%';
    panel.querySelectorAll('[data-toggle]').forEach(function(btn){
      btn.setAttribute('aria-pressed', state[btn.getAttribute('data-toggle')]?'true':'false');
    });
  }
  function openPanel(o){ panel.classList.toggle('open',o); fab.setAttribute('aria-expanded',o?'true':'false'); }

  fab.addEventListener('click',function(){ openPanel(!panel.classList.contains('open')); });
  document.addEventListener('keydown',function(e){
    if(e.key==='Escape'&&panel.classList.contains('open')){ openPanel(false); fab.focus(); }
  });
  document.addEventListener('click',function(e){
    if(panel.classList.contains('open') && !panel.contains(e.target) && e.target!==fab && !fab.contains(e.target)) openPanel(false);
  });
  panel.addEventListener('click',function(e){
    var t=e.target.closest('button, a'); if(!t) return;
    var tog=t.getAttribute('data-toggle'), act=t.getAttribute('data-act');
    if(tog){ state[tog]=!state[tog]; }
    else if(act==='inc'){ state.scale=Math.min(1.6, Math.round((state.scale+0.1)*10)/10); }
    else if(act==='dec'){ state.scale=Math.max(0.9, Math.round((state.scale-0.1)*10)/10); }
    else if(act==='reset'){ state={scale:1,contrast:false,links:false,font:false,motion:false}; }
    else return;
    apply(); syncUI();
  });

  apply(); syncUI();
})();
