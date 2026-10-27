// Sample exercises. Each one demonstrates a different kind of guitar material.
import { E8, Q4, H2, W1, T8, SAGE, SKY, AMBER, CORAL, LILAC, TEAL, ROSE, SAND, STD, DROPD, BASS4 } from './constants.js'
import { n, mo } from './model.js'

function exScale(){
  const up=[n(4,3,3),n(3,0),n(3,2,2),n(3,3,3),n(2,0),n(2,2,2),n(1,0),n(1,1,1)];
  const ms=up.map((d,i)=>mo(E8,[d],SKY,i===0?{n:'Start on the A string, 3rd fret, with your ring finger.'}:i===4?{n:'Open G: let the hand stay in first position.'}:i===7?{n:'Top C. Turn around and walk back down.'}:{}));
  up.slice(0,7).reverse().forEach((d,i)=>ms.push(mo(i===6?Q4:E8,[n(d.s,d.f,d.fg)],AMBER)));
  return {title:'C Major Scale, Open Position',type:'Scale',tag:'Single → Single',desc:'One octave up and down in first position.',inst:'guitar',tuning:STD,tuningName:'Standard',key:{r:0,m:'major'},bpm:84,ts:[4,4],color:SKY,moments:ms};
}
function exFinger(){
  const ms=[];
  const bar=(bass,alt,grp,mid,c,note)=>{[[bass],grp,[mid],grp,[alt],grp,[mid],grp].forEach((ds,i)=>ms.push(mo(E8,ds,c,i===0&&note?{n:note}:{})));};
  bar(n(4,0),n(3,2,2),[n(2,2,3),n(1,1,1),n(0,0)],n(1,1,1),CORAL,'Am: thumb on the open A, three fingers pluck the top strings together.');
  bar(n(4,3,3),n(3,2,2),[n(2,0),n(1,1,1),n(0,0)],n(1,1,1),SKY,'C: only the ring finger moves, from the G string to the A string.');
  bar(n(5,3,3),n(3,0),[n(2,0),n(1,0),n(0,3,4)],n(1,0),SAGE,'G: thumb jumps to the low E string.');
  ms.push(mo(H2,[n(4,0),n(3,2,2),n(2,2,3),n(1,1,1),n(0,0)],CORAL,{n:'Let the full Am ring.'}));
  ms.push(mo(H2,[]));
  return {title:'Fingerstyle Am – C – G',type:'Fingerstyle',tag:'Single → Group → Single',desc:'Thumb, pinch, treble note.',inst:'guitar',tuning:STD,tuningName:'Standard',key:{r:9,m:'minor'},bpm:72,ts:[4,4],color:CORAL,moments:ms};
}
function exTravis(){
  const ms=[];
  const pat=[[n(4,3,3),n(0,0)],[n(1,1,1)],[n(3,2,2)],[n(2,0)],[n(5,3,3),n(1,1,1)],[n(0,0)],[n(3,2,2)],[n(1,1,1)]];
  for(let b=0;b<2;b++) pat.forEach((ds,i)=>ms.push(mo(E8,ds,ds.length>1?TEAL:LILAC,b===0&&i===0?{n:'Pinch: thumb and middle finger at the same time.'}:b===0&&i===4?{n:'Thumb alternates to the low E string; ring finger moves over.'}:{})));
  ms.push(mo(H2,[n(4,3,3),n(3,2,2),n(2,0),n(1,1,1),n(0,0)],TEAL,{n:'Strike the whole C chord.'}));
  ms.push(mo(H2,[]));
  return {title:'Travis Picking in C',type:'Fingerstyle',tag:'Group → Single → Group',desc:'Alternating bass with pinches on beats one and three.',inst:'guitar',tuning:STD,tuningName:'Standard',key:{r:0,m:'major'},bpm:76,ts:[4,4],color:TEAL,moments:ms};
}
function exStrum(){
  const G=[n(5,3,2),n(4,2,1),n(3,0),n(2,0),n(1,0),n(0,3,3)], C=[n(4,3,3),n(3,2,2),n(2,0),n(1,1,1),n(0,0)], D=[n(3,0),n(2,2,1),n(1,3,3),n(0,2,2)];
  const pat=[['d',Q4],['d',E8],['u',E8],[null,E8],['u',E8],['d',E8],['u',E8]];
  const ms=[];
  [[G,SAGE,'G'],[C,SKY,'C'],[D,AMBER,'D']].forEach(([ch,c,nm],b)=>pat.forEach(([st,du],i)=>{
    ms.push(st?mo(du,ch,c,{st:st,n:i===0?(b===0?'Down, down-up, miss, up, down-up. Keep the arm moving on the missed stroke.':'Change to '+nm+' on beat one.'):null}):mo(du,[]));
  }));
  ms.push(mo(W1,G,SAGE,{st:'d',n:'Back to G. One strum, let it ring.'}));
  return {title:'Strumming G – C – D',type:'Rhythm',tag:'Group → Group · rests',desc:'The classic pop strum.',inst:'guitar',tuning:STD,tuningName:'Standard',key:{r:7,m:'major'},bpm:92,ts:[4,4],color:SAGE,moments:ms};
}
function exRiff(){
  const D5=[n(5,0),n(4,0),n(3,0)], G5=[n(5,5,1),n(4,5,1),n(3,5,1)], F5=[n(5,3,1),n(4,3,1),n(3,3,1)];
  const ms=[mo(Q4,D5,CORAL,{st:'d',n:'Open D5: in Drop D the three lowest open strings form a power chord.'}),
    mo(E8,[n(5,0)],SAND,{n:'Palm-mute the open low D.'}),mo(E8,[n(5,0)],SAND),mo(E8,[n(5,3,1)],SAND),mo(E8,[n(5,5,3)],SAND),
    mo(Q4,G5,AMBER,{st:'d',n:'One-finger barre at the 5th fret.'}),mo(E8,[n(5,0)],SAND),mo(E8,[n(5,0)],SAND),
    mo(Q4,F5,LILAC,{st:'d'}),mo(Q4,D5,CORAL,{st:'d',n:'Back to the open chord.'}),mo(Q4,[])];
  return {title:'Drop D Riff',type:'Riff',tag:'Open strings · repeated dots',desc:'A heavy riff on the open low D.',inst:'guitar',tuning:DROPD,tuningName:'Drop D',key:{r:2,m:'minor'},bpm:104,ts:[4,4],color:CORAL,moments:ms};
}
function exLegato(){
  const trips=[[n(2,5,1),n(2,7,2,'h'),n(2,9,4,'h')],[n(2,9,4),n(2,7,2,'p'),n(2,5,1,'p')],[n(1,5,1),n(1,6,2,'h'),n(1,8,4,'h')],[n(1,8,4),n(1,6,2,'p'),n(1,5,1,'p')]];
  const ms=[];
  trips.forEach((t,k)=>t.forEach((d,i)=>ms.push(mo(T8,[d],k%2?TEAL:LILAC,k===0&&i===0?{n:'Pick only the first note of each triplet. Hammer the next two.'}:k===1&&i===0?{n:'Now pull off: flick the finger sideways off the string.'}:{}))));
  ms.push(mo(Q4,[n(2,7,3)],ROSE),mo(Q4,[n(2,9,3,'sl')],ROSE,{n:'Slide up two frets without picking again.'}),
    mo(Q4,[n(1,8,3,'b')],AMBER,{n:'Bend a whole step, up to the pitch of the 10th fret.'}),mo(Q4,[n(0,8,4,'~')],AMBER,{n:'Finish on high C with gentle vibrato.'}));
  return {title:'Legato Triplets',type:'Technique',tag:'Hammer-on · pull-off · slide · bend',desc:'Eighth-note triplets in 5th position.',inst:'guitar',tuning:STD,tuningName:'Standard',key:{r:0,m:'major'},bpm:66,ts:[4,4],color:LILAC,moments:ms};
}
function exBass(){
  const ms=[];
  [[n(3,1,1),n(3,3,4),n(2,0),n(2,3,4)],[n(2,1,1),n(2,3,4),n(1,0),n(1,2,2)],[n(1,3,4),n(1,2,2),n(2,3,4),n(2,0)]].forEach((bar,b)=>bar.forEach((d,i)=>ms.push(mo(Q4,[d],b===1?SAGE:SKY,i===0?{n:['F: root, 2nd, 3rd, 5th.','B♭ for one bar, walking up.','Walk back down to F.'][b]}:{}))));
  ms.push(mo(W1,[n(3,1,1)],AMBER,{n:'Land on the root.'}));
  return {title:'Walking Bass in F',type:'Bass',tag:'4-string bass · quarter notes',desc:'One note per beat on a 4-string bass.',inst:'bass',tuning:BASS4,tuningName:'Bass standard',key:{r:5,m:'major'},bpm:100,ts:[4,4],color:SKY,moments:ms};
}
function exThirds(){
  const up=[[n(2,5,2),n(1,5,1)],[n(2,7,3),n(1,6,1)],[n(2,9,3),n(1,8,1)],[n(2,10,3),n(1,10,4)]];
  const ms=up.map((ds,i)=>mo(Q4,ds,ROSE,i===0?{n:'Two notes, one moment. Pick both strings together.'}:{}));
  [2,1,0].forEach((k,i)=>ms.push(mo(i===2?H2:Q4,up[k],TEAL,i===0?{n:'Same shapes on the way down.'}:{})));
  return {title:'Double Stops in Thirds',type:'Intervals',tag:'Group → Group',desc:'Harmonised thirds on the G and B strings.',inst:'guitar',tuning:STD,tuningName:'Standard',key:{r:0,m:'major'},bpm:72,ts:[4,4],color:ROSE,moments:ms};
}
export function examples(){return [exScale(),exFinger(),exTravis(),exStrum(),exRiff(),exLegato(),exBass(),exThirds()].map((e,i)=>Object.assign(e,{id:'ex'+i}))}
