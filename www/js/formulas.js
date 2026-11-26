/* ======================================================================
 * formulas.js — formulalar kutubxonasi, yurish diagrammalari (mDiag), notatsiya ko'rsatmasi.
 * verifyAlg: formula haqiqatan faqat aytilgan bo'laklarga tegishini 3×3 modelida tekshiradi.
 * ====================================================================== */
(function (root) {
'use strict';
const { CN, EN, SOLVED, mult, M, mvIdx } = root.RubikCubie;
// ---- Formulani 3×3 modelida tekshirish (verifyAlg) va yurish diagrammasi (mDiag) ----
const GR=l=>{const s=new Set();CN.forEach(n=>n.includes(l)&&s.add(n));EN.forEach(n=>n.includes(l)&&s.add(n));return s};
function verifyAlg(a){let c=SOLVED;for(const t of String(a.moves).trim().split(/\s+/)){if(!/^[UDLRFB](2|')?$/.test(t))return{ok:null,why:`"${t}" 3×3 yuza yurishi emas`};c=mult(c,M[mvIdx(t)])}
 const cc=CN.filter((n,i)=>c.cp[i]!==i||c.co[i]),ee=EN.filter((n,i)=>c.ep[i]!==i||c.eo[i]),eff=`${cc.length} burchak, ${ee.length} qirra o'zgaradi`;
 if(!cc.length&&!ee.length)return{ok:false,why:"kubikni o'zgartirmaydi",eff};
 if(Array.isArray(a.touches)){const al=new Set();a.touches.forEach(t=>{if(t==='E')['FR','FL','BL','BR'].forEach(x=>al.add(x));else if(/^[UDLRFB]$/.test(t))GR(t).forEach(x=>al.add(x));else al.add(t)});
  const ex=[...cc,...ee].filter(x=>!al.has(x));if(ex.length)return{ok:false,why:"ruxsat etilmagan bo'laklarga tegadi: "+ex.join(', '),eff}}
 return{ok:true,eff}}
function mDiag(tok,N,px){N=N||3;px=px||72;
 const m=/^(\d*)([UDLRFB])(w?)(2|')?$|^([udlrfb])(2|')?$|^([MES])(2|')?$/.exec(tok);if(!m)return'';
 let L,n=1,w=false,suf;
 if(m[2]){L=m[2];w=!!m[3];n=m[1]?+m[1]:(w?2:1);suf=m[4]}else if(m[5]){L=m[5].toUpperCase();w=true;n=2;suf=m[6]}else{L=m[7];suf=m[8]}
 const dbl=suf==='2',pr=suf==="'",c=60/N,O=6,mid=Math.floor(N/2);let vert=2,lo=0,hi=N-1,dir='cw';
 if(L==='R'){vert=1;lo=N-n;hi=w?N-1:N-n;dir='up'}else if(L==='L'){vert=1;lo=w?0:n-1;hi=n-1;dir='down'}
 else if(L==='U'){vert=0;lo=w?0:n-1;hi=n-1;dir='left'}else if(L==='D'){vert=0;lo=N-n;hi=w?N-1:N-n;dir='right'}
 else if(L==='M'){vert=1;lo=hi=mid;dir='down'}else if(L==='E'){vert=0;lo=hi=mid;dir='right'}else if(L==='B')dir='ccw';
 if(pr)dir={up:'down',down:'up',left:'right',right:'left',cw:'ccw',ccw:'cw'}[dir];
 let s=`<svg viewBox="0 0 72 72" width="${px}" height="${px}" role="img" aria-label="${tok}">`;
 for(let i=0;i<N;i++)for(let j=0;j<N;j++){const h=vert===2||(vert===1&&i>=lo&&i<=hi)||(vert===0&&j>=lo&&j<=hi);s+=`<rect x="${O+i*c}" y="${O+j*c}" width="${c}" height="${c}" fill="${h?'#ffcc33':'#9097b0'}" stroke="#222"/>`}
 const R='#ff2d2d',head=(x,y,dx,dy)=>{const l=Math.hypot(dx,dy);dx/=l;dy/=l;return`<polygon points="${x+dx*7},${y+dy*7} ${x-dy*4.5},${y+dx*4.5} ${x+dy*4.5},${y-dx*4.5}" fill="${R}"/>`},
 ln=(x1,y1,x2,y2)=>`<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${R}" stroke-width="3" stroke-linecap="round"/>`+head(x2,y2,x2-x1,y2-y1);
 const offs=dbl?[-5,5]:[0];
 if(vert===1){const x=O+(lo+hi+1)/2*c;offs.forEach(o=>{s+=dir==='up'?ln(x+o,O+54,x+o,O+6):ln(x+o,O+6,x+o,O+54)})}
 else if(vert===0){const y=O+(lo+hi+1)/2*c;offs.forEach(o=>{s+=dir==='left'?ln(O+54,y+o,O+6,y+o):ln(O+6,y+o,O+54,y+o)})}
 else(dbl?[22,13]:[18]).forEach(r=>{const cw=dir==='cw',a0=(cw?-60:240)*Math.PI/180,a1=(cw?210:-30)*Math.PI/180,P=a=>[36+r*Math.cos(a),36+r*Math.sin(a)],p0=P(a0),p1=P(a1);
  s+=`<path d="M${p0[0]} ${p0[1]} A${r} ${r} 0 1 ${cw?1:0} ${p1[0]} ${p1[1]}" fill="none" stroke="${R}" stroke-width="3" stroke-linecap="round"/>`+(cw?head(p1[0],p1[1],-Math.sin(a1),Math.cos(a1)):head(p1[0],p1[1],Math.sin(a1),-Math.cos(a1)))});
 const lab=w?(n>2?n+'w':''):(n>1?''+n:'');
 if(lab){const tx=vert===1?O+(lo+hi+1)/2*c:vert===0?O+9:36,ty=vert===1?O+13:vert===0?O+(lo+hi+1)/2*c+5:40;s+=`<text x="${tx}" y="${ty}" text-anchor="middle" font-size="14" font-weight="700" fill="#111" stroke="#fff" stroke-width="3" paint-order="stroke">${lab}</text>`}
 return s+'</svg>'}
// ---- Matn va ichki formulalar ----
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const NT1=[['U',"Up (tepa): tepa yuzani yuqoridan qarab buring — old qator chapga ketadi."],['D',"Down (past): past yuzani pastdan qarab buring — old tomondan qaraganda old qator o'ngga ketadi."],['L',"Left (chap): chap yuzani pastga buring — chapdagi old ustun pastga tushadi."],['R',"Right (o'ng): o'ng yuzani sizga qarab yuqoriga 90° buring — o'ngdagi old ustun yuqoriga ko'tariladi."],['F',"Front (old): old yuzani o'ziga qarab soat mili bo'yicha buring — tepa qator o'ngga ketadi."],['B',"Back (orqa): orqa yuzani orqadan qarab soat mili bo'yicha buring. Sizga qaraganda bu soat miliga teskari ko'rinadi — tepa qator chapga ketadi."]];
const NT2=[["'","Apostrof — teskari: yuzani soat miliga teskari 90° buring. Masalan, R' — o'ng yuzani pastga qarab buring."],["2","Ikki — yarim aylanish (180°), yo'nalishi farqsiz. Masalan, R2 — o'ng yuzani ikki marta buring."],["Rw yoki r","Keng burish: yuzaga yaqin 2 ta qatlamni birga, R yo'nalishida buring (Rw = r). 3Rw — 3 ta qatlamni birga."],["2R, 3R","Ichki qatlam (4×4 dan katta kubiklarda): yuzadan sanaganda faqat 2-qatlamni (yoki 3-qatlamni) R yo'nalishida buring."]];
const NT3=[['M',"Middle: chap va o'ng orasidagi o'rta qatlam, L bilan bir xil yo'nalishda (old tomoni pastga tushadi)."],['E',"Equator: tepa va past orasidagi o'rta qatlam, D bilan bir xil yo'nalishda (old tomoni o'ngga ketadi)."],['S',"Standing: old va orqa orasidagi o'rta qatlam, F bilan bir xil yo'nalishda (tepa tomoni o'ngga ketadi)."]];
function holdSvg(COL){const ex=[30,15],ey=[-30,15],ez=[0,30];
 const q=(o,a,b,i,j,c)=>'<polygon points="'+[[i,j],[i+1,j],[i+1,j+1],[i,j+1]].map(([x,y])=>(o[0]+a[0]*x+b[0]*y)+','+(o[1]+a[1]*x+b[1]*y)).join(' ')+'" fill="'+c+'" stroke="#222" stroke-width="1.2"/>';
 const fc=(o,a,b,c)=>{let s='';for(let i=0;i<3;i++)for(let j=0;j<3;j++)s+=q(o,a,b,i,j,c);return s};
 const tx=(x,y,t,n)=>'<text x="'+x+'" y="'+y+'" text-anchor="middle" font-size="15" font-weight="700" fill="#111" stroke="#fff" stroke-width="3" paint-order="stroke">'+t+'<tspan x="'+x+'" dy="15" font-size="11">'+n+'</tspan></text>';
 return '<svg viewBox="0 0 240 165" role="img" aria-label="Kubik: tepada oq, old tomonda yashil, o\'ngda qizil">'+fc([120,20],ex,ey,COL[0])+fc([30,65],ex,ez,COL[5])+fc([210,65],ey,ez,COL[2])+tx(120,62,'U','oq')+tx(75,125,'F','yashil')+tx(165,125,'R','qizil')+'</svg>'}
// Ichki formulalar nusxasi (formulas.json bilan bir xil format)
const DEFAULT=[{"title": "Oq xoch", "goal": "Tepa yuzada oq xoch hosil qilish.", "done_when": "4 ta oq qirra tepada, har birining yon rangi o'z markaziga mos.", "algs": [{"name": "Qirrani 180° burish", "moves": "F2", "when": "Oq qirra pastda (sariq tomonda), yon rangi turgan markaz ustida bo'lsa.", "verified": false, "touches": ["F"]}]}, {"title": "Oq burchaklar", "goal": "Oq burchaklarni tepa qatlamga to'g'ri joylash.", "done_when": "Tepa qatlam to'liq oq, yon tomonlar markazlarga mos.", "algs": [{"name": "O'ng burchakni tushirish", "moves": "R U R' U'", "when": "Oq burchak tepa-o'ngda turib, uni o'z joyiga tushirish kerak (kerak bo'lsa 1–5 marta takrorlang).", "verified": false, "touches": ["U", "DFR", "FR"]}, {"name": "Chap burchakni tushirish", "moves": "L' U' L U", "when": "Oq burchak tepa-chapda turib, uni o'z joyiga tushirish kerak.", "verified": false, "touches": ["U", "DLF", "FL"]}]}, {"title": "2-qatlam", "goal": "O'rta qatlam qirralarini joyiga qo'yish.", "done_when": "Birinchi ikki qatlam to'liq yechilgan.", "algs": [{"name": "Qirrani o'ngga qo'yish", "moves": "U R U' R' U' F' U F", "when": "Tepadagi qirra old markaz rangida bo'lib, o'ngga ketishi kerak.", "verified": false, "touches": ["U", "FR"]}, {"name": "Qirrani chapga qo'yish", "moves": "U' L' U L U F U' F'", "when": "Tepadagi qirra old markaz rangida bo'lib, chapga ketishi kerak.", "verified": false, "touches": ["U", "FL"]}]}, {"title": "Sariq xoch", "goal": "Tepada (sariq) xoch hosil qilish.", "done_when": "Tepa yuzada 4 ta qirra sariq, pastki ikki qatlam buzilmagan.", "algs": [{"name": "Xoch formulasi 1", "moves": "F R U R' U' F'", "when": "Tepada nuqta, 'L' shakli yoki chiziq bor (chiziqni gorizontal, 'L' ni tepa-chapga qo'ying).", "verified": false, "touches": ["U"]}, {"name": "Xoch formulasi 2", "moves": "F U R U' R' F'", "when": "Tepada chiziq bor bo'lsa muqobil formula.", "verified": false, "touches": ["U"]}]}, {"title": "Sariq qirralarni joylash", "goal": "Sariq qirralarni yon markazlarga moslash.", "done_when": "Tepa qirralarning yon ranglari markazlariga mos.", "algs": [{"name": "Ikki qirrani almashtirish (Sune + U)", "moves": "R U R' U R U2 R' U", "when": "Tepa qirralarning faqat ikkitasi to'g'ri joyida bo'lganda.", "verified": false, "touches": ["U"]}]}, {"title": "Burchaklar joyi", "goal": "Tepa burchaklarni to'g'ri joyga olib kelish (yo'nalishidan qat'i nazar).", "done_when": "Har tepa burchak o'z uch markaziga mos joyda.", "algs": [{"name": "3 burchak siklini aylantirish", "moves": "U R U' L' U R' U' L", "when": "Kamida bitta burchak to'g'ri joyda turibdi; uni tepa-o'ngda ushlang.", "verified": false, "touches": ["UFL", "ULB", "UBR", "URF"]}]}, {"title": "Burchaklar yo'nalishi", "goal": "Tepa burchaklarni to'g'ri yo'nalishga burish.", "done_when": "Hamma narsa yechilgan.", "algs": [{"name": "Burchakni burish", "moves": "R' D' R D", "when": "Burilishi kerak burchak tepa-o'ngda; sariq stiker tepaga chiqquncha 2 yoki 4 marta takrorlang. Faqat tugatgach tepani buring.", "verified": false, "touches": ["R", "D"]}]}];
// ---- Formulalar kutubxonasini chizish ----
function renderLib(el,d,src){let h='<small>Manba: '+esc(src)+'</small>';
 d.forEach(st=>{h+='<details class="st2"><summary>'+esc(st.title)+'</summary><p><b>Maqsad:</b> '+esc(st.goal)+'</p><p><b>Tugash sharti:</b> '+esc(st.done_when)+'</p>';
  (st.algs||[]).forEach(a=>{const v=verifyAlg(a);let b;
   if(a.verified===true)b='<span class="bd g">✓ tasdiqlangan</span>';else if(v.ok===true)b='<span class="bd g">✓ to\'g\'ri (simulyatorda tekshirildi)</span>';else if(v.ok===false)b='<span class="bd r">✗ noto\'g\'ri: '+esc(v.why)+'</span>';else b='<span class="bd y">⚠ tekshirib bo\'lmadi: '+esc(v.why)+'</span>';
   h+='<div class="alg"><div><b>'+esc(a.name)+'</b> '+b+'</div><div class="chips">'+String(a.moves).trim().split(/\s+/).map(t=>'<span class="chip">'+esc(t)+'</span>').join('')+'</div><small>Qachon: '+esc(a.when)+'<br>Ta\'siri: '+esc(v.eff||'—')+'</small><details class="dgd" data-m="'+esc(a.moves)+'"><summary>Diagrammalar</summary><div class="dgs"></div></details></div>'});
  h+='</details>'});
 el.innerHTML=h;
 el.querySelectorAll('.dgd').forEach(x=>x.addEventListener('toggle',()=>{const b=x.querySelector('.dgs');if(x.open&&!b.children.length)b.innerHTML=x.dataset.m.trim().split(/\s+/).map((t,i)=>'<figure class="mf">'+mDiag(t,3,64)+'<figcaption>'+(i+1)+'. '+esc(t)+'</figcaption></figure>').join('')}))}

/** Ko'rsatma bo'limi: yozuv jadvallari va kubikni ushlash rasmi. $ — getElementById. */
function renderGuide($, COL) {
  [['nt1', NT1], ['nt2', NT2], ['nt3', NT3]].forEach(([id, a]) => { $(id).innerHTML = a.map(([k, t]) => '<b>' + k + '</b><span>' + t + '</span>').join(''); });
  $('hold').innerHTML = holdSvg(COL);
}
/** Foydalanuvchi JSON faylini o'qiydi va tuzilmasini tekshiradi. */
function readFile(file, ok, fail) {
  const r = new FileReader();
  r.onload = () => { try { const d = JSON.parse(r.result);
    if (!Array.isArray(d) || !d.every(s => s && s.title && Array.isArray(s.algs) && s.algs.every(a => a && a.name && a.moves))) throw new Error("format noto'g'ri. Kutilgan: [{title, goal, done_when, algs:[{name, moves, when, verified}]}]");
    ok(d, file.name); } catch (x) { fail(x.message); } };
  r.readAsText(file);
}
const api = { DEFAULT, verifyAlg, mDiag, renderLib, renderGuide, readFile, esc };
root.RubikFormulas = api;
if (typeof module !== 'undefined') module.exports = api;
})(typeof self !== 'undefined' ? self : globalThis);
