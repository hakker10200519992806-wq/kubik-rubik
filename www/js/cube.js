/* ======================================================================
 * cube.js — N×N kubik modeli (stikerlar massivi + permutatsiya generatori)
 *
 * HOLAT: stikerlar massivi (facelet), uzunligi 6·N·N.
 *   indeks = yuza·N² + qator·N + ustun,  yuzalar tartibi: U R F D L B
 *   (Kociemba yoyilmasi: har yuza tashqaridan qaralganda, U — orqa tomoni tepada).
 *
 * YURISH: permutatsiya jadvali perm:  yangi[i] = eski[perm[i]].
 *   Jadvallar HAR BIR (yuza, qatlam) uchun umumiy generator bilan tuziladi:
 *   stikerning 3D markazi o'q atrofida 90° buriladi va yangi joyidagi stikerga mos qo'yiladi.
 *   Shu sababli 2×2 dan 11×11 gacha (va undan katta) har qanday N uchun bir xil kod ishlaydi.
 *
 * KOORDINATALAR: x — o'ng (R), y — tepa (U), z — old (F).
 *   Stiker markazi — butun sonli vektor; bitta komponenti ±N (yuza tekisligi).
 * ====================================================================== */
(function (root) {
  'use strict';

  const FACES = 'URFDLB';

  // Ranglar sxemasi: FC[yuza] — shu yuza markazining rang indeksi (oq tepada, yashil oldida)
  const COLORS = {
    HEX:    ['#f4f4ef', '#ffd500', '#c8102e', '#ff6a13', '#0046ad', '#009b48'],
    NAMES:  ['Oq', 'Sariq', 'Qizil', "To'q sariq", "Ko'k", 'Yashil'],
    LETTER: ['O', 'S', 'Q', 'T', 'K', 'Y'],           // chop etishda stikerga yoziladi
    FC:     [0, 2, 5, 1, 3, 4],
  };

  // ---------- 1. Geometriya: har yuza uchun normal va (qator, ustun) → 3D markaz ----------
  const FACE_DEF = {
    U: { n: [0, 1, 0],  pos: (N, r, c) => [-(N - 1) + 2 * c, N, -(N - 1) + 2 * r] },
    R: { n: [1, 0, 0],  pos: (N, r, c) => [N, (N - 1) - 2 * r, (N - 1) - 2 * c] },
    F: { n: [0, 0, 1],  pos: (N, r, c) => [-(N - 1) + 2 * c, (N - 1) - 2 * r, N] },
    D: { n: [0, -1, 0], pos: (N, r, c) => [-(N - 1) + 2 * c, -N, (N - 1) - 2 * r] },
    L: { n: [-1, 0, 0], pos: (N, r, c) => [-N, (N - 1) - 2 * r, -(N - 1) + 2 * c] },
    B: { n: [0, 0, -1], pos: (N, r, c) => [(N - 1) - 2 * c, (N - 1) - 2 * r, -N] },
  };

  const geoCache = {};
  /** N uchun: pos[i] = i-stikerning 3D markazi; index — "x,y,z" → i. */
  function geometry(N) {
    if (geoCache[N]) return geoCache[N];
    const pos = [], index = new Map();
    for (let f = 0; f < 6; f++)
      for (let r = 0; r < N; r++)
        for (let c = 0; c < N; c++) {
          const p = FACE_DEF[FACES[f]].pos(N, r, c);
          index.set(p.join(','), pos.length);
          pos.push(p);
        }
    return (geoCache[N] = { N, pos, index });
  }
  /** 3D markaz bo'yicha stiker indeksi. */
  const indexAt = (N, p) => geometry(N).index.get(p.join(','));

  const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  /** v ni n o'qi atrofida, n tomonidan qaraganda soat mili bo'yicha 90° buradi. */
  function rotCW(v, n) {
    const c = cross(n, v), d = n[0] * v[0] + n[1] * v[1] + n[2] * v[2];
    return [-c[0] + n[0] * d, -c[1] + n[1] * d, -c[2] + n[2] * d];
  }
  /** Stikerning o'q bo'yicha qatlami: 0 — yuzaga eng yaqin, N-1 — qarama-qarshi tomon. */
  function layerOf(N, p, n) {
    const c = p[0] * n[0] + p[1] * n[1] + p[2] * n[2];
    if (c === N) return 0;
    if (c === -N) return N - 1;
    return (N - 1 - c) / 2;
  }

  // ---------- 2. Permutatsiyalar bilan ishlash ----------
  const identity = len => Uint16Array.from({ length: len }, (_, i) => i);
  /** p dan keyin q:  r[i] = p[q[i]]. */
  function compose(p, q) { const r = new Uint16Array(p.length); for (let i = 0; i < r.length; i++) r[i] = p[q[i]]; return r; }
  function invert(p) { const r = new Uint16Array(p.length); for (let i = 0; i < p.length; i++) r[p[i]] = i; return r; }
  /** Holatga permutatsiyani qo'llaydi (yangi massiv qaytaradi). */
  function applyPerm(state, perm) { const out = state.slice(); for (let i = 0; i < perm.length; i++) out[i] = state[perm[i]]; return out; }

  // ---------- 3. Generator: bitta qatlamni 90° soat mili bo'yicha burish ----------
  const layerCache = new Map();
  /** {perm, idx}: perm — 90° jadvali, idx — shu qatlamdagi barcha stikerlar (joyida qolganlari ham). */
  function layerTable(N, face, layer) {
    const key = N + face + layer;
    if (layerCache.has(key)) return layerCache.get(key);
    const g = geometry(N), n = FACE_DEF[face].n, size = 6 * N * N;
    const perm = identity(size), idx = [];
    for (let i = 0; i < size; i++) {
      if (layerOf(N, g.pos[i], n) !== layer) continue;
      idx.push(i);
      perm[g.index.get(rotCW(g.pos[i], n).join(','))] = i;   // i-stiker yangi joyiga o'tadi
    }
    const t = { perm, idx };
    layerCache.set(key, t);
    return t;
  }

  // ---------- 4. Yurish yozuvi (WCA): R, R', R2, Rw, r, 3Rw, 2R, M, E, S ----------
  const SLICE = { M: 'L', E: 'D', S: 'F' };   // o'rta qatlam yo'nalishi shu yuzaniki bilan bir xil
  /** Belgini {face, layers[], turns} ga aylantiradi; mumkin bo'lmasa Error. */
  function parseMove(tok, N) {
    const m = /^(\d*)([UDLRFB])(w?)(2'?|')?$|^([udlrfb])(2'?|')?$|^([MES])(2'?|')?$/.exec(tok);
    if (!m) throw new Error(`"${tok}" — noto'g'ri yurish yozuvi`);
    let face, layers = [], suf;
    if (m[2]) {
      face = m[2]; suf = m[4];
      const w = !!m[3], n = m[1] ? +m[1] : (w ? 2 : 1);
      if (n < 1 || n > N) throw new Error(`"${tok}" — ${N}×${N} kubikda bunday qatlam yo'q`);
      if (w) for (let k = 0; k < n; k++) layers.push(k); else layers.push(n - 1);
    } else if (m[5]) {
      face = m[5].toUpperCase(); suf = m[6];
      if (N < 2) throw new Error(`"${tok}" — mumkin emas`);
      layers = [0, 1];
    } else {
      face = SLICE[m[7]]; suf = m[8];
      if (N % 2 === 0) throw new Error(`"${tok}" — o'rta qatlam faqat toq o'lchamli kubikda bor`);
      layers = [(N - 1) / 2];
    }
    return { face, layers, turns: !suf ? 1 : suf === "'" ? 3 : 2 };
  }

  const moveCache = new Map();
  /** Yurish uchun {perm, idx}; har bir (N, belgi) bir marta hisoblanadi. */
  function move(N, tok) {
    const key = N + '|' + tok;
    if (moveCache.has(key)) return moveCache.get(key);
    const { face, layers, turns } = parseMove(tok, N);
    let p = identity(6 * N * N);
    const idx = [];
    for (const k of layers) { const t = layerTable(N, face, k); p = compose(p, t.perm); idx.push(...t.idx); }   // qatlamlar kesishmaydi
    const perm = turns === 2 ? compose(p, p) : turns === 3 ? invert(p) : p;
    const r = { perm, idx };
    moveCache.set(key, r);
    return r;
  }

  const toTokens = a => Array.isArray(a) ? a : String(a).trim().split(/\s+/).filter(Boolean);
  /** Yurishlar ketma-ketligini holatga qo'llaydi (alg — "R U R'" yoki massiv). */
  function applyAlg(state, N, alg) { let s = state; for (const t of toTokens(alg)) s = applyPerm(s, move(N, t).perm); return s; }

  // ---------- 5. Holat yordamchilari ----------
  /** Yechilgan holat: har stikerda o'z yuzasi indeksi (0..5). */
  const solved = N => Array.from({ length: 6 * N * N }, (_, i) => (i / (N * N)) | 0);
  /** Har yuza bir xil rangdami? */
  function isSolved(state, N) {
    const per = N * N;
    for (let f = 0; f < 6; f++) for (let k = 1; k < per; k++) if (state[f * per + k] !== state[f * per]) return false;
    return true;
  }
  /** Toq N da har yuzaning yagona markazi (kubik tutish holati bilan qulflanadi). */
  const isCenterLocked = (i, N) => N % 2 === 1 && i % (N * N) === (N * N - 1) / 2;

  const tokenOf = (face, layer, suf) => (layer ? layer + 1 : '') + face + (suf || '');
  /** N uchun barcha (yuza × qatlam × burilish) yurishlari. */
  function allMoves(N) {
    const out = [];
    for (const f of FACES) for (let k = 0; k < N; k++) for (const s of ['', "'", '2']) out.push(tokenOf(f, k, s));
    return out;
  }
  /** Tasodifiy aralashtirish. Toq N da markazlarni siljitadigan o'rta qatlam ishlatilmaydi. */
  function randomMoves(N, len, rnd) {
    rnd = rnd || Math.random;
    const layers = []; for (let k = 0; k < N; k++) if (!(N % 2 && k === (N - 1) / 2)) layers.push(k);
    const out = []; let last = '';
    while (out.length < len) {
      const f = FACES[(rnd() * 6) | 0], k = layers[(rnd() * layers.length) | 0];
      if (f + k === last) continue;
      last = f + k;
      out.push(tokenOf(f, k, ['', "'", '2'][(rnd() * 3) | 0]));
    }
    return out;
  }

  const api = { FACES, COLORS, geometry, indexAt, layerTable, parseMove, move, compose, invert, applyPerm,
                applyAlg, solved, isSolved, isCenterLocked, allMoves, randomMoves, toTokens };
  root.RubikCube = api;
  if (typeof module !== 'undefined') module.exports = api;
})(typeof self !== 'undefined' ? self : globalThis);
