/* ======================================================================
 * solver2.js — 2×2 yechuvchi: ikki tomonlama BFS (bidirectional), stikerlar modelida.
 * Burchaklardan biri (D-L-B) qo'zg'almas deb olinadi, faqat U, R, F yuzalari buriladi
 * (har biri 90°, 180°, -90°). Maqsad holat shu burchakning ranglaridan aniqlanadi,
 * shuning uchun kubik qanday ushlab qo'yilgan bo'lishidan qat'i nazar yechiladi.
 * ====================================================================== */
(function (root) {
  'use strict';
  const Cube = root.RubikCube, { FC } = Cube.COLORS;
  const MOVES = ['U', "U'", 'U2', 'R', "R'", 'R2', 'F', "F'", 'F2'];
  const inv = t => t.length === 1 ? t + "'" : t[1] === "'" ? t[0] : t;

  /** st — 24 ta rang indeksi. Qaytaradi: yurishlar ro'yxati (HTM, ≤ 11). */
  function solve(st) {
    const N = 2, h = 1, at = p => st[Cube.indexAt(N, p)];
    // qo'zg'almas burchak D-L-B: D (y=-2), L (x=-2), B (z=-2) yuzalaridagi stikerlar
    const col = [0, 0, 0, at([-h, -N, -h]), at([-N, -h, -h]), at([-h, -h, -N])];   // faces: U R F D L B
    const opp = c => FC[(FC.indexOf(c) + 3) % 6];
    col[0] = opp(col[3]); col[1] = opp(col[4]); col[2] = opp(col[5]);
    const target = st.map((_, i) => col[(i / 4) | 0]);
    const perms = MOVES.map(t => Cube.move(N, t).perm);
    const key = s => s.join('');
    const kS = key(st), kT = key(target);
    if (kS === kT) return [];
    const F = new Map([[kS, null]]), B = new Map([[kT, null]]);   // holat → {prev, move, state}
    let ff = [st], bf = [target], fd = 0, bd = 0;
    const expand = (front, mine, other) => {
      const next = [];
      for (const s of front) {
        const ks = key(s);
        for (let m = 0; m < 9; m++) {
          const n = Cube.applyPerm(s, perms[m]), kn = key(n);
          if (mine.has(kn)) continue;
          mine.set(kn, { prev: ks, move: MOVES[m] });
          if (other.has(kn)) return { hit: kn };
          next.push(n);
        }
      }
      return { next };
    };
    for (let guard = 0; guard < 16; guard++) {
      const fwd = ff.length <= bf.length, r = fwd ? expand(ff, F, B) : expand(bf, B, F);
      if (r.hit) {
        const a = []; for (let k = r.hit, e = F.get(k); e; e = F.get(k)) { a.push(e.move); k = e.prev; }
        a.reverse();                                  // boshlang'ichdan uchrashuv nuqtasigacha
        for (let k = r.hit, e = B.get(k); e; e = B.get(k)) { a.push(inv(e.move)); k = e.prev; }   // uchrashuvdan maqsadgacha
        return a;
      }
      if (fwd) { ff = r.next; fd++; } else { bf = r.next; bd++; }
    }
    throw new Error('2×2 yechim topilmadi');
  }

  const api = { solve };
  root.RubikSolver2 = api;
  if (typeof module !== 'undefined') module.exports = api;
})(typeof self !== 'undefined' ? self : globalThis);
