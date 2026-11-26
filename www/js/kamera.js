/* ======================================================================
 * kamera.js — 3×3 kubikni kamera bilan skanerlash va jonli yo'riqnoma.
 * 1) SKANER: yuzalar F R B L U D tartibida; jonli yoyilma; barqaror bo'lsa avto-olinadi.
 *    Rang aniqlash: markazlar — mos yuza markazi; stikerlar Lab fazosida eng yaqin markazga,
 *    har yuzaning yorug'lik og'ishi (avto-kalibrovka) hisobga olinadi, har rangdan aniq 8 ta.
 *    Noto'g'ri stikerni palitra + yoyilmaga bosib qo'lda to'g'rilash mumkin. Chiroq tugmasi bor.
 * 2) YO'RIQNOMA: yechim yurishlari ketma-ket ko'rsatiladi (kamera ustida AR strelka).
 *    Kubik yashil old / oq tepada ushlanadi. Old yuza ranglari kutilgan shablonlarga
 *    solishtiriladi (yurishdan oldin / keyin / noto'g'ri variantlar) — bajarildi, xato yoki
 *    teskari burilish aniqlanadi. Old yuzaga ta'sir qilmaydigan yurishlar (masalan B) harakat
 *    va to'xtashga qarab taxminan qabul qilinadi. Yurishlar soni, vaqt, TPS saqlanadi.
 * ====================================================================== */
(function () {
  'use strict';
  const Net = RubikNet, Cube = RubikCube, { HEX, NAMES, FC } = Cube.COLORS;
  const ORDER = [2, 1, 5, 4, 0, 3];                       // FACES='URFDLB': F, R, B, L, U, D
  const HELP = [
    "Yashil markaz kameraga, oq markaz tepada. Kubikni katakchalar ichiga to'g'rilang.",
    "Kubikning o'ng yon tomonini o'zingizga qaratib buring: qizil markaz kameraga (oq tepada qolsin).",
    "Yana o'sha tomonga buring: ko'k markaz kameraga.",
    "Yana buring: to'q sariq markaz kameraga.",
    "Yashil yuzani oldinga qaytaring, so'ng kubikning TEPASINI kameraga egib: oq markaz kameraga, yashil yuza rasmning PASTIDA.",
    "Yashil yuzani oldinga qaytaring, so'ng kubikning PASTINI kameraga egib: sariq markaz kameraga, yashil yuza rasmning TEPASIDA."
  ];
  const SAME = c => (c === 2 || c === 3) ? 2 : c;         // qizil/to'q sariq — markaz tekshiruvida bir guruh
  const NEED = 8, S = 240, G0 = S * 0.17, CS = S * 0.66 / 3;
  const OFFLIM = [20, 12, 12], THR = 16, MAR = 4, MOT = 7;

  // ---- rang matematikasi ----
  const lin = u => { u /= 255; return u <= 0.04045 ? u / 12.92 : Math.pow((u + 0.055) / 1.055, 2.4); };
  function lab(r, g, b) {
    const R = lin(r), G = lin(g), B = lin(b), f = t => t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116;
    const fx = f((0.4124 * R + 0.3576 * G + 0.1805 * B) / 0.95047), fy = f(0.2126 * R + 0.7152 * G + 0.0722 * B), fz = f((0.0193 * R + 0.1192 * G + 0.9505 * B) / 1.08883);
    return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)];
  }
  const dist = (a, b) => { const l = (a[0] - b[0]) * 0.6, x = a[1] - b[1], y = a[2] - b[2]; return Math.sqrt(l * l + x * x + y * y); };
  const DEF = HEX.map(h => lab(parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)));
  const nearest = (l, refs) => { let b = 0, bd = 1e9; for (let c = 0; c < 6; c++) { const d = dist(l, refs[c]); if (d < bd) { bd = d; b = c; } } return b; };
  const median = a => { a.sort((x, y) => x - y); return a[a.length >> 1]; };
  const clamp = (v, m) => Math.max(-m, Math.min(m, v));
  const sub = (a, o) => [a[0] - o[0], a[1] - o[1], a[2] - o[2]];

  /** Har rangdan aniq NEED ta bo'lishi uchun eng ishonchsiz stikerlarni qayta tayinlaydi. */
  function balance(items) {
    const cnt = Array(6).fill(0); items.forEach(x => cnt[x.c]++);
    for (let n = 0; n < 300 && cnt.some(v => v > NEED); n++) {
      const c = cnt.findIndex(v => v > NEED); let best = null, bs = 1e9;
      for (const x of items) if (x.c === c && !x.fx) for (let c2 = 0; c2 < 6; c2++) if (cnt[c2] < NEED) { const s = x.d[c2] - x.d[c]; if (s < bs) { bs = s; best = [x, c2]; } }
      if (!best) break; cnt[c]--; cnt[best[1]]++; best[0].c = best[1];
    }
  }
  /** L[f][k] — yuza f, katak k Lab qiymati. ovr — qo'lda belgilangan {stiker: rang}. */
  function classifyAll(L, ovr) {
    ovr = ovr || {};
    const refs = Array(6); for (let f = 0; f < 6; f++) refs[FC[f]] = L[f][4];
    const off = Array.from({ length: 6 }, () => [0, 0, 0]);
    let items = [];
    for (let it = 0; it < 4; it++) {
      items = [];
      for (let f = 0; f < 6; f++) for (let k = 0; k < 9; k++) if (k !== 4) {
        const i = f * 9 + k, d = refs.map(r => dist(sub(L[f][k], off[f]), r)), fx = ovr[i] !== undefined;
        items.push({ f, k, i, d, fx, c: fx ? ovr[i] : d.indexOf(Math.min(...d)) });
      }
      balance(items);
      for (let f = 0; f < 6; f++) {                       // yuzaning yorug'lik og'ishi (avto-kalibrovka)
        const s = [0, 0, 0]; let n = 0;
        for (const x of items) if (x.f === f && !x.fx) { for (let j = 0; j < 3; j++) s[j] += L[f][x.k][j] - refs[x.c][j]; n++; }
        off[f] = n ? s.map((v, j) => clamp(v / n, OFFLIM[j])) : [0, 0, 0];
      }
    }
    const st = Array(54).fill(-1); for (let f = 0; f < 6; f++) st[f * 9 + 4] = FC[f];
    items.forEach(x => { st[x.i] = x.c; });
    return { st, refs, off };
  }

  // ---- yo'riqnoma: shablon solishtirish ----
  function matchCost(labs, P, refs) {                     // P — 9 ta kutilgan rang; yorug'lik og'ishi hisobga olinadi
    const o = [0, 0, 0];
    for (let k = 0; k < 9; k++) for (let j = 0; j < 3; j++) o[j] += labs[k][j] - refs[P[k]][j];
    for (let j = 0; j < 3; j++) o[j] = clamp(o[j] / 9, OFFLIM[j]);
    let s = 0; for (let k = 0; k < 9; k++) s += dist(sub(labs[k], o), refs[P[k]]);
    return s / 9;
  }
  function decide(labs, cands, refs) {
    const r = cands.map(c => ({ key: c.key, cost: matchCost(labs, c.P, refs) })).sort((a, b) => a.cost - b.cost);
    const margin = r.length > 1 ? r[1].cost - r[0].cost : 99;
    return { key: r[0].key, cost: r[0].cost, margin, ok: r[0].cost < THR && margin > MAR };
  }
  /** Old yuzaning kuzatilgan ranglaridan etalon ranglar (yo'q ranglar — standart + o'rtacha og'ish). */
  function calib(labs, P, old) {
    const sum = Array.from({ length: 6 }, () => [0, 0, 0]), n = Array(6).fill(0), refs = DEF.map(x => x.slice());
    P.forEach((c, k) => { for (let j = 0; j < 3; j++) sum[c][j] += labs[k][j]; n[c]++; });
    const od = [0, 0, 0]; let on = 0;
    for (let c = 0; c < 6; c++) if (n[c]) {
      const m = sum[c].map(v => v / n[c]); refs[c] = old ? old[c].map((v, j) => 0.5 * v + 0.5 * m[j]) : m;
      for (let j = 0; j < 3; j++) od[j] += m[j] - DEF[c][j]; on++;
    }
    for (let c = 0; c < 6; c++) if (!n[c]) refs[c] = old ? old[c] : DEF[c].map((v, j) => v + od[j] / on);
    return refs;
  }

  // ---- AR strelkalar (kamera ustidagi 3×3 katak: 0..100 koordinatalar) ----
  const FN = { R: "o'ng yuza", L: 'chap yuza', U: 'tepa yuza', D: 'pastki yuza', F: 'old yuza (yashil)', B: 'orqa yuza' };
  function moveText(mv) {
    const a = mv[1] === "'" ? 'soat miliga TESKARI, 90°' : mv[1] === '2' ? '180° (ikki marta)' : "soat mili bo'yicha, 90°";
    return mv + ' — ' + FN[mv[0]] + ': ' + a + ' (shu yuzaga qarab)';
  }
  function arrowSvg(mv) {
    const f = mv[0], two = mv[1] === '2', dir = mv[1] === "'" ? -1 : 1, cls = two ? 'ar ar2' : 'ar';
    const P = (a, b, c, d) => '<path class="' + cls + '" d="M' + a + ' ' + b + 'L' + c + ' ' + d + '"/>';
    const pt = (a, r) => [(50 + r * Math.cos(a * Math.PI / 180)).toFixed(1), (50 + r * Math.sin(a * Math.PI / 180)).toFixed(1)];
    let s = '';
    if (f === 'R') s = dir > 0 ? P(90, 86, 90, 14) : P(90, 14, 90, 86);
    else if (f === 'L') s = dir > 0 ? P(10, 14, 10, 86) : P(10, 86, 10, 14);
    else if (f === 'U') s = dir > 0 ? P(86, 10, 14, 10) : P(14, 10, 86, 10);
    else if (f === 'D') s = dir > 0 ? P(14, 90, 86, 90) : P(86, 90, 14, 90);
    else {                                                // F: old tomondan soat mili bo'yicha; B: old tomondan teskari ko'rinadi
      const cw = (f === 'F') === (dir > 0), a = pt(-120, 34), b = pt(150, 34);
      s = cw ? '<path class="' + cls + '" d="M' + a[0] + ' ' + a[1] + 'A34 34 0 1 1 ' + b[0] + ' ' + b[1] + '"/>'
             : '<path class="' + cls + '" d="M' + b[0] + ' ' + b[1] + 'A34 34 0 1 0 ' + a[0] + ' ' + a[1] + '"/>';
      if (f === 'B') s = s.replace(/class="/, 'style="stroke-dasharray:6 5" class="');
    }
    return s + '<text x="50" y="58" class="al">' + mv + (f === 'B' ? ' (orqa)' : '') + '</text>';
  }

  window.RubikCamCore = { lab, dist, DEF, nearest, classifyAll, matchCost, decide, calib, arrowSvg, moveText };

  // ================= UI va kamera =================
  let stream = null, track = null, torchOn = false, timer = 0, M = 'scan', busy = false;
  let step = 0, caps = [], ovr = {}, brush = 0, prev = '', stable = 0, last = null, G = null, prevT = null, shown = '';
  let root, video, ctx, netEl, dots = [], chips = [];
  const cv = document.createElement('canvas'); cv.width = cv.height = S;
  const tc = document.createElement('canvas'); tc.width = tc.height = 16;
  const $k = s => root.querySelector(s);

  function css() {
    const s = document.createElement('style');
    s.textContent = '#kam{position:fixed;inset:0;z-index:99;background:var(--bg);color:var(--fg);overflow:auto;padding:10px;display:flex;flex-direction:column;align-items:center;gap:8px}' +
      '#kam[hidden]{display:none}#kam.scan .gd,#kam.guide .sc{display:none!important}' +
      '#kam .kt{display:flex;justify-content:space-between;align-items:center;width:100%;max-width:460px}' +
      '#kam .kv{position:relative;width:min(100%,360px);aspect-ratio:1;background:#000;border-radius:14px;overflow:hidden;flex:none}' +
      '#kam video{width:100%;height:100%;object-fit:cover}' +
      '#kam .kg,#kam .ka{position:absolute;left:17%;top:17%;width:66%;height:66%}' +
      '#kam .kg{display:grid;grid-template:repeat(3,1fr)/repeat(3,1fr);border:2px solid #fff;box-shadow:0 0 0 999px rgba(0,0,0,.35)}' +
      '#kam .kg i{border:1px solid rgba(255,255,255,.7);display:flex;align-items:center;justify-content:center}' +
      '#kam .kg b{width:34%;aspect-ratio:1;border-radius:50%;border:2px solid #fff}' +
      '#kam .ka{overflow:visible;pointer-events:none;filter:drop-shadow(0 0 2px #000)}' +
      '#kam .ar{fill:none;stroke:#ffd500;stroke-width:5;stroke-linecap:round;marker-end:url(#kh)}#kam .ar2{marker-start:url(#kh)}' +
      '#kam .al{fill:#fff;stroke:#000;stroke-width:1.2;font:bold 15px sans-serif;text-anchor:middle}' +
      '#kam .kc{display:flex;gap:6px}#kam .kc span{width:30px;height:8px;border-radius:4px;background:var(--bd)}#kam .kc span.on{background:var(--pri)}#kam .kc span.ok{background:#2fbf71}' +
      '#kam .kpal{display:flex;gap:8px}#kam .kpal button{width:34px;height:34px;border-radius:50%;border:2px solid var(--bd);padding:0}#kam .kpal button.on{border-color:var(--fg);box-shadow:0 0 0 2px var(--pri)}' +
      '#kHelp{white-space:pre-line;font-size:14px;text-align:center;max-width:420px;min-height:3.6em}#kHud{font-size:15px;font-weight:600}#kBar{height:6px;border-radius:3px;background:var(--pri);width:0;transition:width .1s}' +
      '#kam .kb{width:min(100%,360px);height:6px;border-radius:3px;background:var(--bd)}#kWrap{max-width:100%;overflow:auto}#kNet .st{cursor:pointer}' +
      '#kTorch.on{background:var(--pri)}';
    document.head.append(s);
  }
  function build() {
    root = document.createElement('div'); root.id = 'kam'; root.hidden = true;
    root.innerHTML = '<div class="kt"><b id="kTitle"></b><span><button id="kTorch" hidden aria-label="Chiroq">🔦</button> <button id="kX" aria-label="Yopish">✕</button></span></div>' +
      '<div class="kv"><video playsinline muted autoplay></video><div class="kg">' + '<i><b></b></i>'.repeat(9) + '</div>' +
      '<svg class="ka" viewBox="0 0 100 100"><defs><marker id="kh" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="3" markerHeight="3" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="#ffd500"/></marker></defs><g id="kAr"></g></svg></div>' +
      '<div class="kc sc">' + '<span></span>'.repeat(6) + '</div><div id="kHud" class="gd"></div><div id="kHelp"></div><div class="kb sc"><div id="kBar"></div></div>' +
      '<div class="kpal sc">' + HEX.map((h, i) => '<button data-c="' + i + '" style="background:' + h + '" aria-label="' + NAMES[i] + '"></button>').join('') + '</div>' +
      '<small class="sc">Noto\'g\'ri stikerni tuzatish: rangni tanlang, so\'ng yoyilmadagi stikerga bosing.</small>' +
      '<div class="row sc"><button id="kShot" class="p">📸 Olish</button><button id="kBack">◀ Orqaga</button></div>' +
      '<div class="row gd"><button id="gPrev">◀ Orqaga</button><button id="gNext" class="p">Keyingi ▶</button></div>' +
      '<div id="kWrap"><div id="kNet" class="net sm"></div></div>';
    document.body.append(root);
    video = $k('video'); ctx = cv.getContext('2d', { willReadFrequently: true });
    dots = [...root.querySelectorAll('.kg b')]; chips = [...root.querySelectorAll('.kc span')]; netEl = $k('#kNet');
    $k('#kX').onclick = close;
    $k('#kTorch').onclick = async () => {
      try { torchOn = !torchOn; await track.applyConstraints({ advanced: [{ torch: torchOn }] }); $k('#kTorch').classList.toggle('on', torchOn); }
      catch (e) { torchOn = false; $k('#kTorch').hidden = true; }
    };
    const pal = [...root.querySelectorAll('.kpal button')];
    pal[0].classList.add('on');
    pal.forEach(b => { b.onclick = () => { brush = +b.dataset.c; pal.forEach(x => x.classList.toggle('on', x === b)); }; });
    netEl.onclick = e => {                                // qo'lda to'g'rilash (faqat skanerda)
      const d = e.target.closest('.st'); if (!d || M !== 'scan') return;
      const i = +d.dataset.i, f = (i / 9) | 0, k = i % 9; if (k === 4) return;
      ovr[i] = brush; Net.setCell(netEl, i, brush);
      const c = caps[ORDER.indexOf(f)]; if (c) c.live[k] = brush;
    };
    $k('#kShot').onclick = () => { if (last) capture(); };
    $k('#kBack').onclick = () => {
      if (step > 0) { step--; const f = ORDER[step]; for (let k = 0; k < 9; k++) { Net.setCell(netEl, f * 9 + k, -1); delete ovr[f * 9 + k]; } caps[step] = null; stable = 0; prev = ''; ui(); }
    };
    $k('#gNext').onclick = () => { if (G && !G.done && G.i < G.moves.length) confirmMove(null); };
    $k('#gPrev').onclick = () => {
      if (!G || !G.hist.length) return; const h = G.hist.pop();
      G.cur = h; G.i--; G.n = Math.max(0, G.n - 1); G.done = false; gStep();
    };
  }
  const say = t => { if (t !== shown) { shown = t; $k('#kHelp').textContent = t; } };
  function ui(msg) {
    chips.forEach((c, i) => { c.className = caps[i] ? 'ok' : (i === step ? 'on' : ''); });
    say(msg || (step < 6 ? (step + 1) + '/6 · ' + HELP[step] : ''));
  }
  function sample() {
    const v = video; if (!v.videoWidth) return null;
    const s = Math.min(v.videoWidth, v.videoHeight);
    ctx.drawImage(v, (v.videoWidth - s) / 2, (v.videoHeight - s) / 2, s, s, 0, 0, S, S);
    const out = [], w = Math.round(CS * 0.36);
    for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) {
      const d = ctx.getImageData(Math.round(G0 + (c + 0.5) * CS - w / 2), Math.round(G0 + (r + 0.5) * CS - w / 2), w, w).data;
      const R = [], Gc = [], B = [];
      for (let i = 0; i < d.length; i += 8) { R.push(d[i]); Gc.push(d[i + 1]); B.push(d[i + 2]); }
      out.push(lab(median(R), median(Gc), median(B)));
    }
    return out;
  }
  function motion() {                                     // kadrlar orasidagi o'rtacha yorqinlik farqi (16×16)
    const t = tc.getContext('2d', { willReadFrequently: true }); t.drawImage(cv, 0, 0, 16, 16);
    const d = t.getImageData(0, 0, 16, 16).data, cur = new Float32Array(256); let m = 0;
    for (let i = 0; i < 256; i++) cur[i] = 0.3 * d[i * 4] + 0.59 * d[i * 4 + 1] + 0.11 * d[i * 4 + 2];
    if (prevT) { for (let i = 0; i < 256; i++) m += Math.abs(cur[i] - prevT[i]); m /= 256; }
    prevT = cur; return m;
  }

  // ---------- skaner ----------
  function refsNow() {
    const r = DEF.slice();
    caps.forEach((c, i) => { if (c) r[FC[ORDER[i]]] = c.labs[4]; });
    return r;
  }
  function scanTick() {
    if (busy || step >= 6) return;
    const labs = sample(); if (!labs) return;
    const f = ORDER[step], ec = FC[f], refs = refsNow(), rl = refs.slice(); rl[ec] = labs[4];
    const live = labs.map(l => nearest(l, rl)), cn = nearest(labs[4], refs);
    live.forEach((c, k) => { const o = ovr[f * 9 + k]; if (o !== undefined && k !== 4) live[k] = o; });
    last = { labs, live };
    live.forEach((c, k) => { dots[k].style.background = HEX[c]; Net.setCell(netEl, f * 9 + k, c); });
    const wrong = SAME(cn) !== SAME(ec), sig = live.join('');
    stable = (sig === prev && !wrong) ? stable + 1 : 0; prev = sig;
    $k('#kBar').style.width = Math.min(100, stable / 8 * 100) + '%';
    ui(wrong ? 'Bu kutilgan yuza emas — ' + NAMES[ec].toLowerCase() + ' markazli yuzani ko\'rsating. (' + HELP[step] + ')' : null);
    if (stable >= 8) capture();
  }
  function capture() {
    if (!last || step >= 6) return;
    caps[step] = { labs: last.labs, live: last.live };
    if (navigator.vibrate) navigator.vibrate(60);
    step++; stable = 0; prev = ''; $k('#kBar').style.width = '0';
    if (step === 6) finalize(); else ui();
  }
  function finalize() {
    busy = true;
    const L = []; for (let f = 0; f < 6; f++) L[f] = caps[ORDER.indexOf(f)].labs;
    const r = classifyAll(L, ovr);
    close();
    RubikApp.load(r.st, true);
  }

  // ---------- yo'riqnoma ----------
  const front = s => s.slice(18, 27);
  const fmt = ms => (ms / 1000).toFixed(1) + ' s';
  function gInit() {
    const s = RubikApp.sol;
    G = { moves: s.moves.slice(), i: 0, cur: s.start.slice(), hist: [], refs: null, still: 0, moving: 0, same: 0, unk: 0, last: '', t0: 0, n: 0, done: false, warn: '' };
    prevT = null; gStep();
  }
  function gStep() {
    $k('#kAr').innerHTML = ''; Net.draw(netEl, G.cur, 3, { small: true });
    G.still = 0; G.moving = 0; G.same = 0; G.unk = 0; G.last = ''; G.warn = '';
    if (G.i >= G.moves.length) return gFinish();
    const mv = G.moves[G.i], X = mv[0], mk = m => front(Cube.applyAlg(G.cur, 3, m));
    const c = [{ key: 'before', P: front(G.cur) }, { key: 'after', P: mk(mv) }];
    for (const v of [X, X + "'", X + '2']) if (v !== mv) c.push({ key: 'v:' + v, P: mk(v) });
    G.visible = c[0].P.join('') !== c[1].P.join('');
    const seen = new Set(); G.cands = c.filter(x => { const k = x.P.join(''); if (seen.has(k)) return false; seen.add(k); return true; });
    $k('#kAr').innerHTML = arrowSvg(mv);
    hud();
  }
  function hud() {
    const t = G.t0 ? performance.now() - G.t0 : 0;
    $k('#kHud').textContent = 'Yurish ' + Math.min(G.i + 1, G.moves.length) + '/' + G.moves.length + ' · ' + fmt(t) + (t > 1000 && G.n ? ' · ' + (G.n / (t / 1000)).toFixed(2) + ' yur/s' : '');
  }
  function confirmMove(labs) {                            // labs — kuzatilgan old yuza (kalibrovkani yangilash uchun)
    const mv = G.moves[G.i]; G.hist.push(G.cur);
    G.cur = Cube.applyAlg(G.cur, 3, mv); G.n++; G.i++;
    if (!G.t0) G.t0 = performance.now();
    if (labs && G.refs) G.refs = calib(labs, front(G.cur), G.refs);
    if (navigator.vibrate) navigator.vibrate(40);
    gStep();
  }
  function gFinish() {
    G.done = true;
    const ms = G.t0 ? performance.now() - G.t0 : 0; let extra = '';
    if (G.n > 0 && ms > 0) {
      let a = []; try { a = JSON.parse(localStorage.getItem('rubikCamStats') || '[]'); } catch (e) { a = []; }
      a.push({ d: new Date().toISOString(), n: G.n, ms: Math.round(ms) }); a = a.slice(-50);
      try { localStorage.setItem('rubikCamStats', JSON.stringify(a)); } catch (e) { /* ... */ }
      const best = Math.min(...a.map(x => x.ms));
      extra = ' · ' + (G.n / (ms / 1000)).toFixed(2) + ' yurish/s · eng yaxshi ' + fmt(best) + ' · jami ' + a.length + ' ta yechim';
    }
    $k('#kHud').textContent = '✓ Yechildi!';
    say(G.n + ' yurish · ' + fmt(ms) + extra);
  }
  function guideTick() {
    if (G.done) return;
    const labs = sample(); if (!labs) return;
    const mo = motion();
    if (!G.refs) {                                        // boshlang'ich kalibrovka: kubik qimirlamay turishi kerak
      G.still = mo < MOT ? G.still + 1 : 0;
      if (SAME(nearest(labs[4], DEF)) !== SAME(FC[2])) { say("Yashil markazli yuzani kameraga qaratib, oq markazni tepada ushlang."); G.still = 0; return; }
      say("Kubikni yashil old, oq tepada ushlab, qimirlatmang… (" + Math.min(6, G.still) + '/6)');
      if (G.still >= 6) { G.refs = calib(labs, front(G.cur)); G.still = 0; shown = ''; }
      return;
    }
    const mv = G.moves[G.i];
    if (!G.t0 && mo > MOT) G.t0 = performance.now();
    labs.forEach((l, k) => { dots[k].style.background = HEX[nearest(l, G.refs)]; });
    const d = decide(labs, G.cands, G.refs), key = d.ok ? d.key : 'unk';
    G.same = key === G.last ? G.same + 1 : 1; G.last = key; hud();
    let warn = '';
    if (G.visible) {
      if (key === 'after' && G.same >= 3) return confirmMove(labs);
      if (key.startsWith('v:') && G.same >= 4) {
        const v = key.slice(2); warn = "Siz " + v + " ni burdingiz. Uni qaytaring (" + (v[1] === "'" ? v[0] : v[1] === '2' ? v : v + "'") + "), so'ng " + mv + ' ni bajaring.';
      }
      G.unk = key === 'unk' ? G.unk + 1 : 0;
      if (G.unk > 25) warn = "Old yuza kutilganidan farq qiladi. «Orqaga» bilan oldingi qadamga qayting yoki yorug'likni yaxshilang (🔦).";
    } else {                                              // old yuzaga ta'sir qilmaydigan yurish: harakat + to'xtash
      if (mo > MOT) { G.moving++; G.still = 0; } else G.still++;
      if (G.moving >= 2 && G.still >= 7 && key === 'before') return confirmMove(null);
      if (G.still >= 7) G.moving = 0;
      if (key.startsWith('v:') && G.same >= 4) warn = "Old yuza o'zgardi — " + mv + " old yuzaga ta'sir qilmasligi kerak. Boshqa yuzani burdingizmi?";
    }
    say(moveText(mv) + (G.visible ? '' : "\n(Bu yurish old yuzada ko'rinmaydi — harakat va to'xtashga qarab qabul qilinadi; «Keyingi» ham bor.)") + (warn ? '\n⚠ ' + warn : ''));
  }

  function tick() {
    if (M === 'scan') scanTick(); else if (G) guideTick();
  }
  async function open(mode) {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) { alert('Bu qurilmada kamera ishlamaydi.'); return; }
    if (mode === 'guide' && !(window.RubikApp && RubikApp.sol)) { alert("Avval yechimni toping: «Tekshirish», so'ng «Qisqa yo'l (Kociemba)» ni bosing."); return; }
    if (!root) { css(); build(); }
    close(); M = mode; busy = false; last = null; prev = ''; stable = 0; shown = ''; prevT = null; G = null;
    root.className = mode; root.hidden = false;
    $k('#kTitle').textContent = mode === 'scan' ? '📷 Skanerlash' : "🎯 Jonli yo'riqnoma";
    $k('#kAr').innerHTML = '';
    if (mode === 'scan') { step = 0; caps = []; ovr = {}; Net.draw(netEl, Array(54).fill(-1), 3, { small: true }); ui('Kamera ochilmoqda…'); }
    else { Net.draw(netEl, RubikApp.sol.start, 3, { small: true }); say('Kamera ochilmoqda…'); }
    try {
      stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false });
      video.srcObject = stream; await video.play();
      track = stream.getVideoTracks()[0]; torchOn = false; $k('#kTorch').classList.remove('on');
      const c = track.getCapabilities ? track.getCapabilities() : {}; $k('#kTorch').hidden = !c.torch;
      if (mode === 'guide') gInit(); else ui();
      timer = setInterval(tick, 110);
    } catch (e) {
      say('❌ Kameraga ruxsat berilmadi yoki kamera topilmadi (' + (e.name || e.message) + "). Sozlamalardan ruxsat bering yoki stikerlarni qo'lda bo'yang.");
    }
  }
  function close() {
    clearInterval(timer); timer = 0;
    if (stream) { stream.getTracks().forEach(t => t.stop()); stream = null; }
    if (root) root.hidden = true;
  }
  const b1 = document.getElementById('bCam'), b2 = document.getElementById('bGuide');
  if (b1) b1.onclick = () => open('scan');
  if (b2) b2.onclick = () => open('guide');
})();
