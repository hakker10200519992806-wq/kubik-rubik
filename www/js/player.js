/* ======================================================================
 * player.js — yechim pleyeri: yurishlar chiplari, oldingi/keyingi, avto-ijro.
 * Har qadam holati permutatsiya jadvallari (cube.js) bilan hisoblanadi — istalgan N uchun.
 * ====================================================================== */
(function (root) {
  'use strict';
  const Cube = root.RubikCube, Net = root.RubikNet, F = root.RubikFormulas;

  /** o: { el, N, start (rang indekslari massivi), moves[] } → { destroy() } */
  function create(o) {
    const el = o.el, N = o.N, moves = o.moves, states = [o.start];
    moves.forEach(t => states.push(Cube.applyAlg(states[states.length - 1], N, [t])));
    let step = 0, timer = null;

    el.innerHTML = '<div class="chips">' + (moves.map(t => '<span class="chip">' + t + '</span>').join('') || '<small>Kubik allaqachon yechilgan.</small>') + '</div>' +
      '<div class="row noprint"><button data-a="first" aria-label="Boshiga">⏮</button><button data-a="prev">Oldingi</button><b class="stp"></b>' +
      '<button data-a="next">Keyingi</button><button data-a="last" aria-label="Oxiriga">⏭</button><button data-a="auto">Avto-ijro ▶</button></div><div class="pv"></div>';
    const pv = el.querySelector('.pv'), stp = el.querySelector('.stp'), chips = [...el.querySelectorAll('.chip')], autoBtn = el.querySelector('[data-a=auto]');

    function stop() { if (timer) { clearInterval(timer); timer = null; } autoBtn.textContent = 'Avto-ijro ▶'; }
    function show() {
      const nx = moves[step], small = document.createElement('div'), dg = document.createElement('div');
      dg.className = 'dg';
      pv.replaceChildren(small, dg);   // avval DOM ga qo'yiladi — katak o'lchami ota-element eniga qarab hisoblanadi
      Net.draw(small, states[step], N, { small: true, dim: !!nx, hl: nx ? new Set(Cube.move(N, nx).idx) : null });
      dg.innerHTML = nx ? F.mDiag(nx, N, 84) + '<small>Keyingi yurish: <b>' + nx + '</b></small>' : '<small>Tugadi ✓</small>';
      chips.forEach((c, i) => c.classList.toggle('cur', i === step));
      stp.textContent = step + ' / ' + moves.length;
    }
    const go = n => { stop(); step = Math.max(0, Math.min(moves.length, n)); show(); };
    el.querySelector('[data-a=first]').onclick = () => go(0);
    el.querySelector('[data-a=prev]').onclick = () => go(step - 1);
    el.querySelector('[data-a=next]').onclick = () => go(step + 1);
    el.querySelector('[data-a=last]').onclick = () => go(moves.length);
    autoBtn.onclick = () => {
      if (timer) return stop();
      if (step >= moves.length) step = 0;
      show(); autoBtn.textContent = "To'xtatish ⏸";
      timer = setInterval(() => { if (step >= moves.length) return stop(); step++; show(); if (step >= moves.length) stop(); }, 900);
    };
    show();
    return { destroy() { stop(); el.innerHTML = ''; } };
  }

  const api = { create };
  root.RubikPlayer = api;
  if (typeof module !== 'undefined') module.exports = api;
})(typeof self !== 'undefined' ? self : globalThis);
