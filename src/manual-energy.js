// Manual light paths for arbitrary AI photos. All animation uses a 10-second period.
const TAU = Math.PI*2;
const clamp = (x,a=0,b=1)=>Math.min(b,Math.max(a,x));
const frac = x=>x-Math.floor(x);
const mix = (a,b,t)=>a+(b-a)*t;
const COLOR={outline:0,body:0,arm:1,leg:0,aura:1};
const EMPTY=()=>({outline:[],body:[],arm:[],leg:[],aura:[]});
function rgba(hex,alpha){const v=parseInt(hex.slice(1),16);return 'rgba('+(v>>16)+','+((v>>8)&255)+','+(v&255)+','+alpha+')'}
function seeded(seed){let x=seed>>>0;return ()=>{x+=0x6d2b79f5;let a=x;a=Math.imul(a^(a>>>15),a|1);a^=a+Math.imul(a^(a>>>7),a|61);return ((a^(a>>>14))>>>0)/4294967296}}
function smooth(x){x=clamp(x);return x*x*(3-2*x)}
function bloom(c,x,y,r,color,opacity){const g=c.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,rgba(color,opacity));g.addColorStop(.25,rgba(color,opacity*.25));g.addColorStop(1,rgba(color,0));c.fillStyle=g;c.fillRect(x-r,y-r,r*2,r*2)}
function point(c,x,y,r,color,alpha){c.globalAlpha=alpha;c.fillStyle=color;c.beginPath();c.arc(x,y,r,0,TAU);c.fill();c.globalAlpha=1}
function interpolate(points,t){
 const count=points.length-1,scaled=clamp(t)*count,index=Math.min(count-1,Math.floor(scaled)),u=scaled-index;
 const a=points[Math.max(index-1,0)],b=points[index],d=points[index+1],e=points[Math.min(index+2,count)];
 const cubic=k=>.5*((2*b[k])+(-a[k]+d[k])*u+(2*a[k]-5*b[k]+4*d[k]-e[k])*u*u+(-a[k]+3*b[k]-3*d[k]+e[k])*u*u*u);
 return [cubic(0),cubic(1)];
}
function sampled(points){
 const samples=[],N=Math.max(80,points.length*36);
 let total=0,prev=interpolate(points,0);
 samples.push([0,prev]);
 for(let i=1;i<=N;i++){const p=interpolate(points,i/N);total+=Math.hypot(p[0]-prev[0],p[1]-prev[1]);samples.push([total,p]);prev=p}
 function at(q){
  const d=clamp(q)*total;let lo=0,hi=samples.length-1;
  while(lo+1<hi){const mid=(lo+hi)>>1;if(samples[mid][0]<d)lo=mid;else hi=mid}
  const a=samples[lo],b=samples[hi],u=b[0]===a[0]?0:(d-a[0])/(b[0]-a[0]);
  return [mix(a[1][0],b[1][0],u),mix(a[1][1],b[1][1],u)]
 }
 return {at,total};
}
function drawTrace(c,path,color,strength){
 c.lineWidth=1.4;c.strokeStyle=rgba(color,.11*strength);c.lineJoin='round';c.lineCap='round';
 c.beginPath();
 for(let i=0;i<=120;i++){const p=path.at(i/120);i?c.lineTo(p[0],p[1]):c.moveTo(p[0],p[1])}
 c.stroke();
}
function comet(c,path,progress,color,strength){
 const q=frac(progress),fade=smooth(q/.08)*smooth((1-q)/.08);
 if(fade<=.00001)return;
 const tail=.085,steps=19;
 c.save();c.lineCap='round';c.lineJoin='round';
 for(let layer=0;layer<3;layer++){
  const width=layer===0?17:layer===1?6:1.8;
  const alpha=layer===0?.045:layer===1?.17:.75;
  c.shadowBlur=layer===0?22:layer===1?8:0;c.shadowColor=color;
  c.lineWidth=width*strength;
  for(let j=steps;j>0;j--){
   const from=q-tail*j/steps,to=q-tail*(j-1)/steps;
   if(to<=0)continue;
   const a=path.at(Math.max(0,from)),b=path.at(to),taper=1-(j-1)/steps;
   c.strokeStyle=rgba(color,alpha*strength*fade*taper*taper);
   c.beginPath();c.moveTo(a[0],a[1]);c.lineTo(b[0],b[1]);c.stroke();
  }
 }
 const [x,y]=path.at(q);bloom(c,x,y,22*strength,color,.26*fade);
 point(c,x,y,Math.max(1.2,2.6*strength),'#ffffff',fade*.85);c.restore();
}
export class ManualEnergy {
 constructor(){this.paths=EMPTY();this.setSeed(1);this.enabled=true}
 static empty(){return EMPTY()}
 setSeed(seed){
  const r=seeded(seed);this.motes=Array.from({length:140},()=>({
   path:Math.floor(r()*5),phase:r(),cycles:1+Math.floor(r()*2),
   offset:(r()-.5)*12,size:.4+r()*1.35,white:r()>.87,shift:r()*TAU
  }))
 }
 setPaths(paths){
  const out=EMPTY();
  for(const key of Object.keys(out)){
   const value=paths?.[key];if(!Array.isArray(value))continue;
   out[key]=value.slice(0,250).filter(p=>Array.isArray(p)&&p.length>=2&&Number.isFinite(+p[0])&&Number.isFinite(+p[1]))
    .map(p=>[clamp(+p[0],0,1280),clamp(+p[1],0,720)]);
  }
  this.paths=out;
 }
 getPaths(){return JSON.parse(JSON.stringify(this.paths))}
 hasPaths(){return Object.values(this.paths).some(p=>p.length>=2)}
 draw(c,time,scene,colors){
  if(!this.enabled||!this.hasPaths())return;
  const t=((time%10)+10)%10/10,phase=TAU*t;
  const keys=Object.keys(this.paths);
  const active=keys.filter(k=>this.paths[k].length>=2);
  const curves=new Map(active.map(k=>[k,sampled(this.paths[k])]));
  c.save();c.globalCompositeOperation='screen';
  for(const key of active){
   const path=curves.get(key),color=colors[COLOR[key]],weight=key==='outline'?1.04:key==='aura'?.65:.85;
   drawTrace(c,path,color,weight);
   comet(c,path,t,color,weight);
   comet(c,path,t+(key==='outline'?.49:.57),colors[1-COLOR[key]],weight*.54);
   // Body energy nodes pulse while staying attached to the chosen contour.
   if(key!=='aura')for(let j=1;j<=4;j++){
    const p=path.at(j/5),pulse=.5+.5*Math.sin(phase+j*.81);
    bloom(c,p[0],p[1],17+9*pulse,color,.017+.027*pulse);
   }
  }
  for(const m of this.motes){
   const key=keys[m.path],path=curves.get(key);if(!path)continue;
   const q=frac(m.phase+m.cycles*t);
   const fade=smooth(q/.065)*smooth((1-q)/.065);
   if(!fade)continue;
   const p=path.at(q),ahead=path.at(clamp(q+.003)),behind=path.at(clamp(q-.003));
   const dx=ahead[0]-behind[0],dy=ahead[1]-behind[1],len=Math.hypot(dx,dy)||1;
   const x=p[0]-dy/len*m.offset,y=p[1]+dx/len*m.offset;
   const color=m.white?'#ffffff':colors[COLOR[key]];
   const shine=.6+.4*Math.sin(phase*m.cycles+m.shift);
   point(c,x,y,m.size,color,fade*shine*.67);
   if(m.white)bloom(c,x,y,9,color,fade*shine*.08);
  }
  c.restore();
 }
}
