/* ======================================================================
 * net.js — kubik yoyilmasi (net) chizish va stikerni bo'yash (barmoq / sichqoncha).
 * Yoyilma 4N × 3N katak: yuzalar joyi  U(1,0) L(0,1) F(1,1) R(2,1) B(3,1) D(1,2).
 * ====================================================================== */
(function (root) {
  'use strict';
  const { HEX, LETTER } = root.RubikCube.COLORS;
  const Cube = root.RubikCube;
  const FACE_POS = [[1, 0], [2, 1], [1, 1], [1, 2], [0, 1], [3, 1]];   // U R F D L B tartibida

  /** Katak o'lchami (px): ekranga sig'adigan eng kattasi. Sig'masa (scroll=true) yoyilma eni bo'yicha siljitiladi. */
  function cellSize(el, N, small) {
    const box = el.parentElement, W = (box && box.clientWidth) || 360, gap = small ? 1 : 2, pad = small ? 12 : 16, min = small ? 8 : 20, cols = 4 * N;
    const fit = Math.floor((W - pad - gap * (cols - 1)) / cols);
    return { size: Math.max(min, Math.min(small ? 18 : 34, fit)), scroll: min * cols + gap * (cols - 1) + pad > W };
  }
  /** Katak o'lchamini qo'llaydi; sig'maydigan yoyilmada touch-action siljitishga ruxsat beradi (bo'yash — faqat bosish). */
  function applySize(el, N, small, editable) {
    const z = cellSize(el, N, small);
    el.style.setProperty('--c', z.size + 'px');
    el.dataset.scroll = z.scroll ? '1' : '';
    if (editable) el.style.touchAction = z.scroll ? 'pan-x pan-y' : 'none';
  }
  /** Yoyilmani chizadi. o: {bad:Set, hl:Set, small, dim, editable}. */
  function draw(el, state, N, o) {
    o = o || {};
    const per = N * N, frag = document.createDocumentFragment();
    el.className = 'net' + (o.small ? ' sm' : '') + (o.dim ? ' dim' : '');
    el.dataset.n = N;
    el.style.setProperty('--n', N);
    el.dataset.editable = o.editable ? '1' : '';
    applySize(el, N, o.small, o.editable);
    el.style.gridTemplateColumns = `repeat(${4 * N},var(--c))`;
    el.style.gridTemplateRows = `repeat(${3 * N},var(--c))`;
    for (let i = 0; i < 6 * per; i++) {
      const f = (i / per) | 0, k = i % per, d = document.createElement('div');
      d.className = 'st' + (Cube.isCenterLocked(i, N) ? ' lock' : '') + (o.bad && o.bad.has(i) ? ' bad' : '') + (o.hl && o.hl.has(i) ? ' hl' : '');
      d.dataset.i = i;
      d.style.gridColumn = FACE_POS[f][0] * N + (k % N) + 1;
      d.style.gridRow = FACE_POS[f][1] * N + ((k / N) | 0) + 1;
      if (state[i] >= 0) { d.style.background = HEX[state[i]]; d.dataset.l = LETTER[state[i]]; }
      frag.append(d);
    }
    el.replaceChildren(frag);
  }
  /** Ekran o'lchami o'zgarganda faqat katak o'lchamini yangilaydi. */
  function fit(el) { const N = +el.dataset.n; if (N) applySize(el, N, el.classList.contains('sm'), el.dataset.editable === '1'); }
  /** Bitta stikerni qayta bo'yaydi (butun yoyilmani chizmasdan). */
  function setCell(el, i, c) {
    const d = el.children[i]; if (!d) return;
    d.style.background = c >= 0 ? HEX[c] : '';
    if (c >= 0) d.dataset.l = LETTER[c]; else delete d.dataset.l;
    d.classList.remove('bad');
  }
  /**
   * Bo'yash hodisalari. h: { begin(), paint(i), tapOnly() }.
   * Sudrab bo'yash (touch-action:none bo'lganda). tapOnly()=true bo'lsa barmoq bilan faqat bosish
   * bo'yaydi (siljitish — sahifani aylantirish), sichqoncha esa sudrab bo'yay oladi.
   */
  function bindPaint(el, h) {
    let down = false, tap = null;
    const hit = e => { const t = document.elementFromPoint(e.clientX, e.clientY); return t && t.parentNode === el && t.dataset.i !== undefined ? +t.dataset.i : -1; };
    el.addEventListener('pointerdown', e => {
      const i = hit(e); if (i < 0) return;
      if (e.pointerType === 'touch' && h.tapOnly()) { tap = { x: e.clientX, y: e.clientY, i }; return; }
      down = true; h.begin(); h.paint(i);
    });
    el.addEventListener('pointermove', e => { if (!down) return; const i = hit(e); if (i >= 0) h.paint(i); });
    el.addEventListener('pointerup', e => {
      if (tap && Math.hypot(e.clientX - tap.x, e.clientY - tap.y) < 8) { h.begin(); h.paint(tap.i); }
      tap = null;
    });
    el.addEventListener('pointercancel', () => { tap = null; down = false; });
    addEventListener('pointerup', () => { down = false; });
    addEventListener('pointercancel', () => { down = false; });
  }

  const api = { draw, fit, setCell, bindPaint, FACE_POS };
  root.RubikNet = api;
  if (typeof module !== 'undefined') module.exports = api;
})(typeof self !== 'undefined' ? self : globalThis);
