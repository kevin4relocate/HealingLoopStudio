// Healing Loop Studio · traced-light overlay for our sleeping_among_the_stars AI artwork.
// Coordinates are in the fixed 1280×720 stage and aligned to that exact AI image.
const TAU = Math.PI * 2;
const PATHS = {
  body: [[1089,358],[1071,372],[1048,390],[1012,400],[968,410],[928,425],[884,435],[842,431],[800,420],[758,425],[714,429],[673,419],[629,418],[582,422],[536,417],[489,404],[445,405],[399,410],[352,422],[309,432],[262,437],[215,443],[175,447],[128,453]],
  arm:  [[941,422],[903,455],[864,496],[836,535],[847,557],[880,566],[917,566],[961,541],[1010,521],[1059,492],[1106,468]],
  head: [[1089,358],[1104,330],[1128,308],[1158,306],[1182,328]]
};
const anchorPoints = [[1068,365,31],[922,425,29],[771,422,26],[622,421,24],[420,409,21],[255,440,18]];
const mix = (a,b,t)=>a+(b-a)*t;
const rgba=(hex,a)=>{const k=parseInt(hex.slice(1),16);return 'rgba('+(k>>16)+','+((k>>8)&255)+','+(k&255)+','+a+')'};
const fract=x=>x-Math.floor(x);
const clamp=x=>Math.max(0,Math.min(1,x));
const smooth=x=>{x=clamp(x);return x*x*(3-2*x)};
const isPresetImage=(name)=>/sleeping[ _-]*among[ _-]*the[ _-]*stars/i.test(name||'');
// Soft Catmull-Rom spline following the body silhouette; resampled by arc length for uniform speed.
function catmull(points,t) {
  const n=points.length-1,f=clamp(t)*n,i=Math.min(n-1,Math.floor(f)),u=f-i;
  const p0=points[Math.max(0,i-1)],p1=points[i],p2=points[i+1],p3=points[Math.min(n,i+2)];
  const at=d=>.5*((2*p1[d])+(-p0[d]+p2[d])*u+(2*p0[d]-5*p1[d]+4*p2[d]-p3[d])*u*u+(-p0[d]+3*p1[d]-3*p2[d]+p3[d])*u*u*u);
  return [at(0),at(1)];
}
function makePath(points){
 const samples=[],count=420;
 let total=0,prev=catmull(points,0);
 samples.push({d:0,p:prev});
 for(let i=1;i<=count;i++){const p=catmull(points,i/count);total+=Math.hypot(p[0]-prev[0],p[1]-prev[1]);samples.push({d:total,p});prev=p}
 function at(q){const target=clamp(q)*total;let a=0,b=samples.length-1;while(a+1<b){const m=(a+b)>>1;if(samples[m].d<target)a=m;else b=m}const l=samples[a],r=samples[b],f=r.d===l.d?0:(target-l.d)/(r.d-l.d);return [mix(l.p[0],r.p[0],f),mix(l.p[1],r.p[1],f)]}
 function normal(q){const lo=at(clamp(q-.002)),hi=at(clamp(q+.002)),dx=hi[0]-lo[0],dy=hi[1]-lo[1],len=Math.hypot(dx,dy)||1;return [-dy/len,dx/len]}
 return {at,normal};
}
const geometry=Object.fromEntries(Object.entries(PATHS).map(([key,points])=>[key,makePath(points)]));
function orb(ctx,x,y,r,hex,alpha){
 const g=ctx.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,rgba(hex,alpha));g.addColorStop(.22,rgba(hex,alpha*.22));g.addColorStop(1,rgba(hex,0));ctx.fillStyle=g;ctx.fillRect(x-r,y-r,r*2,r*2)
}
function point(ctx,x,y,r,hex,alpha){ctx.globalAlpha=alpha;ctx.fillStyle=hex;ctx.beginPath();ctx.arc(x,y,r,0,TAU);ctx.fill();ctx.globalAlpha=1}
function pathTrace(ctx,path,hex,time,brightness=1){
 ctx.beginPath();for(let i=0;i<=120;i++){const p=path.at(i/120);i?ctx.lineTo(...p):ctx.moveTo(...p)}
 ctx.strokeStyle=rgba(hex,.095*brightness);ctx.lineWidth=1.5;ctx.lineCap='round';ctx.stroke();
}
// For a pulse, q walks from start to end in exactly 10 seconds. Both ends are faded.
// No frame-to-frame random state, and all speeds are integer cycles per 10 seconds.
function pulse(ctx,path,progress,hex,weight=1){
 const q=fract(progress);
 const visibility=smooth(q/.085)*smooth((1-q)/.085);
 if(visibility<.0003)return;
 // A comet's tail hugs the same anatomical path. The body and original AI image stay perfectly static.
 const segments=22,tail=.073;
 ctx.save();ctx.lineCap='round';ctx.lineJoin='round';
 for(let layer=0;layer<3;layer++){
   for(let j=segments;j>=1;j--){
     const hi=q-tail*(j-1)/segments,lo=q-tail*j/segments;if(lo<0)continue;
     const a=path.at(lo),b=path.at(hi);
     const taper=1-(j-1)/segments,alpha=visibility*weight*taper*taper;
     ctx.strokeStyle=rgba(hex,alpha*(layer===0?.04:layer===1?.2:.75));
     ctx.shadowBlur=layer===0?21:layer===1?8:0;
     ctx.shadowColor=hex;
     ctx.lineWidth=layer===0?19:layer===1?6.2:1.8;
     ctx.beginPath();ctx.moveTo(...a);ctx.lineTo(...b);ctx.stroke();
   }
 }
 const [x,y]=path.at(q);
 orb(ctx,x,y,24*weight,hex,.29*visibility);
 point(ctx,x,y,2.7*weight,'#ffffff',.88*visibility);
 ctx.restore();
}
function seeded(seed){let x=seed>>>0;return()=>{x+=0x6d2b79f5;let t=x;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return((t^(t>>>14))>>>0)/4294967296}}
export class BodyEnergy {
 constructor(){this.seed=1;this.particles=[];this.setSeed(1);}
 static supports(name){return isPresetImage(name)}
 setSeed(seed){this.seed=seed;const rand=seeded(seed);this.particles=Array.from({length:180},(_,i)=>({route:i%7===0?'arm':'body',position:rand(),speed:1+Math.floor(rand()*2),phase:rand()*TAU,offset:(rand()-.5)*9,white:rand()>.85,radius:.5+rand()*1.35}))}
 draw(ctx,time,scene){
  const ph=((time%10)+10)%10/10,angle=ph*TAU;
  const cyan=scene.theme==='gold'?'#ffe5a1':scene.theme==='rose'?'#ffb9e8':'#6efaff';
  const violet=scene.theme==='emerald'?'#80ffe8':'#cf8dff';
  ctx.save();ctx.globalCompositeOperation='screen';
  pathTrace(ctx,geometry.body,cyan,time,1);
  pathTrace(ctx,geometry.arm,violet,time,.7);
  // A soft periodic breathing glow at meaningful body points (brain, heart, abdomen).
  for(let i=0;i<anchorPoints.length;i++){
    const [x,y,r]=anchorPoints[i],envelope=.52+.48*Math.sin(angle+(i*.69)+.35);
    orb(ctx,x,y,r, i<2?violet:cyan, .018+.036*envelope);
  }
  // Main flow: head -> neck -> chest -> waist -> hips -> blanket-covered legs / feet.
  pulse(ctx,geometry.body,ph,cyan,1.0);
  pulse(ctx,geometry.body,ph+.52,violet,.67);
  // Delayed branch through upper arm to the hand; a second full 10-second cyclic path.
  pulse(ctx,geometry.arm,ph+.31,violet,.63);
  // Small sparks glued to the body centerline (within a few pixels), not free-floating around the frame.
  for(const s of this.particles){
    const q=fract(s.position+ph*s.speed),fade=smooth(q/.09)*smooth((1-q)/.09);
    if(fade<.001)continue;
    const path=geometry[s.route],p=path.at(q),normal=path.normal(q);
    const shimmer=.55+.45*Math.sin(angle*(1+s.speed)+s.phase);
    const x=p[0]+normal[0]*s.offset,y=p[1]+normal[1]*s.offset;
    const color=s.white?'#ffffff':s.route==='arm'?violet:cyan;
    point(ctx,x,y,s.radius,color,fade*shimmer*.62);
    if(s.white)orb(ctx,x,y,8,color,fade*shimmer*.08);
  }
  ctx.restore();
 }
}
