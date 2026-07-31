/* ============================================================================
   SELA FAÇADE — hero, rendered
   Raw WebGL2. No libraries, nothing loaded at runtime (brief §5.1).

   The flat SVG read as a diagram. This is the same six-step assembly built as
   real geometry with real materials and a real light, so it reads as a render
   of a wall rather than an illustration of one. The SVG stays in the markup as
   the fallback for reduced-motion and for anything without WebGL.

   Renders on demand — the camera only moves with the scroll, so there is no
   idle rAF loop draining a phone battery while the hero sits on screen.
   ========================================================================= */
(function () {
  'use strict';

  /* ------------------------------------------------------------- maths -- */
  function mul(a, b) {
    var o = new Float32Array(16);
    for (var i = 0; i < 4; i++) for (var j = 0; j < 4; j++) {
      o[i * 4 + j] = a[j] * b[i * 4] + a[4 + j] * b[i * 4 + 1] +
                     a[8 + j] * b[i * 4 + 2] + a[12 + j] * b[i * 4 + 3];
    }
    return o;
  }
  function perspective(fovy, aspect, n, f) {
    var t = 1 / Math.tan(fovy / 2), o = new Float32Array(16);
    o[0] = t / aspect; o[5] = t; o[10] = (f + n) / (n - f); o[11] = -1;
    o[14] = 2 * f * n / (n - f);
    return o;
  }
  function lookAt(e, c, up) {
    var z = norm([e[0] - c[0], e[1] - c[1], e[2] - c[2]]);
    var x = norm(cross(up, z)), y = cross(z, x);
    return new Float32Array([
      x[0], y[0], z[0], 0, x[1], y[1], z[1], 0, x[2], y[2], z[2], 0,
      -dot(x, e), -dot(y, e), -dot(z, e), 1]);
  }
  function trs(tx, ty, tz, sx, sy, sz) {
    return new Float32Array([sx,0,0,0, 0,sy,0,0, 0,0,sz,0, tx,ty,tz,1]);
  }
  function cross(a, b) { return [a[1]*b[2]-a[2]*b[1], a[2]*b[0]-a[0]*b[2], a[0]*b[1]-a[1]*b[0]]; }
  function dot(a, b) { return a[0]*b[0]+a[1]*b[1]+a[2]*b[2]; }
  function norm(v) { var l = Math.hypot(v[0],v[1],v[2]) || 1; return [v[0]/l, v[1]/l, v[2]/l]; }

  /* ---------------------------------------------------------- textures -- */
  /* Procedural so nothing has to be fetched, and so material scale stays tied
     to world units rather than to whatever a photo happened to be cropped at. */
  function rnd(seed) { var s = seed; return function () {
    s = (s * 1664525 + 1013904223) & 0xffffffff; return (s >>> 8) / 16777216; }; }

  function surface(draw) {
    var c = document.createElement('canvas');
    c.width = c.height = 512;
    draw(c.getContext('2d'), 512, rnd(20260731));
    return c;
  }

  function grain(ctx, S, r, n, sizeMin, sizeMax, colors, alpha) {
    for (var i = 0; i < n; i++) {
      ctx.fillStyle = colors[(r() * colors.length) | 0];
      ctx.globalAlpha = alpha * (0.35 + r() * 0.65);
      var s = sizeMin + r() * (sizeMax - sizeMin);
      ctx.beginPath();
      ctx.ellipse(r() * S, r() * S, s, s * (0.6 + r() * 0.8), r() * 3.14, 0, 6.29);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  var TEX = {
    concrete: function () { return surface(function (x, S, r) {
      x.fillStyle = '#BEB9AE'; x.fillRect(0, 0, S, S);
      grain(x, S, r, 1500, 1, 8, ['#9C978B', '#D6D1C7', '#ADA89D'], 0.75);  /* aggregate */
      grain(x, S, r, 90, 14, 48, ['#ADA89D', '#CBC6BC'], 0.4);              /* blotching */
      for (var i = 0; i < 6; i++) {                                        /* form ties  */
        var cx = 60 + r() * (S - 120), cy = 60 + r() * (S - 120);
        x.globalAlpha = 0.5; x.fillStyle = '#9E998E';
        x.beginPath(); x.arc(cx, cy, 7, 0, 6.29); x.fill();
        x.globalAlpha = 0.35; x.fillStyle = '#D3CEC4';
        x.beginPath(); x.arc(cx - 1.5, cy - 1.5, 5, 0, 6.29); x.fill();
      }
      x.globalAlpha = 1;
    }); },

    membrane: function () { return surface(function (x, S, r) {
      x.fillStyle = '#2F2E2B'; x.fillRect(0, 0, S, S);
      grain(x, S, r, 1400, 0.6, 2.4, ['#3B3A36', '#26251F'], 0.55);
      for (var i = 0; i < 26; i++) {                                       /* roll sheen */
        x.globalAlpha = 0.05 + r() * 0.05; x.fillStyle = '#6C6A62';
        x.fillRect(0, r() * S, S, 1 + r() * 3);
      }
      x.globalAlpha = 1;
    }); },

    wool: function () { return surface(function (x, S, r) {
      x.fillStyle = '#AC9A66'; x.fillRect(0, 0, S, S);
      for (var i = 0; i < 2600; i++) {                                     /* fibres     */
        x.strokeStyle = ['#C4B283', '#93824F', '#B8A673'][(r() * 3) | 0];
        x.globalAlpha = 0.18 + r() * 0.4;
        x.lineWidth = 0.5 + r() * 1.4;
        var y = r() * S, len = 14 + r() * 70, xs = r() * S;
        x.beginPath(); x.moveTo(xs, y);
        x.lineTo(xs + len, y + (r() - 0.5) * 9); x.stroke();
      }
      grain(x, S, r, 120, 4, 16, ['#8B7A47', '#C8B78A'], 0.3);
      x.globalAlpha = 1;
    }); },

    alu: function () { return surface(function (x, S, r) {
      x.fillStyle = '#C2C7CC'; x.fillRect(0, 0, S, S);
      for (var i = 0; i < 1800; i++) {                                     /* brushed    */
        x.strokeStyle = r() > 0.5 ? '#D6DADE' : '#A9AEB4';
        x.globalAlpha = 0.10 + r() * 0.22;
        x.lineWidth = 0.5 + r() * 1.1;
        var xs = r() * S;
        x.beginPath(); x.moveTo(xs, r() * S); x.lineTo(xs + (r() - 0.5) * 3, r() * S); x.stroke();
      }
      x.globalAlpha = 1;
    }); },

    travertine: function () { return surface(function (x, S, r) {
      x.fillStyle = '#DCD0BA'; x.fillRect(0, 0, S, S);
      for (var v = 0; v < 34; v++) {                                       /* bedding    */
        x.strokeStyle = ['#C9BB9F', '#CFC2A8', '#BFAF90'][(r() * 3) | 0];
        x.globalAlpha = 0.30 + r() * 0.45;
        x.lineWidth = 1 + r() * 7;
        var y = r() * S;
        x.beginPath(); x.moveTo(0, y);
        for (var s = 0; s <= S; s += 32) x.lineTo(s, y + Math.sin(s * 0.02 + v) * 5 + (r() - 0.5) * 4);
        x.stroke();
      }
      grain(x, S, r, 700, 0.8, 3.2, ['#B7A98B', '#EDE3D2'], 0.4);          /* pores      */
      x.globalAlpha = 1;
    }); }
  };

  /* ------------------------------------------------------------ shaders - */
  var VS = `#version 300 es
  in vec3 aPos; in vec3 aNormal;
  uniform mat4 uProj, uView, uModel;
  out vec3 vN; out vec3 vW;
  void main(){
    vec4 w = uModel * vec4(aPos,1.0);
    vW = w.xyz;
    vN = mat3(uModel) * aNormal;      /* uniform scale per axis only — safe */
    gl_Position = uProj * uView * w;
  }`;

  var FS = `#version 300 es
  precision highp float;
  in vec3 vN; in vec3 vW;
  uniform sampler2D uTex;
  uniform vec3  uCam, uLight, uTint;
  uniform float uUV, uShine, uSpec, uFlat, uAlpha;
  uniform vec2  uDepth;              /* z range of the stack, for ambient AO */
  out vec4 outColor;

  void main(){
    vec3 n = normalize(vN);
    vec3 an = abs(n);

    /* triplanar: material scale follows world units, not per-box UVs, so the
       travertine bedding runs continuously across the tile joints */
    vec2 uv = an.z >= an.x && an.z >= an.y ? vW.xy
            : an.x >= an.y                 ? vW.zy
                                           : vW.xz;
    vec3 albedo = mix(texture(uTex, uv * uUV).rgb, uTint, uFlat);

    vec3 V = normalize(uCam - vW);
    vec3 L = normalize(uLight);
    float ndl = max(dot(n, L), 0.0);

    /* hemisphere ambient in the page's own palette — the wall sits in the
       room the site is painted in, not in a neutral studio */
    vec3  sky = vec3(0.984, 0.965, 0.925), grd = vec3(0.760, 0.716, 0.639);
    float hemi = n.y * 0.5 + 0.5;
    vec3  amb  = mix(grd, sky, hemi);

    /* layers deeper in the build-up receive less bounce — cheap contact AO
       that reads correctly precisely because the subject is stratified */
    float ao = mix(0.42, 1.0, smoothstep(uDepth.x, uDepth.y, vW.z));
    ao *= mix(0.72, 1.0, smoothstep(-1.25, -0.35, vW.y));

    vec3 col = albedo * (amb * ao * 0.46 + vec3(1.0, 0.968, 0.912) * ndl * 1.02);

    vec3  H = normalize(L + V);
    float sp = pow(max(dot(n, H), 0.0), uShine) * uSpec;
    col += vec3(1.0, 0.985, 0.955) * sp * ndl;

    float fres = pow(1.0 - max(dot(n, V), 0.0), 4.0);
    col += vec3(0.98, 0.95, 0.90) * fres * 0.06;

    col = col / (col + vec3(1.14));            /* filmic-ish shoulder */
    col = pow(col, vec3(1.0 / 2.2));
    outColor = vec4(col * uAlpha, uAlpha);     /* premultiplied */
  }`;

  /* the ground catch — a soft rectangular contact shadow, nothing else */
  var SFS = `#version 300 es
  precision highp float;
  in vec3 vN; in vec3 vW;
  uniform vec2 uFoot; uniform float uAlpha;
  out vec4 outColor;
  void main(){
    vec2 d = abs(vW.xz) - uFoot;
    float o = length(max(d, 0.0)) + min(max(d.x, d.y), 0.0);
    float s = 1.0 - smoothstep(-0.02, 0.46, o);
    s = pow(s, 1.9) * 0.26 * uAlpha;
    outColor = vec4(vec3(0.235, 0.212, 0.169) * s, s);
  }`;

  /* ------------------------------------------------------------- scene -- */
  var W = 3.25, H = 2.02;
  var TH = [0.26, 0.022, 0.17, 0.10, 0.085, 0.038];         /* by depth      */
  var Z0 = [], acc = 0;
  for (var i = 0; i < 6; i++) { Z0.push(acc); acc += TH[i]; }
  var ZC = acc / 2;                                          /* centre depth  */

  var MAT = {
    concrete:   { tex: 'concrete',   uv: 1.15, shine: 26,  spec: 0.05, flat: 0 },
    membrane:   { tex: 'membrane',   uv: 1.40, shine: 60,  spec: 0.26, flat: 0 },
    wool:       { tex: 'wool',       uv: 1.70, shine: 14,  spec: 0.02, flat: 0 },
    alu:        { tex: 'alu',        uv: 3.20, shine: 130, spec: 0.62, flat: 0 },
    travertine: { tex: 'travertine', uv: 0.78, shine: 34,  spec: 0.12, flat: 0 },
    air:        { tex: 'alu',        uv: 1.0,  shine: 8,   spec: 0.0,  flat: 1,
                  tint: [0.478, 0.373, 0.231] }
  };

  /* every part: its step in the installation sequence, and its box */
  function boxes() {
    var b = [], j = 0.012;

    b.push({ s: 0, m: 'concrete', x: 0, y: 0, z: Z0[0] + TH[0] / 2, w: W, h: H, d: TH[0] });
    b.push({ s: 1, m: 'membrane', x: 0, y: 0, z: Z0[1] + TH[1] / 2, w: W, h: H, d: TH[1] });

    /* step 3 — the aluminium goes up on a bare wall, brackets first */
    var rails = [-W / 3, 0, W / 3];
    for (var r = 0; r < 3; r++) {
      b.push({ s: 2, m: 'alu', x: rails[r], y: 0, z: Z0[3] + TH[3] / 2, w: 0.10, h: H, d: TH[3] });
      for (var k = -1; k <= 1; k++) {
        b.push({ s: 2, m: 'alu', x: rails[r], y: k * (H / 3), z: (Z0[2] + Z0[3] + TH[3]) / 2,
                 w: 0.24, h: 0.10, d: Z0[3] + TH[3] - Z0[2] });
      }
    }

    /* step 4 — the wool is fitted into the bays afterwards */
    b.push({ s: 3, m: 'wool', x: 0, y: 0, z: Z0[2] + TH[2] / 2, w: W, h: H, d: TH[2] });

    /* step 5 — the cavity is what is left, so it is shown by the air in it */
    for (var a = 0; a < 3; a++) {
      var ax = -W / 3 + a * (W / 3), az = Z0[4] + TH[4] / 2;
      b.push({ s: 4, m: 'air', x: ax, y: -0.10, z: az, w: 0.016, h: 1.30, d: 0.016 });
      b.push({ s: 4, m: 'air', x: ax - 0.055, y: 0.48, z: az, w: 0.115, h: 0.016, d: 0.016, rz: 1 });
      b.push({ s: 4, m: 'air', x: ax + 0.055, y: 0.48, z: az, w: 0.115, h: 0.016, d: 0.016, rz: -1 });
    }

    /* step 6 — large-format panels, 3 x 2 */
    for (var cx = 0; cx < 3; cx++) for (var cy = 0; cy < 2; cy++) {
      b.push({ s: 5, m: 'travertine',
               x: -W / 3 + cx * (W / 3), y: -H / 4 + cy * (H / 2),
               z: Z0[5] + TH[5] / 2, w: W / 3 - j, h: H / 2 - j, d: TH[5] });
    }
    return b;
  }

  /* ---------------------------------------------------------- renderer -- */
  function compile(gl, type, src) {
    var s = gl.createShader(type);
    gl.shaderSource(s, src); gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
    return s;
  }
  function program(gl, vs, fs) {
    var p = gl.createProgram();
    gl.attachShader(p, compile(gl, gl.VERTEX_SHADER, vs));
    gl.attachShader(p, compile(gl, gl.FRAGMENT_SHADER, fs));
    gl.bindAttribLocation(p, 0, 'aPos'); gl.bindAttribLocation(p, 1, 'aNormal');
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
    return p;
  }

  function cube() {
    var f = [[[1,0,0],[0,0,1],[0,1,0]], [[-1,0,0],[0,0,-1],[0,1,0]],
             [[0,1,0],[1,0,0],[0,0,1]], [[0,-1,0],[1,0,0],[0,0,-1]],
             [[0,0,1],[-1,0,0],[0,1,0]], [[0,0,-1],[1,0,0],[0,1,0]]];
    var pos = [], nrm = [], idx = [], n = 0;
    f.forEach(function (q) {
      var N = q[0], U = q[1], V = q[2];
      [[-1,-1],[1,-1],[1,1],[-1,1]].forEach(function (c) {
        pos.push((N[0] + U[0]*c[0] + V[0]*c[1]) / 2,
                 (N[1] + U[1]*c[0] + V[1]*c[1]) / 2,
                 (N[2] + U[2]*c[0] + V[2]*c[1]) / 2);
        nrm.push(N[0], N[1], N[2]);
      });
      idx.push(n, n+1, n+2, n, n+2, n+3); n += 4;
    });
    return { pos: new Float32Array(pos), nrm: new Float32Array(nrm), idx: new Uint16Array(idx) };
  }

  var gl, prog, shadowProg, vao, shadowVao, geo, tex = {}, parts, U = {}, SU = {};
  var canvas, dpr = 1, ready = false, lastP = -1;

  function texture(img) {
    var t = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, t);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
    gl.generateMipmap(gl.TEXTURE_2D);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
    var aniso = gl.getExtension('EXT_texture_filter_anisotropic');
    if (aniso) gl.texParameterf(gl.TEXTURE_2D, aniso.TEXTURE_MAX_ANISOTROPY_EXT,
                Math.min(8, gl.getParameter(aniso.MAX_TEXTURE_MAX_ANISOTROPY_EXT)));
    return t;
  }

  function buildVao(g) {
    var v = gl.createVertexArray();
    gl.bindVertexArray(v);
    var pb = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, pb); gl.bufferData(gl.ARRAY_BUFFER, g.pos, gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0);
    var nb = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, nb); gl.bufferData(gl.ARRAY_BUFFER, g.nrm, gl.STATIC_DRAW);
    gl.enableVertexAttribArray(1); gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 0, 0);
    var ib = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ib);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, g.idx, gl.STATIC_DRAW);
    gl.bindVertexArray(null);
    return v;
  }

  function init(cv) {
    canvas = cv;
    gl = cv.getContext('webgl2', { alpha: true, antialias: true, premultipliedAlpha: true,
                                   powerPreference: 'high-performance' });
    if (!gl) return false;

    prog = program(gl, VS, FS);
    shadowProg = program(gl, VS, SFS);
    ['uProj','uView','uModel','uTex','uCam','uLight','uTint','uUV','uShine','uSpec','uFlat','uAlpha','uDepth']
      .forEach(function (k) { U[k] = gl.getUniformLocation(prog, k); });
    ['uProj','uView','uModel','uFoot','uAlpha']
      .forEach(function (k) { SU[k] = gl.getUniformLocation(shadowProg, k); });

    geo = cube();
    vao = buildVao(geo);
    shadowVao = vao;
    Object.keys(TEX).forEach(function (k) { tex[k] = texture(TEX[k]()); });
    parts = boxes();

    gl.enable(gl.DEPTH_TEST);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);   /* premultiplied */
    resize();
    ready = true;
    return true;
  }

  function resize() {
    if (!gl) return;
    dpr = Math.min(window.devicePixelRatio || 1, matchMedia('(pointer:coarse)').matches ? 1.6 : 2);
    var w = Math.max(1, Math.round(canvas.clientWidth * dpr));
    var h = Math.max(1, Math.round(canvas.clientHeight * dpr));
    if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
    gl.viewport(0, 0, canvas.width, canvas.height);
    lastP = -1;
  }

  function ease(t) { return t * t * (3 - 2 * t); }

  function render(p, arrival) {
    if (!ready) return;
    if (p === lastP) return;
    lastP = p;

    var aspect = canvas.width / canvas.height;

    /* a slow push-in and a few degrees of orbit as the wall closes — enough
       that the shot feels handled, not so much that it competes with the build */
    var az = 0.92 - 0.13 * p, el = 0.19 + 0.05 * p, dist = 5.95 - 0.55 * p;
    var eye = [dist * Math.cos(el) * Math.sin(az), dist * Math.sin(el) + 0.06,
               dist * Math.cos(el) * Math.cos(az)];
    var proj = perspective(0.60, aspect, 0.1, 40);
    var view = lookAt(eye, [0, -0.16, 0], [0, 1, 0]);

    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    /* ground contact shadow first, so the assembly composites over it */
    gl.useProgram(shadowProg);
    gl.bindVertexArray(shadowVao);
    gl.depthMask(false);
    gl.uniformMatrix4fv(SU.uProj, false, proj);
    gl.uniformMatrix4fv(SU.uView, false, view);
    gl.uniformMatrix4fv(SU.uModel, false, trs(0, -H / 2 - 0.012, 0, 5, 0.001, 5));
    gl.uniform2f(SU.uFoot, W / 2 * 0.86, ZC * 0.8);
    gl.uniform1f(SU.uAlpha, 1);
    gl.drawElements(gl.TRIANGLES, geo.idx.length, gl.UNSIGNED_SHORT, 0);
    gl.depthMask(true);

    gl.useProgram(prog);
    gl.bindVertexArray(vao);
    gl.uniformMatrix4fv(U.uProj, false, proj);
    gl.uniformMatrix4fv(U.uView, false, view);
    gl.uniform3fv(U.uCam, eye);
    gl.uniform3fv(U.uLight, norm([-0.52, 0.86, 0.62]));
    gl.uniform2f(U.uDepth, -ZC, acc - ZC);
    gl.uniform1i(U.uTex, 0);
    gl.activeTexture(gl.TEXTURE0);

    /* opaque first, then the translucent arriving parts, back to front */
    var queue = parts.map(function (b) {
      return { b: b, e: arrival(b.s) };
    }).filter(function (q) { return q.e > 0.001; });

    /* settled parts first with depth writes on; parts still in flight after
       them with writes off, so a translucent one cannot occlude the wall */
    queue.sort(function (a, c) { return (a.e >= 1 ? 0 : 1) - (c.e >= 1 ? 0 : 1); });

    var masked = true;
    for (var i = 0; i < queue.length; i++) {
      var b = queue[i].b, e = queue[i].e, w = 1 - e;
      if (masked && e < 1) { gl.depthMask(false); masked = false; }
      var m = MAT[b.m];
      gl.bindTexture(gl.TEXTURE_2D, tex[m.tex]);
      gl.uniform1f(U.uUV, m.uv);
      gl.uniform1f(U.uShine, m.shine);
      gl.uniform1f(U.uSpec, m.spec);
      gl.uniform1f(U.uFlat, m.flat);
      gl.uniform3fv(U.uTint, m.tint || [0, 0, 0]);
      gl.uniform1f(U.uAlpha, Math.min(1, e * 1.9));

      /* parts wait off-camera and fly in on their step, the way the
         installation film stages them */
      var model = trs(b.x + 0.80 * w, b.y + 0.30 * w, b.z - ZC + 0.62 * w,
                      b.w, b.h, b.d);
      if (b.rz) {                       /* arrowheads */
        var c = Math.cos(b.rz * 0.7), s = Math.sin(b.rz * 0.7);
        var rot = new Float32Array([c,s,0,0, -s,c,0,0, 0,0,1,0, 0,0,0,1]);
        model = mul(trs(b.x + 0.80 * w, b.y + 0.30 * w, b.z - ZC + 0.62 * w, 1, 1, 1),
                    mul(rot, trs(0, 0, 0, b.w, b.h, b.d)));
      }
      gl.uniformMatrix4fv(U.uModel, false, model);
      gl.drawElements(gl.TRIANGLES, geo.idx.length, gl.UNSIGNED_SHORT, 0);
    }
    gl.depthMask(true);
  }

  window.SELA_HERO3D = { init: init, render: render, resize: resize };
})();
