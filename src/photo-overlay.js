import {BodyEnergy} from './body-energy.js';
// Photo overlay renderer. All motion is mathematically periodic after 10 seconds.
const TAU=Math.PI*2,fract=n=>n-Math.floor(n);
const PALETTES={cosmic:['#6cf4ff','#b88aff'],gold:['#ffe8aa','#ffa986'],chakra:['#61ecff','#f18bf0'],emerald:['#69ffe6','#89afff'],rose:['#ffd0eb','#a68dff']};
const rng=seed=>{let s=seed>>>0;return()=>{s+=0x6D2B79F5;let a=s;a=Math.imul(a^(a>>>15),a|1);a^=a+Math.imul(a^(a>>>7),a|61);return ((a^(a>>>14))>>>0)/4294967296}};
function rgba(hex,a){let k=parseInt(hex.slice(1),16);return 'rgba('+(k>>16)+','+((k>>8)&255)+','+(k&255)+','+a+')'}
function glow(c,x,y,r,hex,a){const g=c.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,rgba(hex,a));g.addColorStop(.2,rgba(hex,a*.2));g.addColorStop(1,rgba(hex,0));c.fillStyle=g;c.fillRect(x-r,y-r,r*2,r*2)}
function particle(c,x,y,r,col,alpha){c.globalAlpha=alpha;c.fillStyle=col;c.beginPath();c.arc(x,y,r,0,TAU);c.fill();c.globalAlpha=1}
function curve(style,t,i){if(style==='dna')return [65+1160*t,345-245*t+55*Math.sin(TAU*2*t)+i*16];if(style==='aura')return [990+135*Math.cos(TAU*t),365+95*Math.sin(TAU*t)+i*15];return [50+1180*t,570-90*Math.sin(Math.PI*t)-42*Math.sin(TAU*(t*1.4+i*.11))]}
export class PhotoOverlay {
 constructor(){this.bodyEnergy=new BodyEnergy();this.bodyEnabled=false;this.setSeed(1)}
 setArtwork(name){this.bodyEnabled=BodyEnergy.supports(name)}
 setSeed(seed){this.bodyEnergy.setSeed(seed);const r=rng(seed);this.stars=Array.from({length:210},()=>({x:r()*1280,y:r()*720,r:.3+r()*1.4,a:.1+r()*.46,p:r()*TAU,k:1+Math.floor(r()*3)}));this.dust=Array.from({length:120},()=>({x:r()*1280,y:r()*720,dx:4+r()*23,dy:3+r()*15,p:r()*TAU,k:1+Math.floor(r()*2),a:.10+r()*.3,r:.4+r()*1.2,t:r()}));this.sparks=Array.from({length:220},()=>({path:Math.floor(r()*3),p:r(),speed:1+Math.floor(r()*2),off:(r()-.5)*42,r:.4+r()*1.35,bright:r(),c:r()}))}
 draw(ctx,image,scene,time){const w=1280,h=720,ir=Math.max(w/image.width,h/image.height),iw=image.width*ir,ih=image.height*ir;ctx.save();ctx.globalAlpha=1;ctx.globalCompositeOperation='source-over';ctx.drawImage(image,(w-iw)/2,(h-ih)/2,iw,ih);
  const ph=((time%10)+10)%10/10*TAU,cols=PALETTES[scene.theme]||PALETTES.cosmic;ctx.globalCompositeOperation='screen';
  // Background artwork, including person, is never warped or re-generated.
  glow(ctx,1035,374,170,cols[1],.025+.015*Math.sin(ph));glow(ctx,570,420,240,cols[0],.02+.012*Math.sin(ph+1));
  for(const s of this.stars)particle(ctx,s.x,s.y,s.r,'#e6f6ff',s.a*(.4+.6*Math.pow(.5+.5*Math.sin(ph*s.k+s.p),2)));
  for(const s of this.dust){const a=s.p+ph*s.k,x=s.x+s.dx*Math.cos(a),y=s.y+s.dy*Math.sin(a);particle(ctx,x,y,s.r,s.t>.5?cols[0]:cols[1],s.a*(.7+.3*Math.cos(a)))}
  const style=scene.effect||'dna',styles=style==='aura'?['aura','stream','aura']:style==='stream'?['stream','dna','stream']:['dna','stream','dna'];
  for(let n=0;n<3;n++){let typ=styles[n];const tint=cols[n%2];ctx.beginPath();for(let i=0;i<=100;i++){let [x,y]=curve(typ,i/100,n-1);if(i)ctx.lineTo(x,y);else ctx.moveTo(x,y)}ctx.strokeStyle=rgba(tint,.045);ctx.lineWidth=2;ctx.shadowColor=tint;ctx.shadowBlur=8;ctx.stroke();ctx.shadowBlur=0}
  for(const s of this.sparks){const q=fract(s.p+(s.speed*ph/TAU)*(scene.flowDir||1)),fade=Math.min(1,q*12,(1-q)*12);if(fade<=0)continue;let [x,y]=curve(styles[s.path],q,s.path-1);y+=s.off;if(x<0||x>1280||y<0||y>720)continue;const tint=s.c>.6?cols[0]:cols[1];particle(ctx,x,y,s.r,tint,fade*.52);if(s.bright>.97)glow(ctx,x,y,s.r*12,tint,fade*.12)}
  if(this.bodyEnabled)this.bodyEnergy.draw(ctx,time,scene);
  ctx.restore();ctx.globalCompositeOperation='source-over';ctx.globalAlpha=1;
 }
 drawEmpty(c){const g=c.createLinearGradient(0,0,1280,720);g.addColorStop(0,'#081329');g.addColorStop(.55,'#16102f');g.addColorStop(1,'#071524');c.fillStyle=g;c.fillRect(0,0,1280,720);c.textAlign='center';c.fillStyle='#c6efff';c.font='bold 31px system-ui';c.fillText('Upload your AI background image',640,340);c.fillStyle='#a3aecb';c.font='20px system-ui';c.fillText('The human stays still. Only the light effects loop.',640,380)}
}