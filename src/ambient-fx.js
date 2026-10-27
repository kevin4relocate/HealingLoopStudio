// Additional calm background effects, all phase-locked to an exact 10-second cycle.
const TAU=Math.PI*2;
const rgba=(hex,a)=>{let v=parseInt(hex.slice(1),16);return 'rgba('+(v>>16)+','+((v>>8)&255)+','+(v&255)+','+a+')'};
function circle(c,x,y,r,color,a){c.globalAlpha=a;c.fillStyle=color;c.beginPath();c.arc(x,y,r,0,TAU);c.fill();c.globalAlpha=1}
function haze(c,x,y,r,color,a){let g=c.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,rgba(color,a));g.addColorStop(.3,rgba(color,a*.25));g.addColorStop(1,rgba(color,0));c.fillStyle=g;c.fillRect(x-r,y-r,r*2,r*2)}
function random(seed){let s=seed>>>0;return ()=>{s+=0x6d2b79f5;let x=s;x=Math.imul(x^(x>>>15),x|1);x^=x+Math.imul(x^(x>>>7),x|61);return ((x^(x>>>14))>>>0)/4294967296}}
export class AmbientFX {
 constructor(){this.setSeed(1)}
 setSeed(seed){const r=random(seed);
  this.fireflies=Array.from({length:105},()=>({x:r()*1280,y:60+r()*590,rad:.65+r()*1.6,dx:6+r()*22,dy:3+r()*11,offset:r()*TAU,c:r(),speed:1+Math.floor(r()*2)}));
  this.flashes=Array.from({length:17},()=>({x:50+r()*1180,y:50+r()*550,rad:6+r()*10,offset:r()*TAU,c:r(),speed:1+Math.floor(r()*2)}))
 }
 draw(ctx,time,scene,colors,settings={}){
  const phase=((time%10)+10)%10/10*TAU,[blue,purple]=colors;
  ctx.save();ctx.globalCompositeOperation='screen';
  if(settings.mist!==false){
   for(let i=0;i<4;i++){
    const x=240+i*275+35*Math.cos(phase+i*.9),y=380+i*48+24*Math.sin(phase+i*1.4);
    haze(ctx,x,y,170+i*22,i%2?purple:blue,.018+.008*Math.sin(phase+i*.7));
   }
  }
  if(settings.aurora!==false){
   for(let layer=0;layer<3;layer++){
    ctx.beginPath();
    for(let j=0;j<=90;j++){
     const u=j/90;
     const x=1280*u,y=65+layer*75+30*Math.sin(TAU*u*1.5+phase+layer*.9)+24*Math.sin(TAU*u*2-phase+layer);
     if(j===0)ctx.moveTo(x,y);else ctx.lineTo(x,y);
    }
    ctx.lineCap='round';ctx.lineWidth=layer===1?12:7;ctx.strokeStyle=rgba(layer===1?purple:blue,.027);
    ctx.shadowBlur=24;ctx.shadowColor=layer===1?purple:blue;ctx.stroke();ctx.shadowBlur=0;
   }
  }
  if(settings.fireflies!==false){
   for(let s of this.fireflies){
    const angle=phase*s.speed+s.offset;
    const x=s.x+s.dx*Math.cos(angle),y=s.y+s.dy*Math.sin(angle);
    const brightness=.6+.4*Math.cos(angle);
    circle(ctx,x,y,s.rad,s.c>.5?blue:purple,.12+.28*brightness);
   }
  }
  if(settings.orbits===true){
   for(let j=0;j<3;j++){
    const cx=950-j*240,cy=280+j*64,rx=80+j*22,ry=24+j*8;
    ctx.beginPath();ctx.ellipse(cx,cy,rx,ry,-.12,0,TAU);
    ctx.lineWidth=1.1;ctx.strokeStyle=rgba(j===1?purple:blue,.14);ctx.stroke();
    const a=phase*(j%2?-1:1)+j*1.7;
    const x=cx+rx*Math.cos(a),y=cy+ry*Math.sin(a);
    haze(ctx,x,y,20,j===1?purple:blue,.13);circle(ctx,x,y,2.4,'#ffffff',.55);
   }
  }
  if(settings.glints===true){
   for(let s of this.flashes){
    const pulse=Math.pow(.5+.5*Math.sin(phase*s.speed+s.offset),9);
    if(pulse<.06)continue;
    ctx.strokeStyle=rgba(s.c>.5?blue:purple,.28*pulse);ctx.lineWidth=.9;
    ctx.beginPath();ctx.moveTo(s.x-s.rad,s.y);ctx.lineTo(s.x+s.rad,s.y);
    ctx.moveTo(s.x,s.y-s.rad);ctx.lineTo(s.x,s.y+s.rad);ctx.stroke();
    circle(ctx,s.x,s.y,1.2,'#ffffff',.45*pulse);
   }
  }
  ctx.restore();
 }
}
