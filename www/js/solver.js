/* ======================================================================
 * solver.js — Kociemba ikki bosqichli algoritm (faqat 3×3).
 * solve(cubie) → yurishlar ro'yxati (masalan ["R","U'","F2"]). Jadvallar birinchi chaqiruvda tuziladi.
 * ====================================================================== */
(function (root) {
'use strict';
const { mult, M, mvName, isSolved, Z8, Z12, ID8, ID12 } = root.RubikCubie;
// ---- Kociemba two-phase ----
let T=null;
const cnk=(()=>{const a=[];for(let i=0;i<=12;i++){a[i]=[1];for(let j=1;j<=i;j++)a[i][j]=a[i-1][j-1]+(a[i-1][j]||0)}return a})();
function pidx(a,n){let r=0;for(let i=0;i<n-1;i++){let c=0;for(let j=i+1;j<n;j++)if(a[j]<a[i])c++;r=r*(n-i)+c}return r}
function pdec(x,n){const c=[];for(let i=n-2;i>=0;i--){c[i]=x%(n-i);x=(x-c[i])/(n-i)}const av=[...Array(n).keys()],a=[];for(let i=0;i<n;i++)a.push(av.splice(c[i]||0,1)[0]);return a}
const twist=co=>{let t=0;for(let i=0;i<7;i++)t=t*3+co[i];return t},flip=eo=>{let t=0;for(let i=0;i<11;i++)t=t*2+eo[i];return t};
const smask=ep=>{let m=0;for(let i=0;i<12;i++)if(ep[i]>=8)m|=1<<i;return m};
function buildTables(){if(T)return;const SLM=[],SLI=new Map();for(let m=0;m<4096;m++){let b=0;for(let i=0;i<12;i++)b+=m>>i&1;if(b===4){SLI.set(m,SLM.length);SLM.push(m)}}
 const ALL=[...Array(18).keys()],P2=[0,1,2,9,10,11,4,7,13,16];
 const tab=(n,dec,enc,mv)=>{const t=new Int32Array(n*mv.length);for(let x=0;x<n;x++){const c=dec(x);mv.forEach((m,k)=>{t[x*mv.length+k]=enc(mult(c,M[m]))})}return t};
 const prune=(n1,n2,root,T1,T2,nm)=>{const D=new Uint8Array(n1*n2).fill(255);D[root]=0;for(let d=0,cnt=1;cnt>0;d++){cnt=0;for(let i=0;i<D.length;i++)if(D[i]===d){const a=(i/n2)|0,b=i%n2;for(let m=0;m<nm;m++){const j=T1[a*nm+m]*n2+T2[b*nm+m];if(D[j]===255){D[j]=d+1;cnt++}}}}return D};
 const dTw=x=>{const co=Array(8).fill(0);let s=0;for(let i=6;i>=0;i--){co[i]=x%3;s+=co[i];x=(x-co[i])/3}co[7]=(3-s%3)%3;return{cp:ID8,co,ep:ID12,eo:Z12}};
 const dFl=x=>{const eo=Array(12).fill(0);let s=0;for(let i=10;i>=0;i--){eo[i]=x%2;s+=eo[i];x=(x-eo[i])/2}eo[11]=s%2;return{cp:ID8,co:Z8,ep:ID12,eo}};
 const dSl=x=>{const k=SLM[x],ep=[];let a=0,b=8;for(let i=0;i<12;i++)ep[i]=k>>i&1?b++:a++;return{cp:ID8,co:Z8,ep,eo:Z12}};
 const TW=tab(2187,dTw,c=>twist(c.co),ALL),FLP=tab(2048,dFl,c=>flip(c.eo),ALL),SLT=tab(495,dSl,c=>SLI.get(smask(c.ep)),ALL);
 const S0=SLI.get(0xF00);
 const PT=prune(2187,495,S0,TW,SLT,18),PF=prune(2048,495,S0,FLP,SLT,18);
 const CPt=tab(40320,x=>({cp:pdec(x,8),co:Z8,ep:ID12,eo:Z12}),c=>pidx(c.cp,8),P2);
 const UDt=tab(40320,x=>({cp:ID8,co:Z8,ep:[...pdec(x,8),8,9,10,11],eo:Z12}),c=>pidx(c.ep.slice(0,8),8),P2);
 const SSt=tab(24,x=>({cp:ID8,co:Z8,ep:[0,1,2,3,4,5,6,7,...pdec(x,4).map(v=>v+8)],eo:Z12}),c=>pidx(c.ep.slice(8).map(v=>v-8),4),P2);
 T={SLI,S0,TW,FLP,SLT,PT,PF,CPt,UDt,SSt,P2,PC:prune(40320,24,0,CPt,SSt,10),PU:prune(40320,24,0,UDt,SSt,10)}}
function solveCube(c0){buildTables();if(isSolved(c0))return[];
 const {SLI,S0,TW,FLP,SLT,PT,PF,CPt,UDt,SSt,P2,PC,PU}=T;let path=[],found=null,maxLen=0;
 const d2=(c,u,s,depth,last,r)=>{const h=Math.max(PC[c*24+s],PU[u*24+s]);if(h>depth)return false;if(!depth)return h===0;
  for(let k=0;k<10;k++){const m=P2[k],f=m/3|0;if(f===last||(last>=3&&f===last-3))continue;r.push(m);if(d2(CPt[c*10+k],UDt[u*10+k],SSt[s*10+k],depth-1,f,r))return true;r.pop()}return false};
 const p2=()=>{let c=c0;for(const m of path)c=mult(c,M[m]);const cp=pidx(c.cp,8),ud=pidx(c.ep.slice(0,8),8),ss=pidx(c.ep.slice(8).map(v=>v-8),4),last=path.length?path[path.length-1]/3|0:-1;
  for(let d=0;d<=maxLen-path.length;d++){const r=[];if(d2(cp,ud,ss,d,last,r)){found=path.concat(r);return true}}return false};
 const d1=(t,f,s,depth,last)=>{const h=Math.max(PT[t*495+s],PF[f*495+s]);if(h>depth)return false;if(!depth)return p2();
  for(let fc=0;fc<6;fc++){if(fc===last||(last>=3&&fc===last-3))continue;for(let p=0;p<3;p++){const m=fc*3+p;path.push(m);if(d1(TW[t*18+m],FLP[f*18+m],SLT[s*18+m],depth-1,fc))return true;path.pop()}}return false};
 const t0=twist(c0.co),f0=flip(c0.eo),s0=SLI.get(smask(c0.ep));
 for(maxLen of[23,26,30])for(let d=0;d<=13;d++){path=[];if(d1(t0,f0,s0,d,-1))return found.map(mvName)}
 throw new Error('Yechim topilmadi (qidiruv chegarasi)')}
const api = { solve: solveCube };
root.RubikSolver = api;
if (typeof module !== 'undefined') module.exports = api;
})(typeof self !== 'undefined' ? self : globalThis);
