/* ======================================================================
 * app.js — interfeys: modullarni (cube, net, validate, solver, formulas, player) bog'laydi.
 * Bu faylda kubik mantig'i yo'q — faqat tugmalar, holat va xabarlar.
 * ====================================================================== */
(function () {
  'use strict';
  const $ = id => document.getElementById(id);
  const Cube = RubikCube, Net = RubikNet, Val = RubikValidate, Solver = RubikSolver, Solver2 = RubikSolver2, Fx = RubikFormulas, Player = RubikPlayer;
  const { HEX, NAMES, FC } = Cube.COLORS;

  let N = 3, st = [], undo = [], brush = 0, fillMode = false, cur = null, player = null;
  const filled = new Set();                       // "yuzani to'ldirish" rejimida bir sudrashda har yuza bir marta
  const netEl = $('net'), per = () => N * N;

  /* ---------- Holat ---------- */
  function newState() {
    st = Array(6 * per()).fill(-1);
    if (N % 2) for (let f = 0; f < 6; f++) st[f * per() + (per() - 1) / 2] = FC[f];   // toq N: markazlar qulflangan
    undo = []; cur = null;
  }
  function stopPlayer() { if (player) { player.destroy(); player = null; } }
  function info() {
    const free = 6 * per() - (N % 2 ? 6 : 0), done = st.filter(c => c >= 0).length - (N % 2 ? 6 : 0);
    $('cnt').innerHTML = "<small>Bo'yalgan: " + done + ' / ' + free + '</small>';
    $('bCheck').disabled = st.includes(-1);
    $('solveBox').hidden = true; $('msg').innerHTML = ''; stopPlayer(); $('out').innerHTML = '';
  }
  function draw(bad) { Net.draw(netEl, st, N, { bad, editable: true }); $('pt').textContent = 'Rubik kubigi ' + N + '×' + N; }
  const redraw = bad => { draw(bad); info(); };
  const showErr = m => { $('msg').innerHTML = '<div class="err">❌ ' + m + '</div>'; };

  /* ---------- O'lcham tanlash ---------- */
  for (let n = 2; n <= 11; n++) { const o = document.createElement('option'); o.value = n; o.textContent = n + '×' + n; if (n === 3) o.selected = true; $('sel').append(o); }
  $('sel').onchange = () => {
    N = +$('sel').value; newState(); redraw();
    $('hint').textContent = "Kubikni oq markaz tepada, yashil markaz oldingi tomonda qilib ushlang. " + (N % 2 ? 'Markazlar qulflangan. ' : '') +
      "Stikerni bosing yoki sudrab bo'yang." + (N > 4 ? " Yoyilma ekrandan katta bo'lsa, uni yon tomonga siljiting; stiker bosib bo'yaladi, \"🪣 Yuzani to'ldirish\" esa butun yuzani bo'yaydi." : '');
  };

  /* ---------- Palitra va bo'yash ---------- */
  NAMES.forEach((n, i) => {
    const b = document.createElement('button');
    b.style.background = HEX[i]; b.title = n; b.setAttribute('aria-label', n);
    b.onclick = () => { brush = i; [...$('pal').children].forEach((x, j) => x.classList.toggle('on', j === i)); };
    $('pal').append(b);
  });
  $('pal').children[0].classList.add('on');
  $('bFill').onclick = () => { fillMode = !fillMode; $('bFill').setAttribute('aria-pressed', fillMode); };

  const setSticker = (i, c) => { st[i] = c; Net.setCell(netEl, i, c); };
  Net.bindPaint(netEl, {
    tapOnly: () => netEl.dataset.scroll === '1',   // yoyilma ekranga sig'masa: barmoq bilan faqat bosib bo'yaladi
    begin() { undo.push(st.slice()); if (undo.length > 300) undo.shift(); filled.clear(); },
    paint(i) {
      if (Cube.isCenterLocked(i, N)) return;
      if (fillMode) {                               // butun yuzani bo'yash (qulflangan markazdan tashqari)
        const f = (i / per()) | 0; if (filled.has(f)) return; filled.add(f);
        for (let k = f * per(); k < (f + 1) * per(); k++) if (!Cube.isCenterLocked(k, N)) setSticker(k, brush);
      } else if (st[i] !== brush) setSticker(i, brush);
      info();
    },
  });
  addEventListener('resize', () => Net.fit(netEl));

  /* ---------- Tugmalar ---------- */
  $('bUndo').onclick = () => { if (undo.length) { st = undo.pop(); redraw(); } };
  $('bClear').onclick = () => { const u = undo; newState(); undo = u; undo.push(st.slice()); redraw(); };
  $('bRand').onclick = () => {                      // yechilgan holatdan permutatsiya jadvallari bilan aralashtiriladi
    undo.push(st.slice());
    st = Cube.applyAlg(Cube.solved(N), N, Cube.randomMoves(N, N === 2 ? 12 : N === 3 ? 25 : 15 * N)).map(f => FC[f]);
    redraw();
  };
  $('bAlg').onclick = () => {                       // yurishlar ketma-ketligini hozirgi holatga qo'llash (istalgan N)
    const txt = $('algIn').value.trim();
    if (!txt) return showErr('Yurishlarni yozing, masalan: R U R\' U\'');
    try {
      const next = Cube.applyAlg(st, N, txt);
      if (N % 2) for (let f = 0; f < 6; f++) if (next[f * per() + (per() - 1) / 2] !== FC[f]) throw new Error("Bu yurishlar markazlarni siljitadi (M, E, S yoki o'rta qatlam). Markazlar qulflangani uchun ularsiz yozing.");
      undo.push(st.slice()); st = next; redraw();
      $('msg').innerHTML = '<div class="ok">✓ ' + Cube.toTokens(txt).length + ' ta yurish qo\'llandi.</div>';
    } catch (e) { showErr(e.message); }
  };
  $('bCheck').onclick = () => {
    const r = Val.check(st, N); draw(r.ok ? null : r.bad); cur = null; stopPlayer(); $('out').innerHTML = '';
    if (!r.ok) {
      $('solveBox').hidden = true;
      $('msg').innerHTML = r.errs.map(m => '<div class="err">❌ ' + m + '</div>').join('') + "<small>Qizil ramka — shubhali stikerlar/bo'laklar.</small>";
      return;
    }
    cur = r.cubie;
    $('msg').innerHTML = N === 3 ? '<div class="ok">✓ Kubik haqiqiy va yechiladigan holatda.</div>'
      : r.full ? '<div class="ok">✓ Kubik haqiqiy holatda (ranglar soni, burchaklar va buralish tekshirildi).</div>'
      : "<div class=\"ok\">✓ Asosiy tekshiruvlar o'tdi (ranglar soni, burchak va qirra juftliklari). To'liq yechilish tekshiruvi faqat 3×3 va 2×2 uchun.</div>" +
        "<small>Yechuvchi hozircha faqat 2×2 va 3×3 uchun. Katta kubiklarda formula kiritib, holatni o'zgartirishingiz mumkin.</small>";
    $('solveBox').hidden = N > 3;
  };

  /* ---------- Yechish va pleyer ---------- */
  $('bFast').onclick = () => {
    stopPlayer(); $('out').innerHTML = '<div class="ok">Jadvallar tuzilmoqda va yechim qidirilmoqda… (bir necha soniya)</div>'; $('bFast').disabled = true;
    setTimeout(() => {
      try {
        const t0 = performance.now(), sol = N === 3 ? Solver.solve(cur) : Solver2.solve(st);
        // Mustaqil tekshiruv: yechim bo'lak modelida emas, stikerlar massivi + permutatsiya jadvallarida bajariladi
        if (!Cube.isSolved(Cube.applyAlg(st, N, sol), N)) throw new Error('XATO: yechim permutatsiya modelida tekshirilganda kubik yechilmadi: ' + sol.join(' '));
        $('out').innerHTML = '<div class="ok">✓ ' + sol.length + ' yurish · ' + Math.round(performance.now() - t0) + " ms · yechim stikerlar modelida bajarilib, kubik yechilgani isbotlandi.</div><div id=\"plr\"></div>";
        player = Player.create({ el: $('plr'), N, start: st.slice(), moves: sol });
      } catch (e) { console.error(e); $('out').innerHTML = '<div class="err">❌ ' + e.message + '</div>'; }
      finally { $('bFast').disabled = false; }
    }, 40);
  };

  /* ---------- Kamera: kubikni skanerlab, yoyilmani to'ldirish va darhol yechish ---------- */
  $('bCam').onclick = () => {
    if (N > 3) { showErr('Kamera skaneri hozircha faqat 2×2 va 3×3 uchun. Yuqoridan 2×2 yoki 3×3 ni tanlang.'); return; }
    RubikScan.open({
      N,
      done: (arr, note, ok) => {
        undo.push(st.slice()); st = arr; redraw(); $('bCheck').onclick();
        if (note) $('msg').insertAdjacentHTML('afterbegin', '<div class="' + (ok ? 'ok' : 'err') + '">📷 ' + note + '</div>');
        if (ok && !$('solveBox').hidden) $('bFast').onclick();   // haqiqiy holat: yechim va formula/chizma darhol chiqadi
        setTimeout(() => $('net').scrollIntoView({ behavior: 'smooth', block: 'start' }), 300);
      },
    });
  };

  /* ---------- Yorug / qorong'i rejim va chop etish ---------- */
  const THEMES = ['auto', 'light', 'dark'], TL = { auto: '🌗 Avto', light: '☀️ Yorug', dark: "🌙 Qorong'i" };
  function setTheme(t) {
    if (t === 'auto') document.documentElement.removeAttribute('data-theme'); else document.documentElement.setAttribute('data-theme', t);
    $('bTheme').textContent = TL[t]; $('bTheme').dataset.t = t;
    try { localStorage.setItem('rubikTheme', t); } catch (e) { /* xotira yopiq bo'lsa e'tiborsiz */ }
  }
  let t0 = 'auto'; try { t0 = localStorage.getItem('rubikTheme') || 'auto'; } catch (e) { /* ... */ }
  setTheme(THEMES.includes(t0) ? t0 : 'auto');
  $('bTheme').onclick = () => setTheme(THEMES[(THEMES.indexOf($('bTheme').dataset.t) + 1) % 3]);
  $('bPrint').onclick = () => window.print();

  /* ---------- Ko'rsatma va formulalar kutubxonasi ---------- */
  Fx.renderGuide($, HEX);
  Fx.renderLib($('libBody'), Fx.DEFAULT, 'ichki nusxa (fayl yuklanmagan)');
  $('fb').onclick = () => $('fj').click();
  $('fj').onchange = e => {
    const f = e.target.files[0]; if (!f) return;
    Fx.readFile(f, (d, name) => { Fx.renderLib($('libBody'), d, name); $('fjm').textContent = ''; }, m => { $('fjm').textContent = '❌ ' + m; });
    e.target.value = '';
  };

  newState(); redraw();
  $('sel').onchange();
})();
