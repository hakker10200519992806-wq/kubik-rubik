/* ======================================================================
 * cubie.js — 3×3 kubik "bo'lak" (cubie) modeli: burchak/qirra almashinuvi va buralishi.
 * Yuzalar tartibi URFDLB. Solver va validatsiya shu jadvallarga tayanadi;
 * foydalanuvchi holati esa stikerlar massivida (cube.js), bu yerga faqat tekshirish/yechish uchun o'giriladi.
 * ====================================================================== */
(function (root) {
'use strict';
const FL='URFDLB';
const CF=[[8,9,20],[6,18,38],[0,36,47],[2,45,11],[29,26,15],[27,44,24],[33,53,42],[35,17,51]];
const EF=[[5,10],[7,19],[3,37],[1,46],[32,16],[28,25],[30,43],[34,52],[23,12],[21,41],[50,39],[48,14]];
const CC=[[0,1,2],[0,2,4],[0,4,5],[0,5,1],[3,2,1],[3,4,2],[3,5,4],[3,1,5]];
const EC=[[0,1],[0,2],[0,4],[0,5],[3,1],[3,2],[3,4],[3,5],[2,1],[2,4],[5,4],[5,1]];
const CN=['URF','UFL','ULB','UBR','DFR','DLF','DBL','DRB'],EN=['UR','UF','UL','UB','DR','DF','DL','DB','FR','FL','BL','BR'];
const Z8=[0,0,0,0,0,0,0,0],Z12=Array(12).fill(0),ID8=[0,1,2,3,4,5,6,7],ID12=[0,1,2,3,4,5,6,7,8,9,10,11];
const BM=[
{cp:[3,0,1,2,4,5,6,7],co:Z8,ep:[3,0,1,2,4,5,6,7,8,9,10,11],eo:Z12},
{cp:[4,1,2,0,7,5,6,3],co:[2,0,0,1,1,0,0,2],ep:[8,1,2,3,11,5,6,7,4,9,10,0],eo:Z12},
{cp:[1,5,2,3,0,4,6,7],co:[1,2,0,0,2,1,0,0],ep:[0,9,2,3,4,8,6,7,1,5,10,11],eo:[0,1,0,0,0,1,0,0,1,1,0,0]},
{cp:[0,1,2,3,5,6,7,4],co:Z8,ep:[0,1,2,3,5,6,7,4,8,9,10,11],eo:Z12},
{cp:[0,2,6,3,4,1,5,7],co:[0,1,2,0,0,2,1,0],ep:[0,1,10,3,4,5,9,7,8,2,6,11],eo:Z12},
{cp:[0,1,3,7,4,5,2,6],co:[0,0,1,2,0,0,2,1],ep:[0,1,2,11,4,5,6,10,8,9,3,7],eo:[0,0,0,1,0,0,0,1,0,0,1,1]}];
const SOLVED={cp:ID8,co:Z8,ep:ID12,eo:Z12};
function mult(a,b){const cp=[],co=[],ep=[],eo=[];for(let c=0;c<8;c++){const k=b.cp[c];cp[c]=a.cp[k];co[c]=(a.co[k]+b.co[c])%3}for(let e=0;e<12;e++){const k=b.ep[e];ep[e]=a.ep[k];eo[e]=(a.eo[k]+b.eo[e])%2}return{cp,co,ep,eo}}
const M=[];BM.forEach((b,f)=>{M[f*3]=b;M[f*3+1]=mult(b,b);M[f*3+2]=mult(M[f*3+1],b)});
const mvName=m=>FL[m/3|0]+["","2","'"][m%3],mvIdx=s=>FL.indexOf(s[0])*3+(s.length===1?0:s[1]==='2'?1:2);
const isSolved=c=>c.cp.every((v,i)=>v===i)&&c.co.every(v=>!v)&&c.ep.every((v,i)=>v===i)&&c.eo.every(v=>!v);
function toFacelets(c){const f=Array(54);for(let k=0;k<6;k++)f[9*k+4]=k;for(let i=0;i<8;i++)for(let n=0;n<3;n++)f[CF[i][(n+c.co[i])%3]]=CC[c.cp[i]][n];for(let i=0;i<12;i++)for(let n=0;n<2;n++)f[EF[i][(n+c.eo[i])%2]]=EC[c.ep[i]][n];return f}
const parity=a=>{let p=0;for(let i=0;i<a.length;i++)for(let j=i+1;j<a.length;j++)if(a[i]>a[j])p^=1;return p};
const api = { FL, CF, EF, CC, EC, CN, EN, Z8, Z12, ID8, ID12, BM, SOLVED, mult, M, mvName, mvIdx, isSolved, toFacelets, parity };
root.RubikCubie = api;
if (typeof module !== 'undefined') module.exports = api;
})(typeof self !== 'undefined' ? self : globalThis);
