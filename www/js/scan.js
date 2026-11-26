/* ======================================================================
 * scan.js — kamera bilan haqiqiy kubikni skanerlash (2×2 va 3×3).
 *
 *  1. Kamera (orqa) ochiladi, ekranda N×N to'r ko'rsatiladi; kubik yuzasini to'rga tuting.
 *  2. Har kadrda har katakning rangi (medianasi) o'qiladi, HSV bo'yicha taxminiy aniqlanadi va
 *     jonli yoyilmada (net) ko'rsatiladi. Rang 10 kadr barqaror tursa yuza avtomatik olinadi.
 *     Toq N da yuza markaz rangidan aniqlanadi (tartib erkin); juft N da tartib: F R B L U D.
 *  3. 6 yuza olingach, barcha stikerlar Lab rangida "muvozanatli klasterlash" bilan (har rangdan
 *     aynan N² ta, Hungarian algoritmi) qayta tasniflanadi — yorug'lik farqlari to'g'rilanadi.
 *  4. Holat haqiqiy bo'lmasa, yuzalar yo'nalishi (90° burilishlar) avtomatik sinab tuzatiladi.
 *
 * Yuza stikerlari tartibi: kamerada ko'ringan holat, chapdan o'ngga, yuqoridan pastga.
 * Ushlash: oq tepada, yashil old. Yon yuzalar (F R B L) — kubikni vertikal o'q atrofida aylantirish;
 * U — tepani kameraga (oldinga yotqizish), D — pastni kameraga (orqaga yotqizish).
 * ====================================================================== */
(function (root) {
  'use strict';
  const Cube = root.RubikCube, Net = root.RubikNet, Val = root.RubikValidate;
  const { HEX, NAMES, FC } = Cube.COLORS;
  const FACES = 'URFDLB';
  const ORDER = [2, 1, 5, 4, 0, 3];                // juft N uchun tartib: F R B L U D (yuza indekslari)
  const HINTS = {
    2: "Old (F) yuza: oq tepada, yashil old tomonda. Shu yuzani to'rga tuting.",
    1: "O'ng (R) yuza: kubikni gorizontal aylantiring, qizil yuza kameraga qarasin (oq tepada qolsin).",
    5: "Orqa (B) yuza: yana shu tomonga aylantiring — ko'k yuza.",
    4: "Chap (L) yuza: yana aylantiring — to'q sariq yuza.",
    0: "Tepa (U) yuza: old yuzaga qaytib, kubikni oldinga yotqizing — oq yuza kameraga qarasin.",
    3: "Past (D) yuza: old yuzaga qaytib, kubikni orqaga yotqizing — sariq yuza kameraga qarasin.",
  };
  const SQ = 0.72, STABLE_N = 10, STABLE_MIN = 8, FPS_MS = 90;

  /* ---------------- Rang yordamchilari ---------------- */
  function hsv(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn;
    let h = 0;
    if (d) { if (mx === r) h = ((g - b) / d) % 6; else if (mx === g) h = (b - r) / d + 2; else h = (r - g) / d + 4; h *= 60; if (h < 0) h += 360; }
    return [h, mx ? d / mx : 0, mx];
  }
  /** Taxminiy tasnif (jonli ko'rinish uchun): 0 oq, 1 sariq, 2 qizil, 3 to'q sariq, 4 ko'k, 5 yashil; -1 — qorong'i/noaniq. */
  function hue2cls(r, g, b) {
    const [h, s, v] = hsv(r, g, b);
    if (v < 0.16) return -1;
    if (s < 0.3) return v > 0.4 ? 0 : -1;
    if (h >= 340 || h < 12) return 2;
    if (h < 40) return 3;
    if (h < 78) return 1;
    if (h < 170) return 5;
    if (h < 265) return 4;
    return 2;
  }
  function lab(r, g, b) {
    const f = c => { c /= 255; return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
    const R = f(r), G = f(g), B = f(b), t = v => v > 0.008856 ? Math.cbrt(v) : 7.787 * v + 16 / 116;
    const x = t((R * 0.4124 + G * 0.3576 + B * 0.1805) / 0.95047), y = t(R * 0.2126 + G * 0.7152 + B * 0.0722), z = t((R * 0.0193 + G * 0.1192 + B * 0.9505) / 1.08883);
    return [116 * y - 16, 500 * (x - y), 200 * (y - z)];
  }
  const feat = c => { const l = lab(c[0], c[1], c[2]); return [l[0] * 0.5, l[1], l[2]]; };   // yorug'lik og'irligi kamaytirilgan
  const sq = (a, b) => (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2;

  /** Hungarian algoritmi: n×n narx matritsasi → res[satr] = ustun (minimal jami narx). */
  function hungarian(a) {
    const n = a.length, u = new Array(n + 1).fill(0), v = new Array(n + 1).fill(0), p = new Array(n + 1).fill(0), way = new Array(n + 1).fill(0);
    for (let i = 1; i <= n; i++) {
      p[0] = i; let j0 = 0; const minv = new Array(n + 1).fill(Infinity), used = new Array(n + 1).fill(false);
      do {
        used[j0] = true; const i0 = p[j0]; let delta = Infinity, j1 = 0;
        for (let j = 1; j <= n; j++) if (!used[j]) {
          const cur = a[i0 - 1][j - 1] - u[i0] - v[j];
          if (cur < minv[j]) { minv[j] = cur; way[j] = j0; }
          if (minv[j] < delta) { delta = minv[j]; j1 = j; }
        }
        for (let j = 0; j <= n; j++) { if (used[j]) { u[p[j]] += delta; v[j] -= delta; } else minv[j] -= delta; }
        j0 = j1;
      } while (p[j0] !== 0);
      do { const j1 = way[j0]; p[j0] = p[j1]; j0 = j1; } while (j0);
    }
    const res = new Array(n);
    for (let j = 1; j <= n; j++) res[p[j] - 1] = j - 1;
    return res;
  }

  /**
   * faces[f] = {rgb:[[r,g,b]×N²]}. Har rangdan aynan N² ta stiker bo'ladigan qilib tasniflaydi.
   * Qaytaradi: color[6·N²] (yuza bo'yicha, qator-ustun tartibida).
   */
  function cluster(faces, N) {
    const per = N * N, n = 6 * per, F = [];
    for (let f = 0; f < 6; f++) faces[f].rgb.forEach(c => F.push(feat(c)));
    let seeds = new Array(6);
    if (N % 2) { for (let f = 0; f < 6; f++) seeds[FC[f]] = F[f * per + (per - 1) / 2]; }
    else {                                           // juft N: taxminiy (HSV) guruhlar o'rtachasi, bo'sh bo'lsa standart rang
      const sum = Array.from({ length: 6 }, () => [0, 0, 0, 0]);
      for (let f = 0; f < 6; f++) faces[f].rgb.forEach((c, k) => { const q = hue2cls(c[0], c[1], c[2]); if (q < 0) return; const x = F[f * per + k], s = sum[q]; s[0] += x[0]; s[1] += x[1]; s[2] += x[2]; s[3]++; });
      seeds = sum.map((s, k) => s[3] ? [s[0] / s[3], s[1] / s[3], s[2] / s[3]] : feat([parseInt(HEX[k].slice(1, 3), 16), parseInt(HEX[k].slice(3, 5), 16), parseInt(HEX[k].slice(5, 7), 16)]));
    }
    let assign = null;
    for (let it = 0; it < 5; it++) {
      const cost = new Array(n);
      for (let i = 0; i < n; i++) {
        const row = new Array(n), isC = N % 2 && i % per === (per - 1) / 2, own = isC ? FC[(i / per) | 0] : -1;
        for (let s = 0; s < n; s++) { const k = (s / per) | 0; row[s] = isC ? (k === own ? 0 : 1e7) : sq(F[i], seeds[k]); }
        cost[i] = row;
      }
      assign = hungarian(cost).map(s => (s / per) | 0);
      const sum = Array.from({ length: 6 }, () => [0, 0, 0, 0]);
      assign.forEach((k, i) => { const s = sum[k], x = F[i]; s[0] += x[0]; s[1] += x[1]; s[2] += x[2]; s[3]++; });
      seeds = sum.map((s, k) => s[3] ? [s[0] / s[3], s[1] / s[3], s[2] / s[3]] : seeds[k]);
    }
    return assign;
  }

  const rot90 = (a, N) => { const o = new Array(N * N); for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) o[r * N + c] = a[(N - 1 - c) * N + r]; return o; };
  /**
   * Holat haqiqiy bo'lmasa, yuzalarni 90° burib sinaydi (eng kam burilgan yuzalar soni birinchi).
   * Qaytaradi {state, rotated:[yuza raqamlari]} yoki null.
   */
  function fixOrient(color, N) {
    const per = N * N, face = f => color.slice(f * per, (f + 1) * per), base = [0, 1, 2, 3, 4, 5].map(face), combos = [];
    for (let m = 0; m < 4096; m++) { const d = [0, 1, 2, 3, 4, 5].map(i => (m >> (2 * i)) & 3); combos.push({ d, w: d.filter(x => x).length }); }
    combos.sort((a, b) => a.w - b.w);
    for (const { d } of combos) {
      const fs = base.map((a, i) => { let x = a; for (let k = 0; k < d[i]; k++) x = rot90(x, N); return x; });
      const state = [].concat(...fs);
      if (Val.check(state, N).ok) return { state, rotated: d.map((x, i) => x ? i : -1).filter(i => i >= 0) };
    }
    return null;
  }

  /* ---------------- Skaner (interfeys) ---------------- */
  const $ = id => document.getElementById(id);
  let N = 3, onDone = null, stream = null, timer = 0, faces, order, ring, netCols, hlSet, lastKey, cool, finalRes, lastDet, work, wctx, v, cv, cx, netEl, running = false;

  function open(o) {
    N = o.N; onDone = o.done; v = $('scV'); cv = $('scC'); cx = cv.getContext('2d'); netEl = $('scNet');
    work = document.createElement('canvas'); wctx = work.getContext('2d', { willReadFrequently: true });
    $('scan').hidden = false; document.body.style.overflow = 'hidden';
    reset(); start();
  }
  function reset() {
    faces = Array(6).fill(null); order = []; ring = []; finalRes = null; lastKey = ''; cool = 0; lastDet = null; hlSet = new Set();
    netCols = Array(6 * N * N).fill(-1);
    Net.draw(netEl, netCols, N, { small: true });
    drawn.length = 0;
    $('scApply').disabled = true; refreshUi(); message('');
  }
  function message(t, err) { const m = $('scMsg'); m.textContent = t || ''; m.style.display = t ? 'block' : 'none'; m.style.background = err ? 'rgba(255,45,45,.85)' : 'rgba(0,0,0,.6)'; }
  async function start() {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) throw Object.assign(new Error('Bu qurilmada kamera qo\'llab-quvvatlanmaydi'), { name: 'NoApi' });
      stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false });
      v.srcObject = stream; await v.play(); running = true; loop();
    } catch (e) {
      const m = e.name === 'NotAllowedError' || e.name === 'SecurityError' ? "Kamera ruxsati berilmadi. Telefon sozlamalari → Ilovalar → Rubik kubiklari → Ruxsatlar → Kamera ni yoqing."
        : e.name === 'NotFoundError' ? 'Kamera topilmadi.' : 'Kamerani ochib bo\'lmadi: ' + (e.message || e.name);
      message(m, true);
    }
  }
  function close() {
    running = false; clearTimeout(timer);
    if (stream) { stream.getTracks().forEach(t => t.stop()); stream = null; }
    if (v) v.srcObject = null;
    $('scan').hidden = true; document.body.style.overflow = '';
  }
  function loop() { if (!running) return; try { tick(); } catch (e) { console.error(e); } timer = setTimeout(loop, FPS_MS); }

  /** Kadrdan N×N katak ranglarini o'qiydi (har katak markazining medianasi). */
  function sample() {
    const vw = v.videoWidth, vh = v.videoHeight; if (!vw || !vh) return null;
    const side = Math.min(vw, vh) * SQ, x0 = (vw - side) / 2, y0 = (vh - side) / 2, cs = 16, S = N * cs;
    work.width = S; work.height = S; wctx.drawImage(v, x0, y0, side, side, 0, 0, S, S);
    const d = wctx.getImageData(0, 0, S, S).data, rgb = [], cls = [], med = a => { a.sort((p, q) => p - q); return a[a.length >> 1]; };
    for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
      const R = [], G = [], B = [];
      for (let y = r * cs + 4; y < r * cs + cs - 4; y++) for (let x = c * cs + 4; x < c * cs + cs - 4; x++) { const i = (y * S + x) * 4; R.push(d[i]); G.push(d[i + 1]); B.push(d[i + 2]); }
      const m = [med(R), med(G), med(B)]; rgb.push(m); cls.push(hue2cls(m[0], m[1], m[2]));
    }
    return { rgb, cls, vw, vh, side, x0, y0 };
  }
  /** Oxirgi STABLE_N kadrda har katak rangi kamida STABLE_MIN marta bir xil bo'lsa — barqaror. */
  function stable() {
    if (ring.length < STABLE_N) return null;
    const per = N * N, cls = [], rgb = [];
    for (let k = 0; k < per; k++) {
      const cnt = {}; ring.forEach(f => { cnt[f.cls[k]] = (cnt[f.cls[k]] || 0) + 1; });
      let best = -2, bn = 0; for (const q in cnt) if (cnt[q] > bn) { bn = cnt[q]; best = +q; }
      if (bn < STABLE_MIN || best < 0) return null;
      cls.push(best);
      const m = [0, 0, 0]; let c = 0; ring.forEach(f => { if (f.cls[k] === best) { m[0] += f.rgb[k][0]; m[1] += f.rgb[k][1]; m[2] += f.rgb[k][2]; c++; } });
      rgb.push(m.map(x => Math.round(x / c)));
    }
    return { cls, rgb };
  }
  /** Ko'rinib turgan yuza qaysi yuza? Toq N: markaz rangidan; juft N: navbatdagi bo'sh yuza. */
  function targetFace(cls) {
    if (N % 2) { const c = cls[(N * N - 1) / 2]; return c < 0 ? -1 : FC.indexOf(c); }
    for (const f of ORDER) if (!faces[f]) return f;
    return -1;
  }

  function drawOverlay(det) {
    const box = cv.parentElement, W = box.clientWidth, H = box.clientHeight, dpr = devicePixelRatio || 1;
    if (cv.width !== W * dpr || cv.height !== H * dpr) { cv.width = W * dpr; cv.height = H * dpr; }
    cx.setTransform(dpr, 0, 0, dpr, 0, 0); cx.clearRect(0, 0, W, H);
    const sc = Math.min(W / det.vw, H / det.vh), ox = (W - det.vw * sc) / 2, oy = (H - det.vh * sc) / 2;
    const x = ox + det.x0 * sc, y = oy + det.y0 * sc, s = det.side * sc, cs = s / N;
    cx.lineWidth = 2; cx.strokeStyle = 'rgba(255,255,255,.9)'; cx.strokeRect(x, y, s, s);
    cx.lineWidth = 1; cx.strokeStyle = 'rgba(255,255,255,.45)';
    for (let i = 1; i < N; i++) { cx.beginPath(); cx.moveTo(x + i * cs, y); cx.lineTo(x + i * cs, y + s); cx.moveTo(x, y + i * cs); cx.lineTo(x + s, y + i * cs); cx.stroke(); }
    for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
      const q = det.cls[r * N + c], px = x + (c + 0.5) * cs, py = y + (r + 0.5) * cs;
      cx.beginPath(); cx.arc(px, py, cs * 0.2, 0, 7);
      if (q >= 0) { cx.fillStyle = HEX[q]; cx.fill(); cx.lineWidth = 2; cx.strokeStyle = '#fff'; cx.stroke(); }
      else { cx.lineWidth = 2; cx.strokeStyle = 'rgba(255,80,80,.9)'; cx.stroke(); }
    }
    const pr = Math.min(1, ring.length / STABLE_N);                 // barqarorlik chizig'i
    cx.fillStyle = 'rgba(47,191,113,.95)'; cx.fillRect(x, y + s + 6, s * pr, 4);
  }

  function tick() {
    const det = sample(); if (!det) return;
    lastDet = det; drawOverlay(det);
    if (det.cls.includes(-1)) ring = []; else { ring.push(det); if (ring.length > STABLE_N) ring.shift(); }
    const st = stable(), f = targetFace(st ? st.cls : det.cls);
    liveNet(f, st ? st.cls : det.cls);
    if (!st || f < 0 || Date.now() < cool) return;
    const key = st.cls.join('');
    if (N % 2 ? faces[f] : key === lastKey) return;                 // toq: yuza olingan; juft: kubik hali siljimagan
    capture(f, st);
  }
  function liveNet(f, cls) {                                         // jonli yoyilma: olingan yuzalar + ko'rinib turgan yuza
    const per = N * N, want = netCols.slice();
    if (f >= 0 && !faces[f]) cls.forEach((c, k) => { want[f * per + k] = c; });
    paintNet(want, f >= 0 && !faces[f] ? f : -1);
  }
  const drawn = [];
  function paintNet(want, hlFace) {
    const per = N * N;
    for (let i = 0; i < want.length; i++) if (drawn[i] !== want[i]) { Net.setCell(netEl, i, want[i]); drawn[i] = want[i]; }
    for (let i = 0; i < want.length; i++) { const on = hlFace >= 0 && ((i / per) | 0) === hlFace; if (netEl.children[i] && netEl.children[i].classList.contains('hl') !== on) netEl.children[i].classList.toggle('hl', on); }
  }

  function capture(f, st) {
    const per = N * N;
    faces[f] = { rgb: st.rgb, cls: st.cls };
    order = order.filter(x => x !== f).concat(f);
    st.cls.forEach((c, k) => { netCols[f * per + k] = c; });
    lastKey = st.cls.join(''); cool = Date.now() + 900; ring = []; finalRes = null; $('scApply').disabled = true;
    if (navigator.vibrate) navigator.vibrate(40);
    if (faces.every(Boolean)) finalize(); else message(FACES[f] + " yuza olindi ✓", false);
    refreshUi();
  }
  function finalize() {
    const per = N * N, color = cluster(faces, N);
    let state = color, note = '', ok = Val.check(color, N).ok;
    if (!ok) {
      const fx = fixOrient(color, N);
      if (fx) { state = fx.state; ok = true; note = fx.rotated.map(i => FACES[i]).join(', ') + " yuza(lar) yo'nalishi avtomatik tuzatildi. "; }
    }
    finalRes = { state, ok, note };
    for (let i = 0; i < state.length; i++) netCols[i] = state[i];
    paintNet(netCols, -1);
    $('scApply').disabled = false;
    message(ok ? "6 yuza olindi ✓ " + note + "Yoyilmani tekshiring va «Qo'llash» ni bosing." : "6 yuza olindi, lekin holat haqiqiy emas (rang xatosi bo'lishi mumkin). «Qo'llash» dan keyin xato stikerlarni qo'lda tuzatishingiz mumkin.", !ok);
  }
  function refreshUi() {
    const have = faces.filter(Boolean).length;
    $('scProg').innerHTML = [0, 1, 2, 3, 4, 5].map(f => '<span class="chip' + (faces[f] ? ' cur' : '') + '">' + FACES[f] + (faces[f] ? ' ✓' : '') + '</span>').join('');
    const nxt = N % 2 ? [0, 1, 2, 3, 4, 5].find(f => !faces[f]) : ORDER.find(f => !faces[f]);
    $('scHint').textContent = have === 6 ? "Hammasi tayyor." : (N % 2 ? "Istalgan yuzani ko'rsating — yuza markaz rangidan aniqlanadi. " : '') + (HINTS[nxt] || '') + ' (' + have + '/6)';
    $('scUndo').disabled = !order.length;
  }

  function manualShot() {
    if (!lastDet) return;
    if (lastDet.cls.includes(-1)) return message("Ba'zi kataklar aniqlanmadi (qorong'i/yaltirash). Yorug'likni yaxshilang.", true);
    const f = targetFace(lastDet.cls);
    if (f < 0) return message('Yuza aniqlanmadi.', true);
    capture(f, { cls: lastDet.cls.slice(), rgb: lastDet.rgb.map(c => c.slice()) });
  }
  function undoLast() {
    const f = order.pop(); if (f === undefined) return;
    faces[f] = null; finalRes = null; $('scApply').disabled = true;
    const per = N * N; netCols = Array(6 * per).fill(-1);
    faces.forEach((x, g) => { if (x) x.cls.forEach((c, k) => { netCols[g * per + k] = c; }); });
    lastKey = ''; refreshUi(); message(FACES[f] + " yuza o'chirildi.");
  }
  function apply() {
    if (!finalRes) return;
    const res = finalRes; close(); if (onDone) onDone(res.state, res.note + (res.ok ? '' : "Holat haqiqiy emas — xato stikerlarni tuzating."), res.ok);
  }
  function bind() {
    if (!$('scan') || bind.done) return; bind.done = true;
    $('scShot').onclick = manualShot; $('scUndo').onclick = undoLast; $('scClose').onclick = close; $('scApply').onclick = apply;
    $('scClear').onclick = () => { reset(); };
    addEventListener('resize', () => { if (!$('scan').hidden) Net.fit(netEl); });
  }
  if (typeof document !== 'undefined') { if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bind); else bind(); }

  const api = { open, close, _t: { hue2cls, lab, hungarian, cluster, fixOrient, rot90, hsv } };
  root.RubikScan = api;
  if (typeof module !== 'undefined') module.exports = api;
})(typeof self !== 'undefined' ? self : globalThis);
