// GuitarJemp app: fretboard rendering, editing, playback and practice.
import { TPQ, E8, COLORS, SKY, STD, DUR_NAMES, TECH, TUNINGS, TIME_SIGS } from './core/constants.js'
import {
  n, mo, setKey, onsets as coreOnsets, barTicks, durName, durFromSpec, decodeDur,
  posLabel as corePosLabel, momentAt as coreMomentAt, nextSounding as coreNext,
  prevSounding as corePrev, isValidExercise, moveMoment, dropIndex, snapDur, canMoveDot, moveDot,
  colorGroups, groupOf, moveBlock, shiftFrets,
} from './core/model.js'
import { useFlats, pcName as corePcName, noteName as coreNoteName, harmony as coreHarmony } from './core/music.js'
import { examples } from './core/exercises.js'
import { parseTextTab } from './core/texttab.js'
import { scoreInfo, scoreToExercise } from './core/scoreimport.js'
import { ensureAudio, clock, pluck, click, silence } from './audio/synth.js'
import { makeRecord, fromStorage, mergeLibrary, libraryAfterSignOut, toCloudRow, content, uuid } from './core/library.js'
import * as cloud from './cloud.js'

const $ = (s) => document.querySelector(s)
const R = 12
// Handy: Griffbrett größer und seitlich wischbar statt ganz sichtbar
const phone = () => matchMedia('(max-width:640px)').matches
let ZOOM = 2.2



/* ---------- state ---------- */
const exampleRecords=()=>examples().map(e=>makeRecord(e,{id:e.id,origin:'example'}));
const state={exs:exampleRecords(),cur:0,profile:null,mode:'edit',sel:0,caret:'after',entry:'melody',dur:{base:E8,dot:false,trip:false},
  horizon:{edit:'near',practice:'near'},labels:'finger',scale:false,frame:{edit:'full',practice:'fit'},lefty:false,speed:1,
  metro:false,countIn:true,loop:false,range:null,wait:false,trainer:false,undo:[]};
// Ziehen in der Zeitleiste und Kontextmenü
let DRAG=null,ctxOpenT=0;
const SKEY='guitarjemp.v1';
try{const raw=localStorage.getItem(SKEY);if(raw){const o=JSON.parse(raw);const recs=fromStorage(o&&o.exs);if(recs.length){state.exs=recs;state.cur=Math.max(0,Math.min(o.cur|0,recs.length-1))}}}catch(e){}
// Beschreibungen der Beispiele sind nicht editierbar: immer die aktuelle Fassung zeigen
{const fresh=Object.fromEntries(examples().map(e=>[e.id,e.desc]));state.exs.forEach(e=>{if(e.id in fresh)e.desc=fresh[e.id]})}
let saveT=0;
// Stand jeder eigenen Übung beim letzten Abgleich mit dem Konto; weicht der Inhalt ab, ist sie „dirty“.
const snaps=new Map(),snap=r=>JSON.stringify(content(r));
state.exs.forEach(r=>{if(r.origin==='mine'&&!r.dirty)snaps.set(r.id,snap(r))});
function save(){
  const r=cur();if(r&&r.origin==='mine'&&!r.dirty&&snaps.get(r.id)!==snap(r)){r.dirty=true;scheduleSync()}
  if(r&&r.origin==='mine'&&r.dirty)scheduleSync();
  if(typeof renderSyncState==='function')renderSyncState();
  clearTimeout(saveT);saveT=setTimeout(()=>{try{localStorage.setItem(SKEY,JSON.stringify({exs:state.exs,cur:state.cur}))}catch(e){}},300)}

const cur=()=>state.exs[state.cur];
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const sm=(a,b,x)=>{const t=clamp((x-a)/(b-a),0,1);return t*t*(3-2*t)};
const onsets = () => coreOnsets(cur().moments)
const barT = () => barTicks(cur().ts)
const hor = () => state.horizon[state.mode]
const frameMode = () => state.frame[state.mode]
const flats = () => useFlats(cur().key)
const pcName = (pc) => corePcName(pc, flats())
const midiOf = (d) => cur().tuning[d.s] + d.f
const noteName = (d, oct) => coreNoteName(d, cur().tuning, flats(), oct)
function colorOf(m){return m.color||cur().color||SKY}
const cgroups=()=>colorGroups(cur().moments,colorOf);
// Ausgewählte Gruppe als Block {a,b}; gilt nur, solange die Indizes gültig sind
const blk=()=>{const b=state.block,n=cur().moments.length;return b&&b.a>=0&&b.b<n&&b.a<=b.b?b:null};
const inBlk=i=>{const b=blk();return !!b&&i>=b.a&&i<=b.b};
function selectGroup(i){
  const grp=groupOf(cgroups(),i);if(!grp){toast('This note is not part of a colour group');return false}
  if(P.on||P.wait)stopPlay();
  state.block={a:grp.a,b:grp.b};selectMoment(grp.a,true);state.caret='after';renderStrip();renderMoments();if(frameMode()==='fit')updateViewBox();return true}
function stringName(s){const t=cur().tuning,nm=pcName(t[s]%12);if(s===0&&cur().inst==='guitar')return 'high '+nm;if(s===t.length-1)return 'low '+nm;return nm}
const durTicks = () => durFromSpec(state.dur)
const posLabel = (t) => corePosLabel(t, cur().ts)

const harmony = (m) => coreHarmony(m.dots, cur().tuning, flats())
function describe(m){
  if(!m)return {big:'–',sub:''};
  if(!m.dots.length)return {big:'Rest',sub:durName(m.dur)};
  if(m.dots.length===1){const d=m.dots[0];return {big:noteName(d,false),sub:stringName(d.s)+' string · '+(d.f===0?'open':'fret '+d.f)+(d.fg?' · finger '+d.fg:'')+(d.t?' · '+TECH[d.t]:'')+' · '+durName(m.dur)}}
  const h=harmony(m),notes=m.dots.slice().sort((a,b)=>b.s-a.s).map(d=>noteName(d,false)).join(' ');
  const how=m.strum?(m.strum==='d'?'strum ↓':'strum ↑'):m.dots.length+' notes together';
  return {big:h?h.name:notes,sub:(h&&h.kind!=='chord'&&h.kind!=='octaves'?h.kind+' · ':'')+how+' · '+notes+' · '+durName(m.dur)};
}

/* ---------- geometry ---------- */
let geo=null;
function buildGeo(){
  const ex=cur(),nS=ex.tuning.length,maxF=15;
  const SP=ex.inst==='bass'?(phone()?52:42):(phone()?44:36),TOP=28,EDGE=17,LEFT=34,OPEN=46,NUT=7,L=1560;
  const nutX=LEFT+OPEN,boardX=nutX+NUT;
  const wire=f=>boardX+L*(1-Math.pow(2,-f/12));
  const endX=wire(maxF)+22,W=endX+14,y0=TOP+EDGE,bottom=y0+SP*(nS-1)+EDGE,H=bottom+30;
  const X=x=>state.lefty?W-x:x;
  const sy=s=>y0+s*SP;
  const fx=f=>f===0?LEFT+OPEN/2:(wire(f-1)+wire(f))/2;
  geo={nS,maxF,SP,TOP,EDGE,LEFT,OPEN,NUT,nutX,boardX,wire,endX,W,H,y0,bottom,X,sy,fx,pos:(s,f)=>[X(fx(f)),sy(s)]};
}
function rx(a,b){const x1=geo.X(a),x2=geo.X(b);return 'x="'+Math.min(x1,x2).toFixed(1)+'" width="'+Math.abs(x2-x1).toFixed(1)+'"'}
let seed=7;const rnd=()=>{seed=(seed*16807)%2147483647;return (seed-1)/2147483646};

function renderBoard(){
  const g=geo,ex=cur();let s='';seed=11;
  s+='<defs><linearGradient id="wood" x1="0" y1="0" x2="0" y2="1"><stop offset="0" style="stop-color:var(--wood-hi)"/><stop offset=".5" style="stop-color:var(--wood-lo)"/><stop offset="1" style="stop-color:var(--wood-hi)"/></linearGradient>'+
     '<linearGradient id="fretG" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#666c67"/><stop offset=".5" stop-color="#d0d5cf"/><stop offset="1" stop-color="#666c67"/></linearGradient></defs>';
  // open-string zone
  s+='<rect '+rx(g.LEFT,g.nutX)+' y="'+g.TOP+'" height="'+(g.bottom-g.TOP)+'" rx="7" style="fill:var(--open);stroke:var(--open-line)"/>';
  s+='<text class="fretnum" x="'+g.X(g.LEFT+g.OPEN/2)+'" y="'+(g.bottom+18)+'" style="letter-spacing:.12em;font-size:8.5px">OPEN</text>';
  // board + grain
  s+='<rect '+rx(g.boardX,g.endX)+' y="'+g.TOP+'" height="'+(g.bottom-g.TOP)+'" fill="url(#wood)"/>';
  for(let k=0;k<14;k++){const y=g.TOP+4+rnd()*(g.bottom-g.TOP-8),amp=1+rnd()*2.5,ph=rnd()*6;let p='';for(let x=g.boardX;x<=g.endX;x+=40){const yy=y+Math.sin(x/120+ph)*amp;p+=(p?'L':'M')+g.X(x).toFixed(1)+' '+yy.toFixed(1)}
    s+='<path d="'+p+'" fill="none" stroke="'+(k%3?'#000':'#6b5040')+'" stroke-opacity="'+(k%3?.22:.1)+'" stroke-width="'+(.5+rnd()*1.1).toFixed(2)+'"/>'}
  // inlays
  const midY=(g.sy(0)+g.sy(g.nS-1))/2,iy=g.nS>=4?g.SP:g.SP*.6;
  [3,5,7,9,15].forEach(f=>{if(f<=g.maxF)s+='<circle cx="'+g.X(g.fx(f))+'" cy="'+midY+'" r="5.5" style="fill:var(--inlay)" opacity=".15"/>'});
  if(g.maxF>=12)[midY-iy,midY+iy].forEach(y=>s+='<circle cx="'+g.X(g.fx(12))+'" cy="'+y+'" r="5.5" style="fill:var(--inlay)" opacity=".15"/>');
  // nut + frets
  s+='<rect '+rx(g.nutX,g.boardX)+' y="'+(g.TOP-2)+'" height="'+(g.bottom-g.TOP+4)+'" rx="1.5" style="fill:var(--nut)"/>';
  for(let f=1;f<=g.maxF;f++)s+='<rect '+rx(g.wire(f)-1.5,g.wire(f)+1.5)+' y="'+g.TOP+'" height="'+(g.bottom-g.TOP)+'" fill="url(#fretG)"/>';
  // key map
  if(state.scale&&ex.key){const sc=ex.key.m==='major'?[0,2,4,5,7,9,11]:[0,2,3,5,7,8,10],set=sc.map(x=>(x+ex.key.r)%12);
    for(let st=0;st<g.nS;st++)for(let f=0;f<=g.maxF;f++){const pc=(ex.tuning[st]+f)%12;if(!set.includes(pc))continue;const [x,y]=g.pos(st,f);
      s+=pc===ex.key.r?'<circle cx="'+x+'" cy="'+y+'" r="6.5" fill="none" stroke="#e6ebe4" stroke-opacity=".38" stroke-width="1.3"/>':'<circle cx="'+x+'" cy="'+y+'" r="3.4" fill="#e6ebe4" opacity=".2"/>'}}
  // strings
  const gauges=ex.inst==='bass'?[2.6,3.2,3.8,4.4]:[1.05,1.35,1.8,2.2,2.7,3.2];
  for(let st=0;st<g.nS;st++){const y=g.sy(st),w=gauges[st]||2,wound=ex.inst==='bass'||st>=3,x1=g.X(g.LEFT+8),x2=g.X(g.endX);
    s+='<line x1="'+x1+'" x2="'+x2+'" y1="'+(y+.8)+'" y2="'+(y+.8)+'" stroke="#000" stroke-opacity=".45" stroke-width="'+w+'"/>';
    s+='<line x1="'+x1+'" x2="'+x2+'" y1="'+y+'" y2="'+y+'" style="stroke:'+(wound?'var(--string-wound)':'var(--string)')+'" stroke-width="'+w+'"/>';
    if(wound)s+='<line x1="'+x1+'" x2="'+x2+'" y1="'+y+'" y2="'+y+'" stroke="#2a251c" stroke-opacity=".55" stroke-width="'+w+'" stroke-dasharray="1 1.4"/>';
    else s+='<line x1="'+x1+'" x2="'+x2+'" y1="'+(y-w*.25)+'" y2="'+(y-w*.25)+'" stroke="#fff" stroke-opacity=".35" stroke-width=".5"/>';
    s+='<text class="tune" x="'+g.X(g.LEFT/2-2)+'" y="'+y+'">'+(st===0&&ex.inst==='guitar'?pcName(ex.tuning[st]%12).toLowerCase():pcName(ex.tuning[st]%12))+'</text>';
  }
  for(let f=1;f<=g.maxF;f++){const mk=[3,5,7,9,12,15].includes(f);s+='<text class="fretnum'+(mk?' m':'')+'" x="'+g.X(g.fx(f))+'" y="'+(g.bottom+18)+'">'+f+'</text>'}
  $('#L-board').innerHTML=s;
}

/* ---------- moments layer ---------- */
let conns={},gEls=[],lastVis=null,GROUPS={};
const nextSounding = (i, order, wrap) => coreNext(cur().moments, i, order, wrap)
const prevSounding = (i, order, wrap) => corePrev(cur().moments, i, order, wrap)
const allOrder=()=>cur().moments.map((m,i)=>i);

function visibleInfo(){
  const ms=cur().moments,N=ms.length,c=clamp(state.sel,0,N-1),h=hor(),op={};
  const b=blk();
  if(b){for(let i=b.a;i<=b.b;i++)op[i]=1;return op}
  const grp=h==='near'?groupOf(cgroups(),c):null;
  if(h==='whole'){for(let i=0;i<N;i++)op[i]=1}
  else if(grp){for(let i=grp.a;i<=grp.b;i++)op[i]=i===c?1:.82}
  else if(h==='near'){const past=[.42,.24],fut=[1,.86,.66,.48,.34];for(let d=-2;d<=4;d++){const i=c+d;if(i<0||i>=N)continue;op[i]=d<0?past[-d-1]:fut[d]}}
  else{op[c]=1;const nx=nextSounding(c,allOrder(),false);if(nx>=0)op[nx]=.5}
  return op;
}

function hullPath(pts){
  if(pts.length<2)return '';
  const p=pts.map(q=>q.slice()).sort((a,b)=>a[0]-b[0]||a[1]-b[1]);
  const cr=(o,a,b)=>(a[0]-o[0])*(b[1]-o[1])-(a[1]-o[1])*(b[0]-o[0]);
  const lo=[],up=[];
  for(const q of p){while(lo.length>=2&&cr(lo[lo.length-2],lo[lo.length-1],q)<=0)lo.pop();lo.push(q)}
  for(let i=p.length-1;i>=0;i--){const q=p[i];while(up.length>=2&&cr(up[up.length-2],up[up.length-1],q)<=0)up.pop();up.push(q)}
  const h=lo.slice(0,-1).concat(up.slice(0,-1));
  return h.map((q,i)=>(i?'L':'M')+q[0].toFixed(1)+' '+q[1].toFixed(1)).join('')+(h.length>2?'Z':'');
}
function centroid(P){return [P.reduce((a,q)=>a+q[0],0)/P.length,P.reduce((a,q)=>a+q[1],0)/P.length]}
function nearest(P,q){let b=P[0],bd=1e9;for(const p of P){const d=Math.hypot(p[0]-q[0],p[1]-q[1]);if(d<bd){bd=d;b=p}}return b}

function connSVG(id,A,B,color,o){
  const cB=centroid(B),s=nearest(A,cB),e=nearest(B,s);
  const dx=e[0]-s[0],dy=e[1]-s[1],L=Math.hypot(dx,dy);if(L<1)return '';
  const ux=dx/L,uy=dy/L,so=A.length>1?R+8:R+3,eo=B.length>1?R+9:R+5;
  if(L-so-eo<6)return '';
  const sx=s[0]+ux*so,sy=s[1]+uy*so,ex=e[0]-ux*eo,ey=e[1]-uy*eo;
  const bend=Math.min(34,L*.16),cx=(sx+ex)/2-uy*bend,cy=(sy+ey)/2+ux*bend;
  const ang=Math.atan2(ey-cy,ex-cx)*180/Math.PI,mx=(sx+2*cx+ex)/4,my=(sy+2*cy+ey)/4;
  const w=(o.w||1.7).toFixed(2);
  let out='<g class="cn" id="'+id+'" style="opacity:'+o.op+'">'+
    '<linearGradient id="gr-'+id+'" gradientUnits="userSpaceOnUse" x1="'+sx.toFixed(1)+'" y1="'+sy.toFixed(1)+'" x2="'+ex.toFixed(1)+'" y2="'+ey.toFixed(1)+'"><stop offset="0" stop-color="'+color+'" stop-opacity=".08"/><stop offset=".55" stop-color="'+color+'" stop-opacity=".45"/><stop offset="1" stop-color="'+color+'" stop-opacity=".95"/></linearGradient>'+
    '<path class="cp" d="M'+sx.toFixed(1)+' '+sy.toFixed(1)+'Q'+cx.toFixed(1)+' '+cy.toFixed(1)+' '+ex.toFixed(1)+' '+ey.toFixed(1)+'" fill="none" stroke="url(#gr-'+id+')" stroke-width="'+w+'" stroke-linecap="round"'+(o.rest?' stroke-dasharray="3 4"':'')+'/>'+
    '<path d="M-5 -3.6L0 0L-5 3.6" transform="translate('+ex.toFixed(1)+' '+ey.toFixed(1)+') rotate('+ang.toFixed(1)+')" fill="none" stroke="'+color+'" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" opacity=".9"/>';
  if(o.tech){out+='<g transform="translate('+mx.toFixed(1)+' '+my.toFixed(1)+')"><rect x="-9" y="-7.5" width="18" height="15" rx="7.5" fill="#0f1311" stroke="'+color+'" stroke-opacity=".7"/><text class="tech-t" fill="'+color+'">'+o.tech+'</text></g>'}
  return out+'</g>';
}

function renderMoments(){
  const ex=cur(),ms=ex.moments,g=geo,playing=P.on||P.wait;
  const vis=playing?null:visibleInfo();
  const sel=state.sel;
  const head=[],lists={},occ=new Map();
  ms.forEach((m,i)=>{if(!m.dots.length)return;if(!playing&&vis[i]===undefined)return;const k=playing?'i'+i:setKey(m);
    if(!occ.has(k)){occ.set(k,i);lists[i]=[i];head[i]=i}else{const h=occ.get(k);lists[h].push(i);head[i]=h}});
  GROUPS=lists;
  const opOf=i=>playing?.1:(vis[i]===undefined?0:vis[i]);
  // transitions
  let cs='';conns={};
  const order=playing?P.order:allOrder();
  const snd=order.filter(i=>ms[i].dots.length);
  const pairs=[];
  for(let k=1;k<snd.length;k++)pairs.push([snd[k-1],snd[k]]);
  if(playing&&P.looping&&snd.length>1)pairs.push([snd[snd.length-1],snd[0]]);
  const seen=new Map();
  pairs.forEach(([a,b])=>{
    const A=ms[a],B=ms[b];
    if(!playing){if(vis[a]===undefined||vis[b]===undefined)return;const ka=setKey(A),kb=setKey(B);if(ka===kb)return;const pk=ka+'>'+kb;if(seen.has(pk)){seen.get(pk).n++;return}seen.set(pk,{a,b,n:1})}
    else seen.set(a+'>'+b,{a,b,n:1});
  });
  seen.forEach((v,key)=>{
    const {a,b}=v,A=ms[a],B=ms[b];
    if(setKey(A)===setKey(B))return;
    const bd=B.dots.length===1?B.dots[0]:null,tech=bd&&['h','p','sl'].includes(bd.t)?bd.t:null;
    const rest=(b-a>1)&&ms.slice(a+1,b).some(m=>!m.dots.length);
    const op=playing?.04:Math.min(opOf(a),opOf(b))*.95;
    const id='cn'+a+'-'+b;
    cs+=connSVG(id,A.dots.map(d=>g.pos(d.s,d.f)),B.dots.map(d=>g.pos(d.s,d.f)),colorOf(B),{op:op,tech:tech,rest:rest,w:1.7+Math.min(v.n-1,3)*.55});
    conns[a+'>'+b]=id;
  });
  // moments
  let s='';const lab=state.labels;
  const drawOrder=Object.keys(lists).map(Number);
  if(!playing){const si=head[sel];if(si!==undefined){drawOrder.splice(drawOrder.indexOf(si),1);drawOrder.push(si)}}
  drawOrder.forEach(i=>{
    const m=ms[i],c=colorOf(m),list=lists[i],pts=m.dots.map(d=>g.pos(d.s,d.f));
    const isSel=!playing&&head[sel]===i;
    s+='<g class="mg'+(isSel?' sel':'')+'" id="mg-'+i+'" style="opacity:'+opOf(i)+'">';
    if(pts.length>1)s+='<g opacity=".19"><path d="'+hullPath(pts)+'" fill="'+c+'" stroke="'+c+'" stroke-width="'+(2*(R+6))+'" stroke-linejoin="round" stroke-linecap="round"/></g>';
    m.dots.forEach((d,k)=>{
      const [x,y]=pts[k],open=d.f===0;
      let t='';
      if(lab==='order'){if(pts.length===1)t=String(list[0]+1)}
      else if(lab==='finger')t=open?'':(d.fg?String(d.fg):'');
      else t=noteName(d,false);
      s+='<g transform="translate('+x.toFixed(1)+' '+y+')"><circle class="sring" r="'+(R+4.5)+'"/><circle class="nring" r="'+(R+5)+'"/><circle class="cring" r="'+(R+4)+'"/>'+
        '<g class="dotb">'+(open?'<circle r="'+(R-1.4)+'" style="fill:var(--open)" stroke="'+c+'" stroke-width="3"/>':'<circle r="'+R+'" fill="'+c+'"/>')+
        (t?'<text class="dot-t" fill="'+(open?c:'#0d110f')+'"'+(t.length>2?' style="font-size:8.5px"':'')+'>'+t+'</text>':'')+'</g>';
      if(d.t==='b'||d.t==='~')s+='<text class="tech-t" x="'+(R+5)+'" y="'+(-R-3)+'" fill="'+c+'">'+(d.t==='b'?'b↑':'~')+'</text>';
      s+='</g>';
    });
    // badge
    let badge='';
    if(m.strum&&list.length>1){let pat='';list.forEach((j,k)=>{if(k&&j-list[k-1]>1&&ms.slice(list[k-1]+1,j).some(q=>!q.dots.length))pat+='·';pat+=ms[j].strum==='u'?'↑':ms[j].strum==='d'?'↓':'•'});badge=pat}
    if(m.strum&&list.length===1)badge=(badge?badge+' ':'')+(m.strum==='u'?'↑':'↓');
    if(badge&&!(pts.length===1&&list.length===1)){
      const minY=Math.min(...pts.map(p=>p[1])),top=pts.filter(p=>p[1]===minY),bx=centroid(top)[0],by=minY-R-12;
      const w=Math.max(18,badge.length*6+10);
      s+='<g transform="translate('+bx.toFixed(1)+' '+by+')"><rect x="'+(-w/2)+'" y="-7.5" width="'+w+'" height="15" rx="7.5" fill="#0d110f" fill-opacity=".85" stroke="'+c+'" stroke-opacity=".28"/><text class="badge-t" fill="'+c+'">'+badge+'</text></g>';
    }
    s+='</g>';
  });
  // Farbgruppen: weiche Fläche um alle sichtbaren Töne einer Gruppe
  let gs='';
  if(!playing)cgroups().forEach(grp=>{
    const idx=[];for(let i=grp.a;i<=grp.b;i++)if(ms[i].dots.length&&vis[i]!==undefined)idx.push(i);
    if(idx.length<2)return;
    const seenP=new Set(),pts=[];idx.forEach(i=>ms[i].dots.forEach(d=>{const k=d.s+':'+d.f;if(!seenP.has(k)){seenP.add(k);pts.push(g.pos(d.s,d.f))}}));
    const bk=blk(),on_=bk&&bk.a===grp.a&&bk.b===grp.b,op=(Math.min(...idx.map(opOf))*(on_?.3:.13)).toFixed(3),sw=2*(R+11);
    gs+='<g class="cgrp" style="opacity:'+op+'">'+(pts.length>1?'<path d="'+hullPath(pts)+'" fill="'+grp.color+'" stroke="'+grp.color+'" stroke-width="'+sw+'" stroke-linejoin="round" stroke-linecap="round"/>':'<circle cx="'+pts[0][0]+'" cy="'+pts[0][1]+'" r="'+(R+11)+'" fill="'+grp.color+'"/>')+'</g>';
  });
  $('#L-moments').innerHTML=gs+cs+s;
  gEls=[];ms.forEach((m,i)=>{gEls[i]=document.getElementById('mg-'+i)});
  for(const k in conns){const el=document.getElementById(conns[k]);conns[k]={el:el,path:el?el.querySelector('.cp'):null,len:0,op:-1}}
  gEls.forEach(el=>{if(el){el._op=-1;el._cls=''}});
  $('#emptyHint').classList.toggle('show',state.mode==='edit'&&!ms.length);
}

function updateViewBox(){
  const g=geo,ms=cur().moments;let x0=0,x1=g.W;
  if(phone()){$('#board').setAttribute('viewBox','0 0 '+g.W+' '+g.H);$('#board').style.width=Math.round($('#boardScroll').clientWidth*ZOOM)+'px';placeNames();return}
  $('#board').style.width='';$('#strNames').innerHTML='';
  if(frameMode()==='fit'){const fr=[];let open=false;ms.forEach(m=>m.dots.forEach(d=>{if(d.f===0)open=true;else fr.push(d.f)}));
    if(fr.length||open){const mn=fr.length?Math.min(...fr):1,mx=fr.length?Math.max(...fr):3;let lf=(open||mn<=3)?0:mn-1;let rf=Math.min(g.maxF,Math.max(mx+1,lf+5));
      if(rf-lf<5)lf=Math.max(0,rf-5);
      const a=lf===0?0:g.wire(lf-1)-10,b=rf>=g.maxF?g.W:g.wire(rf)+10;
      if(state.lefty){x0=g.W-b;x1=g.W-a}else{x0=a;x1=b}}}
  $('#board').setAttribute('viewBox',x0.toFixed(1)+' 0 '+(x1-x0).toFixed(1)+' '+g.H);
}

/* Handy: Saitennamen am linken Rand, sobald der Sattel aus dem Bild ist */
const bscale=()=>$('#board').getBoundingClientRect().width/geo.W;
function placeNames(){
  const el=$('#strNames');if(!phone()){el.innerHTML='';return}
  const ex=cur(),k=bscale(),top=$('#board').getBoundingClientRect().top-$('.board-wrap').getBoundingClientRect().top;
  el.innerHTML=ex.tuning.map((t,st)=>'<span style="top:'+(top+geo.sy(st)*k).toFixed(1)+'px">'+(st===0&&ex.inst==='guitar'?pcName(t%12).toLowerCase():pcName(t%12))+'</span>').join('');
  showNames();
}
function showNames(){const sc=$('#boardScroll'),open=geo.X(geo.nutX)*bscale();$('#strNames').classList.toggle('show',state.lefty?sc.scrollLeft+sc.clientWidth<open-10:sc.scrollLeft>open-10)}
// Den ausgewählten Moment ins Bild holen
function follow(i,instant){
  if(!phone()||!geo)return;const m=cur().moments[i];if(!m||!m.dots.length)return;
  const sc=$('#boardScroll'),k=bscale(),xs=m.dots.map(d=>geo.pos(d.s,d.f)[0]*k);
  const a=Math.min(...xs)-30,b=Math.max(...xs)+30;
  if(a>=sc.scrollLeft&&b<=sc.scrollLeft+sc.clientWidth)return;
  const to=Math.max(0,(a+b)/2-sc.clientWidth/2);
  sc.scrollTo({left:to,behavior:instant?'auto':'smooth'});
}
{const sc=$('#boardScroll');sc.addEventListener('scroll',()=>{if(phone())showNames()},{passive:true});
  let pin=null;const dist=t=>Math.hypot(t[0].clientX-t[1].clientX,t[0].clientY-t[1].clientY);
  sc.addEventListener('touchstart',e=>{if(e.touches.length!==2||!phone())return;if(DOT)endDot(false);
    const r=sc.getBoundingClientRect(),mx=(e.touches[0].clientX+e.touches[1].clientX)/2-r.left;
    pin={d0:dist(e.touches),z0:ZOOM,frac:(sc.scrollLeft+mx)/$('#board').getBoundingClientRect().width,mx}},{passive:true});
  sc.addEventListener('touchmove',e=>{if(!pin||e.touches.length!==2)return;e.preventDefault();
    ZOOM=clamp(pin.z0*dist(e.touches)/pin.d0,1,4);const w=Math.round(sc.clientWidth*ZOOM);$('#board').style.width=w+'px';
    sc.scrollLeft=pin.frac*w-pin.mx;placeNames()},{passive:false});
  sc.addEventListener('touchend',e=>{if(pin&&e.touches.length<2){pin=null;noClickUntil=performance.now()+300}},{passive:true});}

/* ---------- time strip ---------- */
const ST={ppt:3,H:66,top:15};
function renderStrip(){
  const ex=cur(),ms=ex.moments,on=onsets(),bt=barT(),nS=ex.tuning.length;
  const wrap=$('#stripWrap'),W0=Math.max(240,wrap.clientWidth-2);
  const groups=cgroups(),T=groups.length?15:0;
  const H=(state.mode==='practice'?58:68)+T,top=16+T,bot=6,lh=(H-top-bot)/nS;
  const tot=Math.max(on.total,bt),span=Math.ceil((tot+(state.mode==='edit'?TPQ:0))/TPQ)*TPQ;
  const ppt=Math.max((W0-16)/span,1.9),W=Math.ceil(16+span*ppt);
  Object.assign(ST,{ppt,H,top,lh});
  const X=t=>8+t*ppt;let s='';
  for(let t=0;t<=span;t+=TPQ){const isBar=t%bt===0;s+='<line x1="'+X(t)+'" x2="'+X(t)+'" y1="'+(isBar?2+T:top)+'" y2="'+(H-2)+'" stroke="#e6ebe4" stroke-opacity="'+(isBar?.18:.06)+'"/>';
    if(t<span)s+='<text class="strip-t" x="'+(X(t)+3)+'" y="'+(11+T)+'"'+(isBar?' style="fill:#919d95"':'')+'>'+(isBar?(t/bt+1):((t%bt)/TPQ+1))+'</text>'}
  for(let st=0;st<nS;st++)s+='<line x1="8" x2="'+X(span)+'" y1="'+(top+(st+.5)*lh)+'" y2="'+(top+(st+.5)*lh)+'" stroke="#e6ebe4" stroke-opacity=".035"/>';
  if(state.range){const a=Math.min(state.range[0],state.range[1]),b=Math.max(state.range[0],state.range[1]);if(ms[a]&&ms[b])s+='<rect x="'+X(on[a])+'" y="1" width="'+(X(on[b]+ms[b].dur)-X(on[a]))+'" height="'+(H-2)+'" rx="6" fill="#d8b46a" fill-opacity=".09" stroke="#d8b46a" stroke-opacity=".55" stroke-dasharray="4 3"/>'}
  const bk=blk();
  groups.forEach(grp=>{
    const x0=X(on[grp.a])-1,x1=X(on[grp.b]+ms[grp.b].dur)+1,y0=T,h=H-bot+2-T,w=x1-x0,c=grp.color;
    const sel=bk&&bk.a===grp.a&&bk.b===grp.b;
    s+='<rect class="cgrp" x="'+x0+'" y="'+y0+'" width="'+w+'" height="'+h+'" rx="7" fill="'+c+'" fill-opacity="'+(sel?.12:.06)+'" stroke="'+c+'" stroke-opacity="'+(sel?.95:.5)+'" stroke-width="'+(sel?2:1.2)+'"/>';
    // Reiter: wählt die ganze Gruppe aus
    const ty=2,r=6;
    s+='<g class="gtab" data-gtab="'+grp.a+'"><title>Select group ('+grp.count+' notes)</title><path d="M'+x0+' '+(y0+1)+'V'+(ty+r)+'Q'+x0+' '+ty+' '+(x0+r)+' '+ty+'H'+(x1-r)+'Q'+x1+' '+ty+' '+x1+' '+(ty+r)+'V'+(y0+1)+'Z" fill="'+c+'" fill-opacity="'+(sel?.95:.3)+'"/>'+
      (w>34?'<text class="gtab-t" x="'+(x0+8)+'" y="'+(ty+9.5)+'" fill="'+(sel?'#0d110f':c)+'">'+(w>90?'Group · ':'')+grp.count+'</text>':'')+'</g>';
  });
  ms.forEach((m,i)=>{
    const x=X(on[i])+1,w=Math.max(3,m.dur*ppt-2),c=colorOf(m);
    if(!m.dots.length){s+='<rect x="'+x+'" y="'+(top+2)+'" width="'+w+'" height="'+(H-top-bot-4)+'" rx="4" fill="none" stroke="#919d95" stroke-opacity=".35" stroke-dasharray="3 3"/>';
      if(w>26)s+='<text class="strip-t" x="'+(x+w/2)+'" y="'+(top+(H-top-bot)/2+3)+'" text-anchor="middle">rest</text>';}
    else{s+='<rect x="'+x+'" y="'+(top+1)+'" width="'+w+'" height="'+(H-top-bot-2)+'" rx="4" fill="'+c+'" fill-opacity=".08"/>';
      s+='<rect x="'+x+'" y="'+(top+1)+'" width="2" height="'+(H-top-bot-2)+'" rx="1" fill="'+c+'" fill-opacity=".8"/>';
      m.dots.forEach(d=>{const y=top+(d.s+.5)*lh;s+='<rect x="'+(x+3)+'" y="'+(y-1.6)+'" width="'+Math.max(2,w-6)+'" height="3.2" rx="1.6" fill="'+c+'" fill-opacity=".55"/><circle cx="'+(x+4.5)+'" cy="'+y+'" r="2.8" fill="'+c+'"/>'})}
    if(DRAG&&DRAG.moved&&((DRAG.mode==='move'&&i===DRAG.i)||(DRAG.mode==='moveblock'&&inBlk(i))))s+='<rect x="'+(x-1)+'" y="'+(top-1)+'" width="'+(w+2)+'" height="'+(H-top-bot+2)+'" rx="5" fill="#0f1311" fill-opacity=".55"/>';
    if(i===state.sel&&!(P.on)&&!inBlk(i))s+='<rect x="'+(x-1.5)+'" y="'+(top-1)+'" width="'+(w+3)+'" height="'+(H-top-bot+2)+'" rx="5" fill="none" stroke="#fff" stroke-opacity=".75" stroke-width="1.3"'+(state.mode==='edit'&&state.caret==='inside'?'':' stroke-dasharray="none"')+'/>';
  });
  if(state.mode==='edit'&&!P.on&&!blk()){
    const sel=state.sel,cx=ms.length?(state.caret==='after'?X(on[sel]+ms[sel].dur):null):X(0);
    if(cx!=null)s+='<line x1="'+(cx+1)+'" x2="'+(cx+1)+'" y1="'+(top-2)+'" y2="'+(H-3)+'" stroke="#d8b46a" stroke-width="2"/><path d="M'+(cx-3)+' '+(top-6)+'h8l-4 5z" fill="#d8b46a"/>';
  }
  if(DRAG&&(DRAG.mode==='move'||DRAG.mode==='moveblock')&&DRAG.moved&&DRAG.to!=null){const tx=DRAG.to>=ms.length?on.total:on[DRAG.to];s+='<line x1="'+(X(tx)+1)+'" x2="'+(X(tx)+1)+'" y1="2" y2="'+(H-2)+'" stroke="#d8b46a" stroke-width="3" stroke-linecap="round"/><circle cx="'+(X(tx)+1)+'" cy="4" r="4" fill="#d8b46a"/>'}
  if(DRAG&&DRAG.mode==='resize'&&DRAG.moved&&ms[DRAG.i]){const ex2=X(on[DRAG.i]+ms[DRAG.i].dur);s+='<text class="strip-t" x="'+(ex2+4)+'" y="'+(H-8)+'" style="fill:#d8b46a">'+durName(ms[DRAG.i].dur)+'</text>'}
  s+='<line id="ph" x1="0" x2="0" y1="1" y2="'+(H-1)+'" stroke="#d8b46a" stroke-width="2" opacity="0"/>';
  const svg=$('#strip');svg.setAttribute('width',W);svg.setAttribute('height',H);svg.setAttribute('viewBox','0 0 '+W+' '+H);svg.innerHTML=s;
}
function stripTickAt(clientX){const r=$('#strip').getBoundingClientRect();return (clientX-r.left-8)/ST.ppt}
const momentAt = (t) => coreMomentAt(cur().moments, onsets(), t)
function scrollStripTo(t){const wrap=$('#stripWrap'),x=8+t*ST.ppt;if(x<wrap.scrollLeft+20||x>wrap.scrollLeft+wrap.clientWidth-40)wrap.scrollLeft=Math.max(0,x-wrap.clientWidth*.3)}


function playMoment(i,when,spt){
  const m=cur().moments[i];if(!m||!m.dots.length)return;
  const ds=m.dots.slice().sort((a,b)=>m.strum==='u'?a.s-b.s:b.s-a.s),st=m.strum?.016:.004,dur=m.dur*spt;
  ds.forEach((d,k)=>pluck(midiOf(d),when+k*st,dur,(m.strum==='u'?.7:.92)*(d.t==='h'||d.t==='p'||d.t==='sl'?.6:1)));
}

/* ---------- playback ---------- */
const P={on:false,wait:false,order:[],looping:false};
const spt=()=>60/(cur().bpm*state.speed)/TPQ;
function playRange(){
  const ms=cur().moments,on=onsets(),bt=barT(),sel=clamp(state.sel,0,ms.length-1);let rs=0,re=on.total;
  if(state.loop){if(state.range){const a=Math.min(...state.range),b=Math.max(...state.range);rs=on[a];re=on[b]+ms[b].dur}else{rs=Math.floor(on[sel]/bt)*bt;re=Math.min(on.total,rs+bt)}}
  return {rs,re,on,sel};
}
function play(){
  const ms=cur().moments;if(!ms.length||!ms.some(m=>m.dots.length))return;
  if(state.mode==='practice'&&state.wait){startWait();return}
  ensureAudio();
  const {rs,re,on,sel}=playRange();
  let start=(on[sel]>=rs&&on[sel]<re)?on[sel]:rs;
  if(!state.loop&&state.mode==='edit'&&sel>=ms.length-1)start=0;
  P.rs=rs;P.len=re-rs;P.looping=state.loop;P.on_=on;
  P.order=ms.map((m,i)=>i).filter(i=>on[i]>=rs&&on[i]<re);
  P.qi=P.order.findIndex(i=>on[i]>=start);if(P.qi<0)P.qi=0;
  P.pass=0;P.done=false;P.spt=spt();
  const now=clock(),beat=TPQ*P.spt;P.v0=start-rs;let lead=.08;
  if(state.countIn){const nb=cur().ts[0];for(let k=0;k<nb;k++)click(now+lead+k*beat,k===0);lead+=nb*beat}
  P.anchorT=now+lead;P.anchorV=P.v0;P.nb=P.v0+((TPQ-((rs+P.v0)%TPQ))%TPQ);
  P.on=true;P.lastKey=null;P.lastPass=0;P.lastCur=-2;
  document.body.classList.add('playing');
  renderMoments();renderStrip();
  P.timer=setInterval(sched,25);sched();P.raf=requestAnimationFrame(frame);renderTransport();
}
function vNow(t){return P.anchorV+(t-P.anchorT)/P.spt}
function vToT(v){return P.anchorT+(v-P.anchorV)*P.spt}
function sched(){
  if(!P.on)return;const on=P.on_,hv=vNow(clock()+.14);
  while(!P.done){const i=P.order[P.qi],ev=P.pass*P.len+(on[i]-P.rs);if(ev>hv)break;
    playMoment(i,vToT(ev),P.spt);P.qi++;
    if(P.qi>=P.order.length){if(P.looping){P.qi=0;P.pass++}else P.done=true}}
  while(P.nb<=hv){if(state.metro&&(P.looping||P.nb<P.len)){const tk=P.rs+(((P.nb%P.len)+P.len)%P.len);click(vToT(P.nb),tk%barT()===0)}P.nb+=TPQ}
}
function setTempoLive(){if(!P.on)return;const now=clock();if(now>P.anchorT){P.anchorV=vNow(now);P.anchorT=now}P.spt=spt()}
function frame(){
  if(!P.on)return;
  const now=clock(),v=vNow(now),ms=cur().moments,on=P.on_;
  const ci=$('#countin');
  if(now<P.anchorT){const left=Math.ceil((P.anchorT-now)/(TPQ*P.spt));ci.textContent=left;ci.classList.add('show');
    const first=P.order[P.qi]!==undefined?P.order[P.qi]:P.order[0];const f=ms[first].dots.length?first:nextSounding(first,P.order,P.looping);
    applyPlay(-1,0,f,-1);P.raf=requestAnimationFrame(frame);return}
  ci.classList.remove('show');
  if(!P.looping&&v>=P.len){stopPlay(true);return}
  const pass=Math.floor(v/P.len),tick=P.rs+(((v%P.len)+P.len)%P.len);
  if(pass>P.lastPass){P.lastPass=pass;if(state.trainer&&state.speed<1){state.speed=Math.min(1,+(state.speed+.05).toFixed(2));setTempoLive();renderTransport()}}
  let c=momentAt(tick);if(c<0){P.raf=requestAnimationFrame(frame);return}
  const p=(tick-on[c])/ms[c].dur;
  const nx=nextSounding(c,P.order,P.looping),pv=prevSounding(c,P.order,P.looping);
  const key=pass+':'+c;
  if(key!==P.lastKey){P.lastKey=key;if(ms[c].dots.length)spawnPulse(c);renderNow(c,nx);state.sel=c;follow(nx>=0&&ms[c].dots.length===0?nx:c)}
  applyPlay(c,p,nx,pv);
  const ph=$('#ph');if(ph){const x=8+tick*ST.ppt;ph.setAttribute('x1',x);ph.setAttribute('x2',x);ph.setAttribute('opacity',1)}
  if(Math.floor(now*4)!==P._sc){P._sc=Math.floor(now*4);scrollStripTo(tick)}
  P.raf=requestAnimationFrame(frame);
}
function setOp(el,op,cls){if(!el)return;if(Math.abs(el._op-op)>.008){el.style.opacity=op.toFixed(3);el._op=op}if(cls!==undefined&&el._cls!==cls){el.setAttribute('class','mg'+(cls?' '+cls:''));el._cls=cls}}
function applyPlay(c,p,nx,pv,noComet){
  const ms=cur().moments,h=hor();
  for(let i=0;i<gEls.length;i++){const el=gEls[i];if(!el)continue;let op,cls='';
    if(i===c){op=1;cls='cur'}
    else if(i===nx){op=.22+.62*sm(.35,1,p);cls='next'}
    else if(i===pv){op=.1+.5*(1-sm(0,.45,p))}
    else{if(h==='whole')op=.1;else if(h==='near'){const d=P.order.indexOf(i)-P.order.indexOf(c);op=d>0&&d<=4?.14-.02*d:.04}else op=0}
    setOp(el,op,cls)}
  const cs=c>=0&&ms[c].dots.length?c:pv;
  const inK=pv+'>'+c,outK=cs+'>'+nx;
  for(const k in conns){const o=conns[k];if(!o.el)continue;let op;
    if(k===outK)op=.12+.83*sm(.2,1,p);
    else if(k===inK&&c>=0&&ms[c].dots.length)op=.15+.75*(1-sm(0,.6,p));
    else op=h==='whole'?.05:0;
    if(Math.abs(o.op-op)>.008){o.el.style.opacity=op.toFixed(3);o.op=op}}
  const cm=$('#comet');
  const o=conns[outK];
  if(!noComet&&cm&&o&&o.path&&p>.4&&c>=0){if(!o.len)o.len=o.path.getTotalLength();const e=sm(.4,1,p),pt=o.path.getPointAtLength(o.len*e);
    cm.setAttribute('cx',pt.x);cm.setAttribute('cy',pt.y);cm.setAttribute('fill',colorOf(ms[nx]));cm.setAttribute('opacity',.35+.6*Math.sin(Math.PI*e))}
  else if(cm)cm.setAttribute('opacity',0);
}
function spawnPulse(i){
  const m=cur().moments[i],c=colorOf(m),fx=$('#L-fx'),el=gEls[i];
  m.dots.forEach(d=>{const [x,y]=geo.pos(d.s,d.f);const ci=document.createElementNS('http://www.w3.org/2000/svg','circle');
    ci.setAttribute('cx',x);ci.setAttribute('cy',y);ci.setAttribute('r',R+2);ci.setAttribute('class','pulse');ci.setAttribute('stroke',c);
    ci.addEventListener('animationend',()=>ci.remove());fx.appendChild(ci)});
  if(el){el.querySelectorAll('.dotb').forEach(b=>{b.classList.remove('hit');void b.getBBox();b.classList.add('hit')});el.parentNode.appendChild(el)}
}
function stopPlay(ended){
  if(P.on){P.on=false;clearInterval(P.timer);cancelAnimationFrame(P.raf);if(!ended)silence()}
  if(P.wait){P.wait=false}
  $('#countin').classList.remove('show');
  document.body.classList.remove('playing');
  $('#L-fx').innerHTML='<circle id="comet" r="4.5" opacity="0"/>';
  if(ended)state.sel=0;
  renderMoments();renderStrip();renderInspector();renderTransport();renderNow(state.sel,nextSounding(state.sel,allOrder(),false));updatePos();
}
/* step-through */
function startWait(){
  ensureAudio();const ms=cur().moments,{rs,re,on}=playRange();
  P.order=ms.map((m,i)=>i).filter(i=>on[i]>=rs&&on[i]<re);P.looping=true;P.wait=true;P.spt=spt();
  let i=clamp(state.sel,0,ms.length-1);if(!P.order.includes(i))i=P.order[0];if(!ms[i].dots.length)i=nextSounding(i,P.order,true);
  P.wi=i;document.body.classList.add('playing');renderMoments();renderStrip();waitShow();renderTransport();
}
function waitStep(dir){if(!P.wait)return;const f=dir>0?nextSounding:prevSounding;const j=f(P.wi,P.order,true);if(j>=0)P.wi=j;waitShow()}
function waitShow(){
  const i=P.wi,on=onsets(),nx=nextSounding(i,P.order,true),pv=prevSounding(i,P.order,true);
  state.sel=i;follow(i);applyPlay(i,.62,nx,pv,true);spawnPulse(i);playMoment(i,clock()+.01,spt());renderNow(i,nx);
  const ph=$('#ph');if(ph){const x=8+on[i]*ST.ppt;ph.setAttribute('x1',x);ph.setAttribute('x2',x);ph.setAttribute('opacity',1)}
  scrollStripTo(on[i]);
}

/* ---------- panels ---------- */
const ICON_PLAY='<svg width="20" height="20" viewBox="0 0 24 24"><path d="M8 5.2v13.6L19 12z" fill="currentColor"/></svg>';
const ICON_PAUSE='<svg width="20" height="20" viewBox="0 0 24 24"><rect x="6.5" y="5" width="4" height="14" rx="1" fill="currentColor"/><rect x="13.5" y="5" width="4" height="14" rx="1" fill="currentColor"/></svg>';
function renderTransport(){
  const running=P.on||P.wait,ms=cur().moments;
  $('#playBtn').innerHTML=running?ICON_PAUSE:ICON_PLAY;$('#playBtn').setAttribute('aria-label',running?'Pause':'Play');
  $('#playBtn').disabled=!ms.some(m=>m.dots.length);
  $('#tempoV').innerHTML=Math.round(cur().bpm*state.speed)+' <small>bpm'+(state.speed!==1?' '+Math.round(state.speed*100)+'%':'')+'</small>';
  $('#metroBtn').setAttribute('aria-pressed',state.metro);$('#countBtn').setAttribute('aria-pressed',state.countIn);
  $('#loopBtn').setAttribute('aria-pressed',state.loop);$('#waitBtn').setAttribute('aria-pressed',state.wait);$('#trainBtn').setAttribute('aria-pressed',state.trainer);
  const ll=state.loop?(state.range?'Loop passage':'Loop bar'):'Loop';$('#loopBtn .lb').textContent=ll;$('#loopBtn').title=ll+' (L)';
}
function segSet(sel,v){document.querySelectorAll(sel+' button').forEach(b=>b.setAttribute('aria-pressed',String((b.dataset.v||b.dataset.mode)===v)))}
function renderHead(){
  const ex=cur(),t=$('#exTitle');t.value=ex.title;t.readOnly=state.mode==='practice';
  const keyName=ex.key?pcName(ex.key.r)+(ex.key.m==='minor'?' minor':' major'):'';
  $('#exMeta').textContent=[(ex.inst==='bass'?'Bass':'Guitar')+' · '+ex.tuningName,keyName,ex.bpm+' bpm',ex.ts.join('/'),ex.tag].filter(Boolean).join('   ·   ');
  const d=$('#exDesc');d.textContent=ex.desc||'';d.hidden=!ex.desc;d.classList.remove('open');
  const kr=$('#keyRoot');if(!kr.options.length)kr.innerHTML=[...Array(12)].map((_,i)=>'<option value="'+i+'">'+corePcName(i,[5,10,3,8,1].includes(i))+'</option>').join('');
  kr.value=ex.key?ex.key.r:0;$('#keyMode').value=ex.key?ex.key.m:'major';$('#bpmIn').value=ex.bpm;
  $('#tsSel').innerHTML=TIME_SIGS.map(t=>'<option value="'+t.join('/')+'"'+(t.join('/')===ex.ts.join('/')?' selected':'')+'>'+t.join('/')+'</option>').join('');
  const tl=TUNINGS.filter(t=>t.notes.length===ex.tuning.length);let ti=tl.findIndex(t=>t.notes.join()===ex.tuning.join());
  $('#tuneSel').innerHTML=(ti<0?'<option value="-1" selected>'+esc(ex.tuningName||'Custom')+'</option>':'')+tl.map((t,i)=>'<option value="'+TUNINGS.indexOf(t)+'"'+(i===ti?' selected':'')+'>'+t.name+'</option>').join('');
  segSet('#horizonSeg',hor());segSet('#labelSeg',state.labels);segSet('#frameSeg',frameMode());segSet('#modeSeg',state.mode);
  $('#scaleBtn').setAttribute('aria-pressed',state.scale);$('#leftyBtn').setAttribute('aria-pressed',state.lefty);
  const eb=$('#modeSeg button[data-mode="edit"]'),ro=ex.origin==='shared';eb.disabled=ro;eb.title=ro?'Shared with you: read-only. Copy it to edit.':'';
  const signed=!!cloud.currentUser(),acts=[];
  const IC={share:'<circle cx="18" cy="5.5" r="2.5"/><circle cx="6" cy="12" r="2.5"/><circle cx="18" cy="18.5" r="2.5"/><path d="M8.2 10.8l7.6-4.1M8.2 13.2l7.6 4.1"/>',copy:'<rect x="8.5" y="8.5" width="11" height="11" rx="2"/><path d="M15.5 8.5V6.5a2 2 0 0 0-2-2h-7a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h2"/>',delete:'<path d="M5 7h14M10 7V5h4v2M7 7l1 12h8l1-12"/>'};
  const ab=(act,label,cls)=>'<button class="gbtn icon-only'+(cls?' '+cls:'')+'" data-act="'+act+'" title="'+label+'" aria-label="'+label+'"><svg width="17" height="17" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">'+IC[act]+'</svg></button>';
  const mayShare=signed&&(!state.profile||state.profile.can_share!==false);
  if(ex.origin==='mine'){if(mayShare)acts.push(ab('share','Share'));acts.push(ab('copy','Duplicate'),ab('delete','Delete','danger'))}
  else{acts.push(ab('copy','Copy to my exercises'));if(ex.origin==='shared')acts.push(ab('delete','Remove from my library','danger'))}
  $('#exActions').innerHTML=acts.join('');
  renderSyncState();
}
let syncState={kind:'idle',msg:''};
// Kurze Statuszeile unter dem Titel: wo die Übung liegt
function renderSyncState(){
  const ex=cur(),el=$('#syncState');if(!el||!ex)return;const signed=!!cloud.currentUser();let t='',ic='';
  if(ex.origin==='example')t='Example';
  else if(ex.origin==='shared'){t='From '+(ex.ownerName||'another user')+' · read-only';ic='shared'}
  else if(signed){if(syncState.kind==='error'){t='Not saved: '+syncState.msg;ic='err'}else if(ex.dirty||!ex.synced){t='Saving…';ic='busy'}else{t='Saved';ic='ok'}}
  else t=cloud.cloudReady()?'On this device':'';
  el.textContent=t;el.dataset.s=ic;el.hidden=!t;
}
function miniSVG(ex){
  const nS=ex.tuning.length,seen=new Set();let s='<svg width="46" height="28" viewBox="0 0 46 28">';
  for(let i=0;i<nS;i++){const y=4+i*(20/(nS-1));s+='<line x1="3" x2="43" y1="'+y+'" y2="'+y+'" stroke="currentColor" stroke-opacity=".18"/>'}
  ex.moments.forEach(m=>m.dots.forEach(d=>{const k=d.s+':'+d.f;if(seen.has(k))return;seen.add(k);s+='<circle cx="'+(4+d.f*2.5).toFixed(1)+'" cy="'+(4+d.s*(20/(nS-1))).toFixed(1)+'" r="2" fill="'+(m.color||ex.color||SKY)+'"/>'}));
  return s+'</svg>';
}
function renderLib(){
  const item=(ex,i)=>'<button class="lib-item" data-i="'+i+'" aria-current="'+(i===state.cur)+'">'+miniSVG(ex)+'<span style="min-width:0"><div class="t">'+esc(ex.title)+'</div><div class="k">'+(ex.origin==='shared'?'from '+esc(ex.ownerName||'another user'):esc(ex.type)+(ex.tag?' · '+esc(ex.tag):''))+'</div></span></button>';
  const groups=[['mine','My exercises'],['shared','Shared with me'],['example','Examples']];
  $('#libList').innerHTML=groups.map(([o,label])=>{const items=state.exs.map((ex,i)=>[ex,i]).filter(([ex])=>ex.origin===o);
    if(!items.length)return '';
    return '<div class="lib-sec">'+label+'</div>'+items.map(([ex,i])=>item(ex,i)).join('')}).join('');
}
function esc(s){return String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]))}
function renderTools(){
  segSet('#entrySeg',state.entry);
  const ms=cur().moments,a=ms[state.sel],dd=a?(decodeDur(a.dur)||{}):state.dur;
  const bases=[[6,'1/16'],[12,'1/8'],[24,'¼'],[48,'½'],[96,'1']];
  const bl=(bases.find(([b])=>b===dd.base)||[0,''])[1];
  $('#durBtn').textContent=(bl||durName(a?a.dur:durTicks()))+(dd.dot?'.':'')+(dd.trip?' ³':'');
  $('#durs').innerHTML=bases.map(([b,l],k)=>'<button data-base="'+b+'" aria-pressed="'+(dd.base===b)+'" title="'+DUR_NAMES[b]+' ('+(k+1)+')">'+l+'</button>').join('')+
    '<button data-flag="dot" aria-pressed="'+!!dd.dot+'" title="Dotted (.)">.</button><button data-flag="trip" aria-pressed="'+!!dd.trip+'" title="Triplet (T)">3</button>';
  $('#undoBtn').disabled=!state.undo.length;
}
function renderInspector(){
  const ms=cur().moments,m=ms[state.sel],el=$('#insp');
  if(!m){el.hidden=true;return}
  el.hidden=false;
  let s='<span class="mt">'+(state.sel+1)+'</span>';
  if(!m.dots.length)s+='<span class="w">rest</span>';
  else{const h=m.dots.length>1?harmony(m):null;if(h)s+='<b class="hn">'+h.name+'</b>';
    s+='<span class="nn">'+m.dots.slice().sort((a,b)=>b.s-a.s).map(d=>noteName(d,true)).join(' · ')+'</span>'}
  s+='<span class="w">'+durName(m.dur)+'</span><span class="more" aria-hidden="true">⋯</span>';
  el.innerHTML=s;
}
function renderNow(i,nx){
  const ms=cur().moments,on=onsets(),m=ms[i];
  const d=describe(m),dn=describe(ms[nx]);
  $('#nowBig').textContent=d.big;$('#nowSub').textContent=d.sub;$('#nowNote').textContent=m&&m.note?m.note:'';
  const sw=$('#nowSw');if(m&&m.dots.length){const c=colorOf(m);sw.style.background=m.dots.every(q=>q.f===0)?'transparent':c;sw.style.borderColor=c}else{sw.style.background='transparent';sw.style.borderColor='var(--line2)'}
  $('#nextBig').textContent=nx>=0?dn.big:'End';$('#nextSub').textContent=nx>=0?dn.sub.split(' · ').slice(0,2).join(' · '):'';
  $('#posBig').textContent=m?posLabel(on[i]):'–';$('#posCount').textContent=m?'moment '+(i+1)+' of '+ms.length:'';
}
function updatePos(){}
function renderAll(){
  document.body.classList.toggle('practice',state.mode==='practice');document.body.classList.toggle('editing',state.mode==='edit');
  buildGeo();
  $('#L-fx').innerHTML='<circle id="comet" r="4.5" opacity="0"/>';
  $('#L-ghost').innerHTML='<g id="gh" visibility="hidden"><g class="ghb"><circle class="gh-c" r="16" fill-opacity=".38"/><circle class="gh-r" r="16" fill="none" stroke="#fff" stroke-opacity=".85" stroke-width="1.4"/><text class="gh-t"></text></g><text class="gh-a" y="-26"></text></g>';
  renderBoard();renderMoments();updateViewBox();renderStrip();renderHead();renderLib();renderTools();renderInspector();renderTransport();
  const ms=cur().moments;requestAnimationFrame(()=>{updateViewBox();follow(clamp(state.sel,0,Math.max(0,ms.length-1)),true)});renderNow(clamp(state.sel,0,Math.max(0,ms.length-1)),nextSounding(clamp(state.sel,0,Math.max(0,ms.length-1)),allOrder(),false));updatePos();
}
function afterEdit(){
  renderMoments();if(frameMode()==='fit')updateViewBox();renderStrip();renderInspector();renderTools();renderLib();renderTransport();updatePos();save();
  const on=onsets();if(cur().moments[state.sel])scrollStripTo(on[state.sel]);
  if(!DOT)follow(state.sel);
}

/* ---------- editing ---------- */
function pushUndo(){state.undo.push(JSON.stringify({m:cur().moments,sel:state.sel,caret:state.caret}));if(state.undo.length>100)state.undo.shift()}
function undo(){const u=state.undo.pop();if(!u)return;const o=JSON.parse(u);cur().moments=o.m;state.block=null;state.sel=o.sel;state.caret=o.caret;afterEdit()}
const caretFor=()=>state.entry==='melody'?'after':'inside';
function placeDot(s,f,shift){
  if(P.on||P.wait)stopPlay();
  const ms=cur().moments;pushUndo();
  const sel=state.sel,act=ms[sel];
  const at=act?act.dots.findIndex(d=>d.s===s&&d.f===f):-1;
  if(at>=0){act.dots.splice(at,1);if(!act.dots.length&&state.entry==='melody'&&!shift){ms.splice(sel,1);state.sel=Math.max(0,sel-1)}afterEdit();return}
  if(act&&(state.caret==='inside'||shift)){const k=act.dots.findIndex(d=>d.s===s);if(k>=0)act.dots.splice(k,1);act.dots.push(n(s,f))}
  else{const m=mo(durTicks(),[n(s,f)],act?colorOf(act):(cur().color||SKY));if(!ms.length){ms.push(m);state.sel=0}else{ms.splice(sel+1,0,m);state.sel=sel+1}}
  state.caret=shift&&state.entry==='melody'?'after':caretFor();
  afterEdit();ensureAudio();pluck(cur().tuning[s]+f,clock()+.005,.5,.75);
}
function nextMoment(){state.caret='after';renderStrip()}
function insertRest(){const ms=cur().moments;pushUndo();const m=mo(durTicks(),[]);if(!ms.length){ms.push(m);state.sel=0}else{ms.splice(state.sel+1,0,m);state.sel++}state.caret='after';afterEdit()}
function repeatMoment(){const ms=cur().moments,a=ms[state.sel];if(!a)return;pushUndo();ms.splice(state.sel+1,0,JSON.parse(JSON.stringify(a)));state.sel++;state.caret='after';afterEdit()}
function deleteMoment(){const ms=cur().moments;if(!ms[state.sel])return;pushUndo();ms.splice(state.sel,1);state.sel=clamp(state.sel-(state.caret==='after'?1:0),0,Math.max(0,ms.length-1));state.caret='after';afterEdit()}
function selectMoment(i,keepBlock){const ms=cur().moments;if(!ms.length)return;if(!keepBlock)state.block=null;state.sel=clamp(i,0,ms.length-1);state.caret=state.mode==='edit'?caretFor():'after';
  if(P.wait){P.wi=ms[state.sel].dots.length?state.sel:nextSounding(state.sel,P.order,true);waitShow();renderStrip();return}
  renderMoments();renderStrip();renderInspector();renderTools();updatePos();renderNow(state.sel,nextSounding(state.sel,allOrder(),false));scrollStripTo(onsets()[state.sel]);follow(state.sel);
  if(state.mode==='practice'&&ms[state.sel].dots.length){ensureAudio();playMoment(state.sel,clock()+.01,spt())}
}
function setDur(o){
  Object.assign(state.dur,o);if(o.dot)state.dur.trip=false;if(o.trip)state.dur.dot=false;
  const a=cur().moments[state.sel];if(a){pushUndo();a.dur=durTicks();afterEdit()}else renderTools();
}

/* ---------- board pointer ---------- */
const svg=$('#board');
function svgPt(e){const pt=svg.createSVGPoint();pt.x=e.clientX;pt.y=e.clientY;return pt.matrixTransform(svg.getScreenCTM().inverse())}
function hit(e){
  const g=geo,p=svgPt(e),x=state.lefty?g.W-p.x:p.x;
  const s=Math.round((p.y-g.y0)/g.SP);if(s<0||s>=g.nS||Math.abs(p.y-g.sy(s))>g.SP*.55)return null;
  if(x<g.LEFT||x>g.endX)return null;
  if(x<g.boardX)return {s,f:0};
  for(let f=1;f<=g.maxF;f++)if(x<=g.wire(f)+1)return {s,f};
  return null;
}
let ghostKey='';
svg.addEventListener('pointermove',e=>{
  const gh=$('#gh');if(!gh||DOT)return;
  if(e.pointerType!=='mouse'||state.mode!=='edit'||P.on){gh.setAttribute('visibility','hidden');ghostKey='';return}
  const h=hit(e);if(!h){gh.setAttribute('visibility','hidden');ghostKey='';return}
  const ms=cur().moments,act=ms[state.sel],inAct=act&&act.dots.some(d=>d.s===h.s&&d.f===h.f),stack=act&&(state.caret==='inside'||e.shiftKey);
  const key=h.s+':'+h.f+':'+inAct+':'+stack;
  if(key===ghostKey)return;
  const moved=!ghostKey.startsWith(h.s+':'+h.f+':');ghostKey=key;
  const [x,y]=geo.pos(h.s,h.f),c=act?colorOf(act):(cur().color||SKY);
  gh.setAttribute('transform','translate('+x+' '+y+')');gh.setAttribute('visibility','visible');
  const cc=gh.querySelector('.gh-c'),rr=gh.querySelector('.gh-r');
  cc.setAttribute('fill',inAct?'#0f1311':c);cc.setAttribute('fill-opacity',inAct?.6:.4);
  rr.setAttribute('stroke-dasharray',stack&&!inAct?'3 3':'none');
  gh.querySelector('.gh-t').textContent=inAct?'×':noteName(h,false);
  gh.querySelector('.gh-a').textContent=inAct?'remove':stack?'+ moment '+(state.sel+1):'+ new';
  if(moved){const b=gh.querySelector('.ghb');b.classList.remove('pop');void b.getBBox();b.classList.add('pop')}
});
svg.addEventListener('pointerleave',()=>{const gh=$('#gh');if(gh&&!DOT)gh.setAttribute('visibility','hidden');ghostKey=''});
svg.addEventListener('click',e=>{
  if(performance.now()<noClickUntil)return;
  if(state.mode==='practice'){if(P.wait)waitStep(1);return}
  const h=hit(e);if(!h)return;placeDot(h.s,h.f,e.shiftKey);ghostKey='';
});

/* ---------- strip pointer ---------- */
function stripClick(e){
  const ms=cur().moments;if(!ms.length)return;const t=stripTickAt(e.clientX);let i=momentAt(t);
  if(i<0)i=t<0?0:ms.length-1;
  if(e.shiftKey){state.range=[state.sel,i];if(!state.loop)state.loop=true;renderStrip();renderTransport();if(P.on){stopPlay();play()}return}
  if(P.on){state.sel=i;stopPlay();play();return}
  if(inBlk(i)){selectMoment(i,true);renderStrip();return}
  selectMoment(i);
  if(state.mode==='edit'&&t>=onsets().total){state.caret='after';renderStrip()}
}
// Ziehen in der Zeitleiste (Bearbeiten): Moment verschieben oder am rechten Rand die Länge ändern.
// Finger: langes Drücken öffnet das Kontextmenü.
function stripHit(e){
  const ms=cur().moments,on=onsets(),t=stripTickAt(e.clientX),px=t*ST.ppt,i=momentAt(t);
  let edge=-1;
  if(e.pointerType==='mouse')for(let k=0;k<ms.length;k++){if(Math.abs(px-(on[k]+ms[k].dur)*ST.ppt)<=6){edge=k;break}}
  return {t,i,edge};
}
const strip=$('#strip');
strip.addEventListener('pointerdown',e=>{
  if(e.button===2)return;
  const tab=e.target.closest&&e.target.closest('[data-gtab]');
  if(tab){e.preventDefault();e.stopPropagation();const a=+tab.dataset.gtab,b=blk();
    if(b&&b.a===a){state.block=null;selectMoment(a)}else selectGroup(a);
    if(!$('#ctx').hidden)renderCtx();return}
  const h=stripHit(e),editing=state.mode==='edit'&&!P.on&&!P.wait;
  DRAG={id:e.pointerId,x0:e.clientX,y0:e.clientY,i:h.i,mode:null,moved:false,to:null};
  if(editing&&e.pointerType==='mouse'){if(h.edge>=0&&!inBlk(h.edge)){DRAG.mode='resize';DRAG.i=h.edge}else if(h.i>=0)DRAG.mode=inBlk(h.i)?'moveblock':'move'}
  if(DRAG.mode){e.preventDefault();strip.setPointerCapture(e.pointerId)}
  if(editing&&e.pointerType!=='mouse'&&h.i>=0)DRAG.lp=setTimeout(()=>{if(DRAG&&!DRAG.moved){const d=DRAG;DRAG=null;openCtx(d.i,d.x0,d.y0)}},500);
});
strip.addEventListener('pointermove',e=>{
  if(!DRAG&&e.pointerType==='mouse'&&state.mode==='edit'&&!P.on){const h=stripHit(e);strip.style.cursor=h.edge>=0?'col-resize':h.i>=0?'grab':''}
});
window.addEventListener('pointermove',e=>{
  if(!DRAG||e.pointerId!==DRAG.id)return;
  if(!DRAG.moved&&Math.hypot(e.clientX-DRAG.x0,e.clientY-DRAG.y0)<5)return;
  if(!DRAG.moved){DRAG.moved=true;clearTimeout(DRAG.lp)}
  if(!DRAG.mode)return;
  const ms=cur().moments,on=onsets(),t=stripTickAt(e.clientX);
  if(DRAG.mode==='resize'){if(!DRAG.undo){pushUndo();DRAG.undo=true}const nd=snapDur(t-on[DRAG.i]);if(nd!==ms[DRAG.i].dur){ms[DRAG.i].dur=nd;renderStrip();renderTools()}}
  else{const to=dropIndex(ms,on,t);if(to!==DRAG.to){DRAG.to=to;strip.style.cursor='grabbing';renderStrip()}
    const wrap=$('#stripWrap'),r=wrap.getBoundingClientRect();if(e.clientX<r.left+30)wrap.scrollLeft-=12;else if(e.clientX>r.right-30)wrap.scrollLeft+=12}
  e.preventDefault();
});
window.addEventListener('pointerup',e=>{
  if(!DRAG||e.pointerId!==DRAG.id)return;
  const d=DRAG;DRAG=null;clearTimeout(d.lp);
  if(!d.moved){if(e.target.closest&&e.target.closest('#strip'))stripClick(e);return}
  if(d.mode==='resize'){state.sel=d.i;afterEdit();return}
  if(d.mode==='moveblock'&&d.to!=null){const b=blk(),ms=cur().moments;if(b&&(d.to<b.a||d.to>b.b+1)){pushUndo();const na=moveBlock(ms,b.a,b.b,d.to);state.block={a:na,b:na+b.b-b.a};state.sel=na;state.caret='after';afterEdit();renderCtx();return}}
  if(d.mode==='move'&&d.to!=null){const ms=cur().moments;let to=d.to;if(to>d.i)to--;
    if(to!==d.i){pushUndo();state.sel=moveMoment(ms,d.i,to);state.caret='after';afterEdit();return}}
  strip.style.cursor='';renderStrip();
});
window.addEventListener('pointercancel',()=>{if(DRAG){clearTimeout(DRAG.lp);DRAG=null;renderStrip()}});
strip.addEventListener('dragstart',e=>e.preventDefault());
strip.addEventListener('contextmenu',e=>{
  if(state.mode!=='edit')return;e.preventDefault();
  const i=momentAt(stripTickAt(e.clientX));if(i>=0)openCtx(i,e.clientX,e.clientY);
});
// Rechtsklick / langes Drücken auf einen Moment am Griffbrett
svg.addEventListener('contextmenu',e=>{
  if(DOT&&!DOT.mouse){e.preventDefault();return}
  if(state.mode!=='edit')return;const g=e.target.closest('.mg');if(!g)return;e.preventDefault();
  openCtx(+g.id.slice(3),e.clientX,e.clientY);
});
/* Punkte ziehen: lange drücken (Finger) bzw. ziehen (Maus) verschiebt einen
   Griffpunkt, und zwar nur im ausgewählten Moment (gehört der Punkt zu
   einem zusammengefassten Griff ohne Auswahl: im ersten Vorkommen). Langes Drücken
   ohne Bewegung öffnet weiterhin das Moment-Menü. */
let DOT=null,noClickUntil=0;
const LIFT_MS=400,SLOP=8;
function dotGhost(t){
  const gh=$('#gh');if(!gh)return;
  if(!t){gh.setAttribute('visibility','hidden');return}
  const ok=canMoveDot(cur().moments,DOT.list,DOT.from,t),same=t.s===DOT.from.s&&t.f===DOT.from.f;
  const [x,y]=geo.pos(t.s,t.f),c=same||ok?DOT.color:'#e2665a';
  gh.setAttribute('transform','translate('+x+' '+y+')');gh.setAttribute('visibility','visible');
  const cc=gh.querySelector('.gh-c'),rr=gh.querySelector('.gh-r');
  cc.setAttribute('fill',c);cc.setAttribute('fill-opacity',.55);rr.setAttribute('stroke-dasharray','none');
  gh.querySelector('.gh-t').textContent=noteName(t,false);
  gh.querySelector('.gh-a').textContent=same?'':ok?'move':'string taken';
}
function liftDot(){
  if(!DOT)return;DOT.lifted=true;
  const el=gEls[DOT.head];if(el)el.classList.add('lift');
  try{navigator.vibrate&&navigator.vibrate(12)}catch(e){}
}
function endDot(apply){
  const d=DOT;DOT=null;if(!d)return;clearTimeout(d.timer);
  const el=gEls[d.head];if(el)el.classList.remove('lift');
  dotGhost(null);ghostKey='';
  if(d.dragging||(!d.mouse&&d.lifted))noClickUntil=performance.now()+350;
  if(apply&&d.dragging&&d.to&&canMoveDot(cur().moments,d.list,d.from,d.to)){
    pushUndo();moveDot(cur().moments,d.list,d.from,d.to);
    state.sel=d.list[0];state.caret='after';
    afterEdit();return}
  if(d.dragging)renderMoments();
}
svg.addEventListener('pointerdown',e=>{
  if(state.mode!=='edit'||P.on||P.wait||e.button>0)return;
  const g=e.target.closest('.mg'),h=hit(e);if(!g||!h)return;
  const head=+g.id.slice(3),m=cur().moments[head];if(!m||!m.dots.some(d=>d.s===h.s&&d.f===h.f))return;
  const mouse=e.pointerType==='mouse';
  const grp=GROUPS[head]||[head],only=grp.includes(state.sel)?state.sel:head;
  DOT={id:e.pointerId,x0:e.clientX,y0:e.clientY,head,list:[only],from:{s:h.s,f:h.f},to:null,
    color:colorOf(m),mouse,lifted:mouse,dragging:false,timer:0};
  if(!mouse)DOT.timer=setTimeout(liftDot,LIFT_MS);
});
svg.addEventListener('pointermove',e=>{
  const d=DOT;if(!d||e.pointerId!==d.id)return;
  const far=Math.hypot(e.clientX-d.x0,e.clientY-d.y0)>(d.mouse?5:SLOP);
  if(!d.lifted){if(far){clearTimeout(d.timer);DOT=null}return}  // vor dem Anheben bewegt: Scrollen
  if(!d.dragging){if(!far)return;d.dragging=true;try{svg.setPointerCapture(e.pointerId)}catch(_){}
    if(d.mouse){const el=gEls[d.head];if(el)el.classList.add('lift')}}
  const t=hit(e);
  if(t){const k=t.s+':'+t.f;if(k!==d.tk){d.tk=k;d.to=t;dotGhost(t);
    if(!(t.s===d.from.s&&t.f===d.from.f)&&canMoveDot(cur().moments,d.list,d.from,t)){ensureAudio();pluck(cur().tuning[t.s]+t.f,clock()+.005,.35,.6)}}}
  e.preventDefault();
});
svg.addEventListener('pointerup',e=>{
  const d=DOT;if(!d||e.pointerId!==d.id)return;
  if(!d.mouse&&d.lifted&&!d.dragging){endDot(false);openCtx(d.head,e.clientX,e.clientY);return}
  endDot(true);
});
svg.addEventListener('pointercancel',()=>endDot(false));
// Während ein Punkt angehoben ist, darf die Seite nicht scrollen.
svg.addEventListener('touchmove',e=>{if(DOT&&DOT.lifted)e.preventDefault()},{passive:false});

/* ---------- Kontextmenü eines Moments ---------- */
function openCtx(i,x,y){
  if(P.on||P.wait)stopPlay();
  closePops();selectMoment(i,inBlk(i));ctxOpenT=performance.now();
  const c=$('#ctx');c.hidden=false;renderCtx();
  const r=c.getBoundingClientRect(),W=window.innerWidth,H=window.innerHeight;
  c.style.left=clamp(x,8,W-r.width-8)+'px';c.style.top=clamp(y,8,H-r.height-8)+'px';
}
function renderBlockCtx(c,b){
  const ms=cur().moments,cols=new Set(ms.slice(b.a,b.b+1).filter(m=>m.dots.length).map(colorOf)),col=cols.size===1?[...cols][0]:null;
  const n=ms.slice(b.a,b.b+1).filter(m=>m.dots.length).length;
  let h='<div class="ctx-h"><span class="ctx-n grp" style="background:'+(col||'var(--raise)')+'">'+(b.a+1)+'–'+(b.b+1)+'</span><b>Group</b><span class="ctx-d">'+n+' notes</span><button class="gbtn icon-only" data-bact="close" aria-label="Close">×</button></div>';
  h+='<div class="ctx-r"><span>Colour</span><div class="ctx-sw">'+COLORS.map(cc=>'<button class="sw" data-bcol="'+cc+'" style="background:'+cc+'" aria-pressed="'+(cc===col)+'" aria-label="Colour"></button>').join('')+'</div></div>';
  h+='<div class="ctx-r"><span>Frets</span><div class="seg mono"><button data-bact="down" title="One fret lower">−1</button><button data-bact="up" title="One fret higher">+1</button></div></div>';
  h+='<div class="ctx-a"><button class="gbtn" data-bact="left" '+(b.a>0?'':'disabled')+' title="Move earlier">←</button><button class="gbtn" data-bact="right" '+(b.b<ms.length-1?'':'disabled')+' title="Move later">→</button>'+
    '<button class="gbtn" data-bact="play">Play</button><button class="gbtn" data-bact="loop">Loop</button><button class="gbtn" data-bact="dup">Repeat</button><button class="gbtn danger" data-bact="del">Delete</button></div>';
  h+='<div class="ctx-foot"><button class="linkbtn" data-bact="single">Edit single note</button></div>';
  c.innerHTML=h;
}
function renderCtx(){
  const c=$('#ctx');if(c.hidden)return;const ms=cur().moments,i=state.sel,m=ms[i];if(!m){c.hidden=true;return}
  const b=blk();if(b&&inBlk(i))return renderBlockCtx(c,b);
  const dd=decodeDur(m.dur)||{},col=colorOf(m),d=describe(m);
  const bases=[[6,'1/16'],[12,'1/8'],[24,'¼'],[48,'½'],[96,'1']];
  let h='<div class="ctx-h"><span class="ctx-n">'+(i+1)+'</span><b>'+d.big+'</b><span class="ctx-d">'+durName(m.dur)+'</span><button class="gbtn icon-only" data-cact="close" aria-label="Close">×</button></div>';
  h+='<div class="ctx-r"><span>Length</span><div class="seg mono">'+bases.map(([b,l])=>'<button data-cbase="'+b+'" aria-pressed="'+(dd.base===b)+'" title="'+DUR_NAMES[b]+'">'+l+'</button>').join('')+
    '<button data-cflag="dot" aria-pressed="'+!!dd.dot+'" title="Dotted">.</button><button data-cflag="trip" aria-pressed="'+!!dd.trip+'" title="Triplet">3</button></div></div>';
  h+='<div class="ctx-r"><span>Colour</span><div class="ctx-sw">'+COLORS.map(cc=>'<button class="sw" data-ccol="'+cc+'" style="background:'+cc+'" aria-pressed="'+(cc===col)+'" aria-label="Colour"></button>').join('')+'</div></div>';
  const grp=groupOf(cgroups(),i);
  if(grp)h+='<div class="ctx-r"><span>Group</span><span class="ctx-grp"><span class="ctx-d">'+(grp.a+1)+'–'+(grp.b+1)+' · '+grp.count+' notes</span><button class="gbtn" data-cact="selgrp">Select</button><button class="gbtn" data-cact="loopgrp">Loop</button></span></div>';
  if(m.dots.length>1)h+='<div class="ctx-r"><span>Strum</span><div class="seg">'+[['','together'],['d','↓'],['u','↑']].map(([v,l])=>'<button data-cstrum="'+v+'" aria-pressed="'+((m.strum||'')===v)+'">'+l+'</button>').join('')+'</div></div>';
  m.dots.slice().sort((a,b)=>b.s-a.s).forEach(dt=>{const k=m.dots.indexOf(dt);
    h+='<div class="ctx-r dot"><span><b>'+noteName(dt,true)+'</b> '+stringName(dt.s)+' '+(dt.f===0?'open':dt.f)+'</span><span class="ctx-sel">'+
      '<select data-k="'+k+'" data-p="fg" aria-label="Finger">'+['','1','2','3','4','T'].map(v=>'<option value="'+v+'"'+(String(dt.fg||'')===v?' selected':'')+'>'+(v?'finger '+v:'finger –')+'</option>').join('')+'</select>'+
      '<select data-k="'+k+'" data-p="t" aria-label="Technique">'+[['','plain'],['h','hammer-on'],['p','pull-off'],['sl','slide'],['b','bend'],['~','vibrato']].map(([v,l])=>'<option value="'+v+'"'+((dt.t||'')===v?' selected':'')+'>'+l+'</option>').join('')+'</select></span></div>'});
  h+='<input type="text" class="ctx-note" id="ctxNote" placeholder="Note for the student…" value="'+esc(m.note||'')+'">';
  h+='<div class="ctx-a"><button class="gbtn" data-cact="left" '+(i>0?'':'disabled')+' title="Move earlier">←</button><button class="gbtn" data-cact="right" '+(i<ms.length-1?'':'disabled')+' title="Move later">→</button>'+
    '<button class="gbtn" data-cact="play">Play</button><button class="gbtn" data-cact="dup">Repeat</button><button class="gbtn" data-cact="rest">Rest after</button><button class="gbtn danger" data-cact="del">Delete</button></div>';
  c.innerHTML=h;
}
function ctxEdit(fn){const m=cur().moments[state.sel];if(!m)return;pushUndo();fn(m);afterEdit();renderCtx()}
function playBlock(b){const ms=cur().moments,on=onsets(),t0=clock()+.05,sp=spt();ensureAudio();for(let i=b.a;i<=b.b;i++)playMoment(i,t0+(on[i]-on[b.a])*sp,sp)}
function blockEdit(fn){const b=blk();if(!b)return;pushUndo();const r=fn(cur().moments,b);if(r===false){state.undo.pop();return}afterEdit();renderCtx()}
function deleteBlock(){const b=blk();if(!b)return;pushUndo();const ms=cur().moments;ms.splice(b.a,b.b-b.a+1);state.block=null;state.sel=clamp(b.a-1,0,Math.max(0,ms.length-1));state.caret='after';$('#ctx').hidden=true;afterEdit();toast('Group deleted')}
$('#ctx').addEventListener('click',e=>{
  const bt=e.target.closest('[data-bact],[data-bcol]');if(!bt)return;e.stopPropagation();const b=blk();if(!b)return;
  if(bt.dataset.bcol)return blockEdit((ms,b)=>{for(let i=b.a;i<=b.b;i++)if(ms[i].dots.length)ms[i].color=bt.dataset.bcol});
  const a=bt.dataset.bact;
  if(a==='close'){$('#ctx').hidden=true;return}
  if(a==='single'){state.block=null;renderStrip();renderMoments();renderCtx();return}
  if(a==='up'||a==='down')return blockEdit((ms,b)=>{const ok=shiftFrets(ms,b.a,b.b,a==='up'?1:-1,geo.maxF);if(!ok)toast(a==='up'?'Already at the top of the neck':'Already at the open strings');return ok});
  if(a==='left'||a==='right')return blockEdit((ms,b)=>{const na=moveBlock(ms,b.a,b.b,a==='left'?b.a-1:b.b+2);state.block={a:na,b:na+b.b-b.a};state.sel=na;state.caret='after'});
  if(a==='dup')return blockEdit((ms,b)=>{const copy=JSON.parse(JSON.stringify(ms.slice(b.a,b.b+1)));ms.splice(b.b+1,0,...copy);state.block={a:b.b+1,b:b.b+copy.length};state.sel=b.b+1;state.caret='after'});
  if(a==='play'){playBlock(b);return}
  if(a==='loop'){const was=P.on;if(P.on||P.wait)stopPlay();state.range=[b.a,b.b];state.loop=true;$('#ctx').hidden=true;renderStrip();renderTransport();if(was)play();return}
  if(a==='del'){deleteBlock();return}
});
$('#ctx').addEventListener('click',e=>{
  e.stopPropagation();const b=e.target.closest('button');if(!b||b.dataset.bact||b.dataset.bcol)return;const ms=cur().moments,i=state.sel;
  if(b.dataset.cbase)return ctxEdit(m=>{const dd=decodeDur(m.dur)||{};m.dur=durFromSpec({base:+b.dataset.cbase,dot:!!dd.dot,trip:!!dd.trip})});
  if(b.dataset.cflag)return ctxEdit(m=>{const dd=decodeDur(m.dur)||{base:24};const dot=b.dataset.cflag==='dot'?!dd.dot:false,trip=b.dataset.cflag==='trip'?!dd.trip:false;m.dur=durFromSpec({base:dd.base||24,dot,trip})});
  if(b.dataset.ccol)return ctxEdit(m=>{m.color=b.dataset.ccol});
  if(b.dataset.cstrum!=null)return ctxEdit(m=>{m.strum=b.dataset.cstrum||null});
  const a=b.dataset.cact;
  if(a==='close'){$('#ctx').hidden=true;return}
  if(a==='selgrp'){if(selectGroup(i))renderCtx();return}
  if(a==='loopgrp'){const grp=groupOf(cgroups(),i);if(!grp)return;const was=P.on;if(P.on||P.wait)stopPlay();state.range=[grp.a,grp.b];state.loop=true;state.sel=grp.a;$('#ctx').hidden=true;renderAll();if(was)play();return}
  if(a==='left'||a==='right'){pushUndo();state.sel=moveMoment(ms,i,i+(a==='left'?-1:1));state.caret='after';afterEdit();renderCtx();return}
  if(a==='play'){if(ms[i].dots.length){ensureAudio();playMoment(i,clock()+.01,spt())}return}
  if(a==='dup'){repeatMoment();renderCtx();return}
  if(a==='rest'){state.caret='after';insertRest();renderCtx();return}
  if(a==='del'){state.caret='inside';deleteMoment();$('#ctx').hidden=true;return}
});
$('#ctx').addEventListener('change',e=>{
  const t=e.target;
  if(t.id==='ctxNote'){const m=cur().moments[state.sel];if(m){m.note=t.value.trim()||null;save();renderInspector()}return}
  if(t.dataset.k!=null)ctxEdit(m=>{const d=m.dots[+t.dataset.k];if(t.dataset.p==='fg')d.fg=t.value?(t.value==='T'?'T':+t.value):null;else d.t=t.value||null});
});

/* ---------- controls ---------- */
$('#playBtn').addEventListener('click',()=>{if(P.on||P.wait)stopPlay();else play()});
$('#toStartBtn').addEventListener('click',()=>{const was=P.on;if(P.on||P.wait)stopPlay();state.sel=0;state.range=null;renderAll();if(was)play()});
function tempoStep(dir){if(state.mode==='edit'){const ex=cur();ex.bpm=clamp(ex.bpm+dir*2,30,260);save();renderHead()}else state.speed=clamp(+(state.speed+dir*.05).toFixed(2),.25,2);setTempoLive();renderTransport()}
$('#slowBtn').addEventListener('click',()=>tempoStep(-1));
$('#fastBtn').addEventListener('click',()=>tempoStep(1));
$('#metroBtn').addEventListener('click',()=>{state.metro=!state.metro;renderTransport()});
$('#countBtn').addEventListener('click',()=>{state.countIn=!state.countIn;renderTransport()});
$('#loopBtn').addEventListener('click',()=>{state.loop=!state.loop;if(!state.loop)state.range=null;const was=P.on;if(P.on||P.wait)stopPlay();renderStrip();renderTransport();if(was)play()});
$('#waitBtn').addEventListener('click',()=>{state.wait=!state.wait;if(P.on||P.wait)stopPlay();renderTransport()});
$('#trainBtn').addEventListener('click',()=>{state.trainer=!state.trainer;if(state.trainer){if(state.speed>=1)state.speed=.7;state.loop=true}renderTransport()});
$('#modeSeg').addEventListener('click',e=>{const b=e.target.closest('button');if(!b||b.dataset.mode===state.mode)return;if(P.on||P.wait)stopPlay();state.mode=b.dataset.mode;if(state.mode==='practice'&&!cur().moments[state.sel])state.sel=0;renderAll()});
$('#horizonSeg').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;state.horizon[state.mode]=b.dataset.v;segSet('#horizonSeg',b.dataset.v);if(P.wait){renderMoments();waitShow()}else if(!P.on)renderMoments()});
$('#labelSeg').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;state.labels=b.dataset.v;segSet('#labelSeg',b.dataset.v);renderMoments();if(P.wait)waitShow()});
$('#frameSeg').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;state.frame[state.mode]=b.dataset.v;segSet('#frameSeg',b.dataset.v);updateViewBox()});
$('#scaleBtn').addEventListener('click',()=>{state.scale=!state.scale;renderBoard();renderHead();save()});
$('#leftyBtn').addEventListener('click',()=>{const was=P.on;if(P.on||P.wait)stopPlay();state.lefty=!state.lefty;renderAll();if(was)play()});
$('#entrySeg').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;state.entry=b.dataset.v;state.caret=caretFor();renderTools();renderStrip()});
$('#nextBtn').addEventListener('click',nextMoment);
$('#restBtn').addEventListener('click',insertRest);
$('#undoBtn').addEventListener('click',undo);
$('#durs').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;if(b.dataset.base)setDur({base:+b.dataset.base});else{const f=b.dataset.flag,a=cur().moments[state.sel],dd=a?(decodeDur(a.dur)||state.dur):state.dur;state.dur.base=dd.base||state.dur.base;setDur(f==='dot'?{dot:!dd.dot,trip:false}:{trip:!dd.trip,dot:false})}});
$('#insp').addEventListener('click',e=>{e.stopPropagation();const r=e.currentTarget.getBoundingClientRect();openCtx(state.sel,r.left,r.bottom+6)});
$('#durs').addEventListener('click',e=>{const b=e.target.closest('button');if(b&&b.dataset.base)setTimeout(closePops,0)});
$('#exTitle').addEventListener('change',e=>{cur().title=e.target.value.trim().slice(0,200)||'Untitled exercise';renderLib();save()});
$('#libList').addEventListener('click',e=>{const b=e.target.closest('.lib-item');if(!b)return;loadEx(+b.dataset.i);document.body.classList.remove('lib-open')});
function loadEx(i){if(P.on||P.wait)stopPlay();state.cur=clamp(i,0,state.exs.length-1);if(cur().origin==='shared'){if(!state.modeBeforeShared)state.modeBeforeShared=state.mode;state.mode='practice'}else if(state.modeBeforeShared){state.mode=state.modeBeforeShared;state.modeBeforeShared=null}state.sel=0;state.range=null;state.block=null;state.undo=[];state.caret=caretFor();state.speed=1;renderAll();save()}
// Neue eigene Übung (auch Import und Kopie) in die Bibliothek aufnehmen und öffnen
function atLimit(){const p=state.profile;if(!cloud.currentUser()||!p||p.max_exercises==null)return false;
  const n=state.exs.filter(r=>r.origin==='mine').length;if(n<p.max_exercises)return false;
  toast('Students can keep up to '+p.max_exercises+' exercises. Ask an admin for teacher access.');return true}
function addMine(ex){if(atLimit())return false;const rec=makeRecord(ex,{id:uuid(),origin:'mine',dirty:true});if(!rec)return false;state.exs.push(rec);state.mode='edit';state.modeBeforeShared=null;loadEx(state.exs.length-1);scheduleSync();return true}
function newExercise(){addMine({title:'Untitled exercise',type:'Custom',tag:'',desc:'',inst:'guitar',tuning:STD,tuningName:'Standard',key:{r:0,m:'major'},bpm:80,ts:[4,4],color:SKY,moments:[]});document.body.classList.remove('lib-open')}
$('#newTopBtn').addEventListener('click',newExercise);
/* ---------- Tabs importieren ---------- */
const IMP={mode:'text',score:null,name:'',bars:0};
function openImport(){closePops();document.body.classList.remove('lib-open');$('#importPop').hidden=false;ctxOpenT=performance.now();impMode(IMP.mode);impMsg('')}
function impMsg(t,bad){const m=$('#impMsg');m.textContent=t;m.classList.toggle('bad',!!bad)}
function impMode(v){IMP.mode=v;segSet('#impSeg',v);$('#impText').hidden=v!=='text';$('#impFile').hidden=v!=='file';impMsg('');updImpGo()}
function updImpGo(){$('#impGo').disabled=IMP.mode==='file'?!IMP.score:!$('#impTa').value.trim()}
let atP=null;
function loadAlphaTab(){
  if(window.alphaTab)return Promise.resolve(window.alphaTab);
  return atP||(atP=new Promise((res,rej)=>{const sc=document.createElement('script');sc.src='vendor/alphatab/alphaTab.min.js';
    sc.onload=()=>window.alphaTab?res(window.alphaTab):rej(new Error('File import is not available in this version.'));
    sc.onerror=()=>{atP=null;rej(new Error('File import is not available in this version.'))};document.head.appendChild(sc)}));
}
$('#importBtn').addEventListener('click',e=>{e.stopPropagation();openImport()});
$('#impClose').addEventListener('click',()=>{$('#importPop').hidden=true});
$('#impSeg').addEventListener('click',e=>{const b=e.target.closest('button');if(b)impMode(b.dataset.v)});
$('#impTa').addEventListener('input',()=>{impMsg('');updImpGo()});
$('#impIn').addEventListener('change',async e=>{
  const f=e.target.files&&e.target.files[0];IMP.score=null;$('#impOpts').hidden=true;updImpGo();if(!f)return;
  $('#impFileName').textContent=f.name;IMP.name=f.name.replace(/\.[^.]+$/,'');impMsg('Reading…');
  try{
    const [at,buf]=await Promise.all([loadAlphaTab(),f.arrayBuffer()]);
    const score=at.importer.ScoreLoader.loadScoreFromBytes(new Uint8Array(buf),new at.Settings());
    const info=scoreInfo(score);if(!info.tracks.length)throw new Error('This file has no guitar or bass track.');
    IMP.score=score;IMP.bars=info.bars;
    $('#impTrack').innerHTML=info.tracks.map(t=>'<option value="'+t.index+'">'+esc(t.name)+' · '+t.strings+' strings</option>').join('');
    $('#impFrom').value=1;$('#impFrom').max=info.bars;$('#impTo').value=Math.min(info.bars,8);$('#impTo').max=info.bars;$('#impBars').textContent=info.bars;
    $('#impOpts').hidden=false;impMsg((info.title?info.title+(info.artist?' – '+info.artist:'')+' · ':'')+info.bars+' bars');
  }catch(err){impMsg(err&&err.message&&err.message.length<120?err.message:'This file could not be read.',true)}
  updImpGo();
});
$('#impGo').addEventListener('click',()=>{
  let ex;
  try{
    if(IMP.mode==='text'){
      const r=parseTextTab($('#impTa').value);
      ex={title:'Imported tab',type:'Imported',tag:'Text tab',desc:'',inst:r.tuning.length<=5&&r.tuning[0]<60?'bass':'guitar',
        tuning:r.tuning,tuningName:r.tuningName,key:{r:0,m:'major'},bpm:80,ts:[4,4],color:SKY,moments:r.moments};
    }else{
      const a=Math.max(1,Math.round(+$('#impFrom').value||1)),b=Math.min(IMP.bars,Math.round(+$('#impTo').value||a));
      if(b<a)throw new Error('The last bar must come after the first.');
      if(b-a>63)throw new Error('Choose at most 64 bars.');
      ex=scoreToExercise(IMP.score,{track:+$('#impTrack').value,from:a,to:b,title:IMP.score.title||IMP.name});
    }
  }catch(err){impMsg(err.message||'Import failed.',true);return}
  $('#importPop').hidden=true;$('#impTa').value='';
  if(atLimit())return;
  if(!addMine(ex))impMsg('Import failed.',true);
});
let resetArmed=false;
$('#resetBtn').addEventListener('click',e=>{if(!resetArmed){resetArmed=true;e.target.textContent='Click again to reset';setTimeout(()=>{resetArmed=false;e.target.textContent='Reset examples'},3000);return}
  resetArmed=false;e.target.textContent='Reset examples';const curId=cur().id;state.exs=exampleRecords().concat(state.exs.filter(x=>x.origin!=='example'));loadEx(Math.max(0,state.exs.findIndex(x=>x.id===curId)))});
$('#libBtn').addEventListener('click',()=>document.body.classList.toggle('lib-open'));
$('#scrim').addEventListener('click',()=>document.body.classList.remove('lib-open'));
function closePops(except){document.querySelectorAll('.pop').forEach(p=>{if(p.id!==except)p.hidden=true});document.querySelectorAll('[data-pop]').forEach(b=>{if(b.dataset.pop!==except)b.setAttribute('aria-expanded','false')})}
function openPop(id,b,force){const p=$('#'+id),open=force||p.hidden;closePops(id);p.hidden=!open;if(b)b.setAttribute('aria-expanded',String(open));
  if(open&&b&&!p.classList.contains('anchor-top')){const r=b.getBoundingClientRect();p.style.left=Math.max(8,Math.min(window.innerWidth-p.offsetWidth-8,r.left+r.width/2-p.offsetWidth/2))+'px';const below=r.bottom+8,above=r.top-p.offsetHeight-8;p.style.top=(p.dataset.below||above<=8?below:above)+'px'}
  return open}
document.querySelectorAll('[data-pop]').forEach(b=>b.addEventListener('click',e=>{e.stopPropagation();openPop(b.dataset.pop,b)}));
document.addEventListener('click',e=>{if(performance.now()-ctxOpenT<450)return;if(!e.target.closest('.pop')&&!e.target.closest('[data-pop]'))closePops()});
$('#exDesc').addEventListener('click',e=>e.currentTarget.classList.toggle('open'));
function setEx(fn){if(P.on||P.wait)stopPlay();fn(cur());save();renderAll()}
$('#keyRoot').addEventListener('change',e=>setEx(ex=>{ex.key={r:+e.target.value,m:$('#keyMode').value}}));
$('#keyMode').addEventListener('change',e=>setEx(ex=>{ex.key={r:+$('#keyRoot').value,m:e.target.value}}));
$('#bpmIn').addEventListener('change',e=>{const v=clamp(Math.round(+e.target.value)||cur().bpm,30,260);e.target.value=v;cur().bpm=v;save();renderHead();renderTransport()});
$('#tsSel').addEventListener('change',e=>setEx(ex=>{ex.ts=e.target.value.split('/').map(Number)}));
$('#tuneSel').addEventListener('change',e=>{const t=TUNINGS[+e.target.value];if(t)setEx(ex=>{ex.tuning=t.notes.slice();ex.tuningName=t.name})});

document.addEventListener('keydown',e=>{
  const tg=e.target.tagName;if(tg==='INPUT'||tg==='SELECT'||tg==='TEXTAREA')return;
  const k=e.key,ms=cur().moments,edit=state.mode==='edit';
  if((e.ctrlKey||e.metaKey)&&k.toLowerCase()==='z'){if(edit){e.preventDefault();undo()}return}
  if(e.ctrlKey||e.metaKey||e.altKey)return;
  if(k===' '){e.preventDefault();if(P.wait){waitStep(1);return}if(P.on)stopPlay();else play();return}
  if(k==='ArrowRight'){e.preventDefault();if(P.wait)waitStep(1);else if(!P.on)selectMoment(state.sel+1);return}
  if(k==='ArrowLeft'){e.preventDefault();if(P.wait)waitStep(-1);else if(!P.on)selectMoment(state.sel-1);return}
  if(k==='?'){const hp=$('#help'),open=hp.hidden;closePops();hp.hidden=!open;return}
  if(k==='Escape'){if(P.on||P.wait)stopPlay();closePops();if(blk()){state.block=null;renderStrip();renderMoments()}return}
  if(k==='h'||k==='H'){const o=['whole','near','now'];state.horizon[state.mode]=o[(o.indexOf(hor())+1)%3];segSet('#horizonSeg',hor());if(P.wait){renderMoments();waitShow()}else if(!P.on)renderMoments();return}
  if(k==='n'||k==='N'){const o=['order','finger','note'];state.labels=o[(o.indexOf(state.labels)+1)%3];segSet('#labelSeg',state.labels);renderMoments();if(P.wait)waitShow();return}
  if(k==='m'||k==='M'){state.metro=!state.metro;renderTransport();return}
  if(k==='l'||k==='L'){$('#loopBtn').click();return}
  if(!edit)return;
  if(k==='Enter'){e.preventDefault();nextMoment();return}
  if(k==='Backspace'||k==='Delete'){e.preventDefault();if(blk())deleteBlock();else deleteMoment();return}
  if(k==='r'||k==='R'){insertRest();return}
  if(k==='d'||k==='D'){repeatMoment();return}
  if(k==='g'||k==='G'){state.entry=state.entry==='melody'?'chord':'melody';state.caret=caretFor();renderTools();renderStrip();return}
  if(k>='1'&&k<='5'){setDur({base:[6,12,24,48,96][+k-1]});return}
  if(k==='.'){const a=ms[state.sel],dd=a?(decodeDur(a.dur)||state.dur):state.dur;state.dur.base=dd.base||state.dur.base;setDur({dot:!dd.dot,trip:false});return}
  if(k==='t'||k==='T'){const a=ms[state.sel],dd=a?(decodeDur(a.dur)||state.dur):state.dur;state.dur.base=dd.base||state.dur.base;setDur({trip:!dd.trip,dot:false});return}
});
const fsEl=document.documentElement,fsOk=!!(fsEl.requestFullscreen||fsEl.webkitRequestFullscreen);
if(!fsOk)$('#fsBtn').hidden=true;
function toggleFs(){try{const on=document.fullscreenElement||document.webkitFullscreenElement;if(on){(document.exitFullscreen||document.webkitExitFullscreen).call(document)}else{const p=(fsEl.requestFullscreen||fsEl.webkitRequestFullscreen).call(fsEl);if(p&&p.catch)p.catch(()=>{$('#fsBtn').hidden=true})}}catch(e){$('#fsBtn').hidden=true}}
$('#fsBtn').addEventListener('click',toggleFs);
['fullscreenchange','webkitfullscreenchange'].forEach(ev=>document.addEventListener(ev,()=>{const on=!!(document.fullscreenElement||document.webkitFullscreenElement);$('#fsTxt').textContent=on?'Exit full screen':'Full screen';setTimeout(()=>renderStrip(),150)}));
document.addEventListener('keydown',e=>{const tg=e.target.tagName;if(tg==='INPUT'||tg==='SELECT'||tg==='TEXTAREA')return;if((e.key==='f'||e.key==='F')&&!e.ctrlKey&&!e.metaKey&&!e.altKey&&fsOk&&!$('#fsBtn').hidden)toggleFs()});
let rzT=0,wasPhone=phone();window.addEventListener('resize',()=>{clearTimeout(rzT);rzT=setTimeout(()=>{if(phone()!==wasPhone&&!P.on){wasPhone=phone();renderAll();return}updateViewBox();renderStrip();setDockH();if(P.wait)waitShow()},120)});
// Platz für die feste Bedienleiste unten (Handy)
function setDockH(){document.documentElement.style.setProperty('--dockH',($('.dock').offsetHeight||0)+'px')}
new ResizeObserver(setDockH).observe($('.dock'));

/* ---------- Übungsaktionen: Kopieren, Löschen, Teilen ---------- */
let toastT=0;
function toast(msg){const t=$('#toast');t.textContent=msg;t.hidden=false;clearTimeout(toastT);toastT=setTimeout(()=>{t.hidden=true},3200)}
let deleteArmed=false;
$('#exActions').addEventListener('click',async e=>{
  const b=e.target.closest('[data-act]');if(!b)return;e.stopPropagation();const r=cur(),act=b.dataset.act;
  if(act==='copy'){const c=content(r);if(r.origin==='mine')c.title=(r.title+' (copy)').slice(0,200);closePops();if(addMine(c))toast('Added to My exercises');return}
  if(act==='share'){if(openPop('sharePop',b,true))renderShare();return}
  if(act==='delete'){
    if(!deleteArmed){deleteArmed=true;b.classList.add('armed');b.title='Tap again to confirm';toast(r.origin==='shared'?'Tap again to remove':'Tap again to delete');setTimeout(()=>{deleteArmed=false;renderHead()},3000);return}
    deleteArmed=false;
    try{if(r.origin==='mine'&&r.synced&&cloud.currentUser())await cloud.deleteExercise(r.id);if(r.origin==='shared')await cloud.leaveShared(r.id)}
    catch(err){toast('Could not delete: '+err.message);return}
    const i=state.exs.indexOf(r);if(i>=0)state.exs.splice(i,1);snaps.delete(r.id);
    if(!state.exs.length)state.exs=exampleRecords();
    closePops();loadEx(0);toast(r.origin==='shared'?'Removed from your library':'Exercise deleted');
  }
});

async function renderShare(msg){
  const r=cur(),el=$('#sharePop');
  el.innerHTML='<div class="ctx-h"><b>Share “'+esc(r.title)+'”</b></div><form id="shareForm" class="form"><label class="field"><span>Email of a GuitarJemp account</span><input id="shareEmail" type="email" required autocomplete="off" placeholder="student@example.com"></label><button class="fbtn" type="submit">Share</button></form>'+
    (msg?'<p class="fmsg'+(msg.err?' err':'')+'">'+esc(msg.text)+'</p>':'')+'<div class="shares" id="shareList"><p class="fmsg">Loading…</p></div>';
  if(!r.synced){$('#shareList').innerHTML='<p class="fmsg">Saving to your account first…</p>';await syncNow()}
  try{const list=await cloud.listShares(r.id);if(!peopleNet)peopleNet=await cloud.myNetwork();
    const has=new Set(list.map(u=>u.user_id)),contacts=peopleNet.filter(p=>p.status==='connected'&&!has.has(p.id));
    $('#shareList').innerHTML=(contacts.length?'<div class="lbl">Your contacts</div>'+contacts.map(p=>'<div class="share-row"><span>'+esc(p.display_name||p.email)+'<small>'+ROLE[p.role||'student']+'</small></span><button class="gbtn" data-sharewith="'+esc(p.id)+'">Share</button></div>').join(''):'')+
      (list.length?'<div class="lbl">Shared with</div>'+list.map(u=>'<div class="share-row"><span>'+esc(u.display_name||u.email)+'<small>'+esc(u.email)+'</small></span><button class="gbtn" data-unshare="'+esc(u.user_id)+'">Remove</button></div>').join(''):'')}
  catch(err){$('#shareList').innerHTML='<p class="fmsg err">'+esc(err.message)+'</p>'}
}
$('#sharePop').addEventListener('submit',async e=>{
  e.preventDefault();const r=cur(),email=$('#shareEmail').value.trim();if(!email)return;
  try{if(!r.synced)await syncNow();const res=await cloud.shareExercise(r.id,email);
    const text={ok:'Shared with '+email+'.',no_account:'No GuitarJemp account uses this address yet. Ask them to sign up first.',self:'That is your own address.',not_owner:'Only the owner can share this exercise.',not_allowed:'Sharing is for teachers.'}[res]||res;
    renderShare({text,err:res!=='ok'})}
  catch(err){renderShare({text:err.message,err:true})}
});
$('#sharePop').addEventListener('click',async e=>{const w=e.target.closest('[data-sharewith]');
  if(w){e.stopPropagation();w.disabled=true;try{const r=await cloud.shareWithUser(cur().id,w.dataset.sharewith);renderShare({text:r==='ok'?'Shared.':{not_allowed:'Sharing is for teachers.',not_contact:'Only with contacts.'}[r]||r,err:r!=='ok'})}catch(err){renderShare({text:err.message,err:true})}return}
  const b=e.target.closest('[data-unshare]');if(!b)return;e.stopPropagation();
  try{await cloud.unshare(cur().id,b.dataset.unshare);renderShare({text:'Access removed.'})}catch(err){renderShare({text:err.message,err:true})}});

/* ---------- Abgleich mit dem Konto ---------- */
let syncT=0,syncing=false,lastUid=null,lastRefresh=0;
function scheduleSync(){if(!cloud.currentUser())return;clearTimeout(syncT);syncT=setTimeout(syncNow,1500)}
async function syncNow(){
  clearTimeout(syncT);if(!cloud.currentUser())return;
  if(syncing){scheduleSync();return}
  const todo=state.exs.filter(r=>r.origin==='mine'&&(r.dirty||!r.synced));if(!todo.length){renderSyncState();return}
  syncing=true;renderSyncState();
  try{for(const r of todo){const before=snap(r);const res=await cloud.saveExercise(toCloudRow(r));
      r.synced=true;r.updatedAt=res.updated_at;snaps.set(r.id,before);if(snap(r)===before)r.dirty=false}
    syncState={kind:'ok',msg:''}}
  catch(err){syncState={kind:'error',msg:err.message||'connection problem'};setTimeout(scheduleSync,15000)}
  finally{syncing=false;clearTimeout(saveT);try{localStorage.setItem(SKEY,JSON.stringify({exs:state.exs,cur:state.cur}))}catch(e){};renderSyncState()}
}
async function refreshLibrary(){
  const u=cloud.currentUser();if(!u)return;lastRefresh=Date.now();
  try{const {rows,names}=await cloud.fetchExercises();if(!cloud.currentUser())return;
    const curId=cur().id,{library}=mergeLibrary(state.exs,rows,u.id,names);
    if(P.on||P.wait)stopPlay();
    state.exs=library.length?library:exampleRecords();state.cur=Math.max(0,state.exs.findIndex(r=>r.id===curId));
    state.exs.forEach(r=>{if(r.origin==='mine'&&!r.dirty)snaps.set(r.id,snap(r))});
    if(cur().origin==='shared')state.mode='practice';
    renderAll();save();syncNow();reloadProfile()}
  catch(err){syncState={kind:'error',msg:err.message||'connection problem'};renderSyncState()}
}
window.addEventListener('focus',()=>{if(cloud.currentUser()&&!P.on&&!P.wait&&Date.now()-lastRefresh>30000)refreshLibrary()});
window.addEventListener('beforeunload',e=>{if(cloud.currentUser()&&state.exs.some(r=>r.origin==='mine'&&r.dirty)){syncNow();e.preventDefault()}});

/* ---------- Konto ---------- */
function renderAcctBtn(){const b=$('#acctBtn'),u=cloud.currentUser();b.hidden=!cloud.cloudReady();
  const name=state.profile&&state.profile.display_name||(u&&u.email)||'';
  const pend=u&&state.profile&&state.profile.pending_requests>0;
  b.innerHTML=u?'<span class="avatar">'+esc((name[0]||'?').toUpperCase())+'</span>'+(pend?'<span class="dot-badge" aria-hidden="true"></span>':''):'<svg width="17" height="17" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8.5" r="3.6" fill="none" stroke="currentColor" stroke-width="1.7"/><path d="M5 20c.8-3.6 3.6-5.6 7-5.6s6.2 2 7 5.6" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>';
  b.title=u?'Account: '+name+(pend?' · new contact requests':''):'Sign in';b.setAttribute('aria-label',b.title)}
const ROLE={admin:'Admin',teacher:'Teacher',student:'Student'};
function renderAccount(view,msg){
  const el=$('#account'),u=cloud.currentUser(),m=msg?'<p class="fmsg'+(msg.err?' err':'')+'">'+esc(msg.text)+'</p>':'';
  const f=(id,label,type,extra)=>'<label class="field"><span>'+label+'</span><input id="'+id+'" type="'+type+'" '+(extra||'')+'></label>';
  const head=t=>'<div class="ctx-h"><b>'+t+'</b><button class="gbtn icon-only" data-acct="close" aria-label="Close">×</button></div>';
  if(u&&view==='people'){renderPeople(msg);return}
  if(u&&view!=='newpw'){const p=state.profile||{},role=p.role||'student';
    let roleLine='<span class="role-badge" data-r="'+role+'">'+ROLE[role]+'</span>';
    if(role==='student')roleLine+=p.teacher_requested?'<span class="fmsg-i">Teacher access requested</span><button class="linkbtn" data-acct="teacherreq" data-on="0">Withdraw</button>':'<button class="linkbtn" data-acct="teacherreq" data-on="1">I teach guitar</button>';
    if(role==='admin')roleLine+='<a class="linkbtn" href="https://jemphub.com/admin/" target="_blank" rel="noopener">Open admin</a>';
    const lim=role==='student'&&p.max_exercises!=null?'<p class="fmsg">'+(p.exercise_count||0)+' of '+p.max_exercises+' exercises used'+(p.can_share?'':' · sharing is for teachers')+'</p>':'';
    const pend=p.pending_requests>0?' <span class="count">'+p.pending_requests+'</span>':'';
    el.innerHTML=head('Your account')+'<p class="fmsg">'+esc(u.email)+'</p><div class="role-line">'+roleLine+'</div>'+lim+
      '<button class="gbtn wide" data-acct="people"><svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"><circle cx="9" cy="8" r="3.2"/><path d="M3 19c.6-3 3-4.8 6-4.8s5.4 1.8 6 4.8"/><circle cx="17" cy="9" r="2.4"/><path d="M16.5 14.3c2.4.2 4 1.7 4.5 4.2"/></svg>People'+pend+'</button>'+
      '<form class="form" data-form="profile">'+f('acName','Display name','text','maxlength="80" value="'+esc(p.display_name||'')+'"')+'<button class="fbtn" type="submit">Save name</button></form>'+m+
      '<div class="frow"><button class="linkbtn" data-acct="signout">Sign out</button></div>';return}
  if(view==='newpw'){el.innerHTML=head('New password')+'<form class="form" data-form="newpw">'+f('acPw','New password','password','required minlength="8" autocomplete="new-password"')+'<button class="fbtn" type="submit">Save password</button></form>'+m;return}
  if(view==='signup'){el.innerHTML=head('Create account')+'<form class="form" data-form="signup">'+f('acName','Name','text','maxlength="80" autocomplete="name"')+f('acEmail','Email','email','required autocomplete="email"')+f('acPw','Password (8+ characters)','password','required minlength="8" autocomplete="new-password"')+'<button class="fbtn" type="submit">Create account</button></form>'+m+'<div class="frow"><button class="linkbtn" data-acct="signin">I have an account</button></div>';return}
  if(view==='reset'){el.innerHTML=head('Reset password')+'<form class="form" data-form="reset">'+f('acEmail','Email','email','required autocomplete="email"')+'<button class="fbtn" type="submit">Send link</button></form>'+m+'<div class="frow"><button class="linkbtn" data-acct="signin">Back</button></div>';return}
  el.innerHTML=head('Sign in')+'<form class="form" data-form="signin">'+f('acEmail','Email','email','required autocomplete="email"')+f('acPw','Password','password','required autocomplete="current-password"')+'<button class="fbtn" type="submit">Sign in</button></form>'+m+
    '<div class="frow"><button class="linkbtn" data-acct="signup">Create account</button><button class="linkbtn" data-acct="reset">Forgot password?</button></div>';
}
$('#acctBtn').addEventListener('click',e=>{e.stopPropagation();if(openPop('account',$('#acctBtn')))renderAccount('signin')});
$('#account').addEventListener('click',async e=>{const b=e.target.closest('[data-acct]');if(!b)return;e.stopPropagation();const v=b.dataset.acct;
  if(v==='close'){closePops();return}
  if(v==='signout'){b.disabled=true;await syncNow();try{await cloud.signOut()}catch(err){renderAccount('profile',{text:err.message,err:true})}return}
  if(v==='teacherreq'){b.disabled=true;try{await cloud.requestTeacher(b.dataset.on==='1');await reloadProfile();renderAccount('profile',b.dataset.on==='1'?{text:'Request sent. An admin will confirm it.'}:null)}catch(err){renderAccount('profile',{text:err.message,err:true})}return}
  if(v==='connect'||v==='disconnect'){b.disabled=true;try{if(v==='connect'){const r=await cloud.connect(b.dataset.id);if(r==='connected')toast('Connected');else if(r==='pending_out')toast('Request sent')}else await cloud.disconnect(b.dataset.id);
      await reloadProfile();peopleNet=null;renderPeople()}catch(err){renderPeople({text:err.message,err:true})}return}
  renderAccount(v)});
$('#account').addEventListener('submit',async e=>{
  e.preventDefault();const form=e.target.dataset.form,val=id=>{const x=$('#'+id);return x?x.value.trim():''},btn=e.target.querySelector('button[type=submit]');btn.disabled=true;
  try{
    if(form==='signin'){await cloud.signIn(val('acEmail'),$('#acPw').value);closePops();toast('Signed in')}
    else if(form==='signup'){const r=await cloud.signUp(val('acEmail'),$('#acPw').value,val('acName'));if(r.needsConfirmation)renderAccount('signin',{text:'Check your inbox and confirm your address, then sign in.'});else{closePops();toast('Account created')}}
    else if(form==='reset'){await cloud.sendPasswordReset(val('acEmail'));renderAccount('signin',{text:'If an account exists for this address, a link is on its way.'})}
    else if(form==='newpw'){await cloud.setNewPassword($('#acPw').value);closePops();toast('Password changed')}
    else if(form==='profile'){const name=val('acName').slice(0,80)||null;await cloud.saveDisplayName(name);state.profile=Object.assign({},state.profile,{display_name:name});renderAcctBtn();renderAccount('profile',{text:'Saved.'})}
    else if(form==='search'){peopleQuery=val('pplQ');await renderPeople()}
  }catch(err){if(form==='search'){renderPeople({text:err.message,err:true});return}
    const em=val('acEmail'),nm=val('acName');renderAccount(form==='profile'?'profile':form,{text:err.message||'Something went wrong. Please try again.',err:true});if(em&&$('#acEmail'))$('#acEmail').value=em;if(nm&&$('#acName'))$('#acName').value=nm;const pw=$('#acPw');if(pw)pw.focus()}
  finally{if(btn.isConnected)btn.disabled=false}
});
async function reloadProfile(){try{state.profile=await cloud.loadProfile()}catch{state.profile=state.profile||null}renderAcctBtn();renderHead()}

/* ---------- Personen: suchen, vernetzen ---------- */
let peopleQuery='',peopleNet=null;
async function renderPeople(msg){
  const el=$('#account'),m=msg?'<p class="fmsg'+(msg.err?' err':'')+'">'+esc(msg.text)+'</p>':'';
  const row=(p,btns)=>'<div class="person"><span class="pname">'+esc(p.display_name||'Member')+'<small>'+ROLE[p.role||'student']+(p.email?' · '+esc(p.email):'')+'</small></span><span class="pbtns">'+btns+'</span></div>';
  const bt=(act,id,label,cls)=>'<button class="gbtn'+(cls?' '+cls:'')+'" data-acct="'+act+'" data-id="'+esc(id)+'">'+label+'</button>';
  el.innerHTML='<div class="ctx-h"><button class="gbtn icon-only" data-acct="profile" aria-label="Back">‹</button><b>People</b><button class="gbtn icon-only" data-acct="close" aria-label="Close">×</button></div>'+
    '<form class="form search" data-form="search"><input id="pplQ" type="search" placeholder="Name or email" autocomplete="off" value="'+esc(peopleQuery)+'"><button class="fbtn" type="submit">Search</button></form>'+m+'<div id="pplBody"><p class="fmsg">Loading…</p></div>';
  try{
    if(!peopleNet)peopleNet=await cloud.myNetwork();
    let html='';
    if(peopleQuery.length>=2){const res=await cloud.searchMembers(peopleQuery);
      html+='<div class="lbl">Results</div>'+(res.length?res.map(p=>row(p,p.status==='connected'?'<span class="tag">Contact</span>':p.status==='pending_out'?'<span class="tag">Requested</span>':p.status==='pending_in'?bt('connect',p.id,'Accept','primary'):bt('connect',p.id,'Connect'))).join(''):'<p class="fmsg">Nobody found. Try the full email address.</p>')}
    const inc=peopleNet.filter(p=>p.status==='pending_in'),out=peopleNet.filter(p=>p.status==='pending_out'),con=peopleNet.filter(p=>p.status==='connected');
    if(inc.length)html+='<div class="lbl">Requests</div>'+inc.map(p=>row(p,bt('connect',p.id,'Accept','primary')+bt('disconnect',p.id,'Decline'))).join('');
    html+='<div class="lbl">Contacts</div>'+(con.length?con.map(p=>row(p,bt('disconnect',p.id,'Remove'))).join(''):'<p class="fmsg">No contacts yet. Search for your teacher or students.</p>');
    if(out.length)html+='<div class="lbl">Waiting</div>'+out.map(p=>row(p,bt('disconnect',p.id,'Cancel'))).join('');
    $('#pplBody').innerHTML=html;
  }catch(err){$('#pplBody').innerHTML='<p class="fmsg err">'+esc(err.message)+'</p>'}
  const q=$('#pplQ');if(q&&!msg)q.focus();
}

async function afterSignIn(){
  const u=cloud.currentUser();if(!u||lastUid===u.id)return;lastUid=u.id;renderAcctBtn();
  await reloadProfile()
  renderAcctBtn();await refreshLibrary();
}
function afterSignOut(){
  lastUid=null;state.profile=null;peopleNet=null;peopleQuery='';syncState={kind:'idle',msg:''};const curId=cur().id;
  if(P.on||P.wait)stopPlay();
  state.exs=libraryAfterSignOut(state.exs);if(!state.exs.length)state.exs=exampleRecords();
  state.cur=Math.max(0,state.exs.findIndex(r=>r.id===curId));if(cur().origin!=='shared'&&state.modeBeforeShared){state.mode=state.modeBeforeShared;state.modeBeforeShared=null}
  save();closePops();renderAcctBtn();renderAll();toast('Signed out');
}
cloud.onAuthChange(ev=>{
  if(ev==='PASSWORD_RECOVERY'){openPop('account',$('#acctBtn'),true);renderAccount('newpw');return}
  if(ev==='SIGNED_OUT'){afterSignOut();return}
  if(cloud.currentUser())afterSignIn();
});

renderAll();
cloud.initCloud().then(ok=>{renderAcctBtn();if(ok){renderSyncState();renderHead();if(cloud.currentUser())afterSignIn()}});
