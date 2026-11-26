/* ======================================================================
 * validate.js — validatsiya: ranglar soni, burchak/qirra haqiqiyligi, buralish va juftlik (parity).
 *  • N = 3: to'liq tekshiruv (parse) — kubik yechiladigan holatdami (xatoli stikerlar belgilanadi).
 *  • N = 2: burchaklar to'liq; N ≥ 4: burchaklar + qirralar (markazlar soni ranglar sonidan).
 * ====================================================================== */
(function (root) {
'use strict';
const { CF, CC, EF, EC, CN, EN, parity } = root.RubikCubie;
// ---- 3×3: to'liq legal-holat tekshiruvi (g: 54 ta yuza indeksi) ----
// g: 54 ta yoq harfi indeksi (0..5). Qaytaradi {c, bad:Set, errs:[]}
function parse(g){const bad=new Set(),errs=[],cp=[],co=[],ep=[],eo=[];
 for(let i=0;i<8;i++){const t=CF[i].map(x=>g[x]);let o=t.findIndex(v=>v===0||v===3),j=-1;
  if(o>=0)j=CC.findIndex(q=>q[0]===t[o]&&q[1]===t[(o+1)%3]&&q[2]===t[(o+2)%3]);
  if(j<0){CF[i].forEach(x=>bad.add(x));errs.push(`${CN[i]} burchagi (3 ta stiker) haqiqiy burchak rang kombinatsiyasi emas — bu bo'lak kubikda bunday bo'lmaydi. Ranglarni qayta tekshiring.`)}else{cp[i]=j;co[i]=o}}
 for(let i=0;i<12;i++){const x=g[EF[i][0]],y=g[EF[i][1]];let j=EC.findIndex(q=>q[0]===x&&q[1]===y),o=0;if(j<0){j=EC.findIndex(q=>q[0]===y&&q[1]===x);o=1}
  if(j<0){EF[i].forEach(s=>bad.add(s));errs.push(`${EN[i]} qirrasi (2 ta stiker) haqiqiy qirra emas (masalan, oq-sariq yoki bir xil rang juftligi bo'lishi mumkin emas).`)}else{ep[i]=j;eo[i]=o}}
 if(!errs.length){
  [[cp,8,CF,CN,'burchak'],[ep,12,EF,EN,'qirra']].forEach(([p,n,F,N,w])=>{const seen={};p.forEach((j,i)=>{(seen[j]=seen[j]||[]).push(i)});Object.values(seen).filter(a=>a.length>1).forEach(a=>{a.forEach(i=>F[i].forEach(x=>bad.add(x)));errs.push(`Bir xil ${w} bo'lagi ${a.length} marta uchraydi: ${a.map(i=>N[i]).join(', ')}. Birini boshqa rangga o'zgartiring.`)})});
  if(!errs.length){const c={cp,co,ep,eo},ts=co.reduce((a,b)=>a+b)%3,fs=eo.reduce((a,b)=>a+b)%2;
   if(ts){co.forEach((v,i)=>v&&CF[i].forEach(x=>bad.add(x)));errs.push(`Burchak buralishi yig'indisi 3 ga karrali emas: ${ts===1?"1 ta burchak soat mili bo'yicha":"1 ta burchak soat miliga teskari"} buralgan. Belgilangan burchaklardan birini kerakli tomonga buring (stikerlarini aylantiring).`)}
   if(fs){eo.forEach((v,i)=>v&&EF[i].forEach(x=>bad.add(x)));errs.push("Qirra ag'darilishi yig'indisi toq: 1 ta qirra ag'darilgan (ikki rangi almashgan). Belgilangan qirralardan birining ikki stikerini almashtiring.")}
   if(parity(cp)!==parity(ep))errs.push("Burchak va qirra permutatsiya juftligi mos emas: 2 ta qirra (yoki 2 ta burchak) joyi almashgan. Istalgan ikkita qirra yoki burchakning joyini almashtirib ko'ring.");
   return{c,bad,errs}}}
 return{c:null,bad,errs}}

const Cube = root.RubikCube, { NAMES, FC } = Cube.COLORS;

/* ---------- 1-qadam: ranglar soni (har rang aynan N² ta) ---------- */
function counts(st, N) {
  const per = N * N, cnt = Array(6).fill(0), errs = [], bad = new Set();
  st.forEach(c => { if (c >= 0) cnt[c]++; });
  cnt.forEach((n, c) => {
    if (n === per) return;
    errs.push(`${NAMES[c]} rangi ${n} ta (aynan ${per} ta bo'lishi kerak). ${n > per ? (n - per) + " ta ortiqcha stikerni boshqa rangga o'zgartiring" : (per - n) + ' ta stiker yetishmaydi'}.`);
    st.forEach((x, i) => { if (x === c && !Cube.isCenterLocked(i, N)) bad.add(i); });
  });
  return { errs, bad };
}

/* ---------- 2-qadam (N ≠ 3): umumiy burchak/qirra tekshiruvi — geometriyadan hisoblanadi ---------- */
/** 8 ta burchak: s — 3 ta stiker, soat mili bo'yicha; birinchisi U/D yuzasidagi. */
function cornerList(N) {
  const L = [], h = N - 1;
  for (const sx of [-1, 1]) for (const sy of [-1, 1]) for (const sz of [-1, 1]) {
    const X = Cube.indexAt(N, [sx * N, sy * h, sz * h]), Y = Cube.indexAt(N, [sx * h, sy * N, sz * h]), Z = Cube.indexAt(N, [sx * h, sy * h, sz * N]);
    L.push({ name: (sy > 0 ? 'U' : 'D') + (sx > 0 ? 'R' : 'L') + (sz > 0 ? 'F' : 'B'), s: [Y, ...(sx * sy * sz > 0 ? [X, Z] : [Z, X])] });
  }
  return L;
}
/** 12·(N-2) ta qirra bo'lagi: har biri 2 ta stikerdan. */
function edgeList(N) {
  const E = [], h = N - 1;
  for (let k = 0; k < 3; k++) {
    const a = (k + 1) % 3, b = (k + 2) % 3;
    for (const sa of [-1, 1]) for (const sb of [-1, 1]) for (let t = -(N - 3); t <= N - 3; t += 2) {
      const p = [0, 0, 0], q = [0, 0, 0];
      p[a] = sa * N; p[b] = sb * h; p[k] = t; q[a] = sa * h; q[b] = sb * N; q[k] = t;
      E.push({ s: [Cube.indexAt(N, p), Cube.indexAt(N, q)] });
    }
  }
  return E;
}
const isWY = v => v === 0 || v === 3;   // g — yuza indeksi: 0 = U (oq), 3 = D (sariq)
/** Burchak kaliti: oq/sariq stikerdan boshlab aylanma tartibda; o — shu stikerning o'rni (buralish). */
function cornerKey(g, s) {
  const t = s.map(i => g[i]), o = t.findIndex(isWY);
  return o < 0 ? { key: null, o: -1 } : { key: [t[o], t[(o + 1) % 3], t[(o + 2) % 3]].join(''), o };
}
function legalN(g, N) {
  const errs = [], bad = new Set(), sg = Cube.solved(N), corners = cornerList(N), ref = new Set(), seen = {}, ors = [];
  corners.forEach(c => ref.add(cornerKey(sg, c.s).key));
  corners.forEach(c => {
    const k = cornerKey(g, c.s);
    if (!ref.has(k.key)) { c.s.forEach(i => bad.add(i)); errs.push(`${c.name} burchagi (3 ta stiker) haqiqiy burchak rang kombinatsiyasi emas — bu bo'lak kubikda bunday bo'lmaydi.`); return; }
    (seen[k.key] = seen[k.key] || []).push(c); ors.push([c, k.o]);
  });
  if (!errs.length) {
    Object.values(seen).filter(a => a.length > 1).forEach(a => { a.forEach(c => c.s.forEach(i => bad.add(i))); errs.push(`Bir xil burchak bo'lagi ${a.length} marta uchraydi: ${a.map(c => c.name).join(', ')}. Birini boshqa rangga o'zgartiring.`); });
    const ts = ors.reduce((x, [, o]) => x + o, 0) % 3;
    if (!errs.length && ts) { ors.forEach(([c, o]) => { if (o) c.s.forEach(i => bad.add(i)); }); errs.push(`Burchak buralishi yig'indisi 3 ga karrali emas: ${ts === 1 ? "1 ta burchak soat mili bo'yicha" : '1 ta burchak soat miliga teskari'} buralgan. Belgilangan burchaklardan birini kerakli tomonga buring (stikerlarini aylantiring).`); }
  }
  if (N >= 4) {   // qirralar: faqat haqiqiy 2 rangli juftliklar, har biridan N-2 tadan
    const key = (a, b) => Math.min(a, b) * 6 + Math.max(a, b), refE = new Set(), by = {}, nm = k => NAMES[FC[(k / 6) | 0]] + '–' + NAMES[FC[k % 6]];
    edgeList(N).forEach(e => refE.add(key(sg[e.s[0]], sg[e.s[1]])));
    edgeList(N).forEach(e => {
      const k = key(g[e.s[0]], g[e.s[1]]);
      if (!refE.has(k)) { e.s.forEach(i => bad.add(i)); if (errs.length < 6) errs.push(`Qirra bo'lagi (2 ta stiker) ${NAMES[FC[g[e.s[0]]]]}–${NAMES[FC[g[e.s[1]]]]} rang juftligi bo'la olmaydi.`); }
      else (by[k] = by[k] || []).push(e);
    });
    refE.forEach(k => { const a = by[k] || []; if (a.length !== N - 2) { a.forEach(e => e.s.forEach(i => bad.add(i))); if (errs.length < 6) errs.push(`${nm(k)} qirra bo'laklari ${a.length} ta (${N - 2} ta bo'lishi kerak).`); } });
  }
  return { c: null, bad, errs };
}

/* ---------- Umumiy kirish: st — rang indekslari (har stiker 0..5), N — o'lcham ---------- */
/** → { ok, errs[], bad:Set, cubie (3×3 uchun yechuvchiga beriladi), full } ; full — to'liq (yechiladi) tekshiruvmi */
function check(st, N) {
  const c = counts(st, N);
  if (c.errs.length) return { ok: false, errs: c.errs, bad: c.bad, cubie: null, full: false };
  const g = st.map(v => FC.indexOf(v));
  const r = N === 3 ? parse(g) : legalN(g, N);
  return { ok: !r.errs.length, errs: r.errs, bad: r.bad, cubie: r.c || null, full: N <= 3 };
}

const api = { counts, legal3: parse, legalN, check };
root.RubikValidate = api;
if (typeof module !== 'undefined') module.exports = api;
})(typeof self !== 'undefined' ? self : globalThis);
