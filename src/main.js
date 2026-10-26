import {HealingEngine,chooseScene,DURATION} from './engine.js';
import {exportLoop} from './exporter.js';
const $=id=>document.getElementById(id),engine=new HealingEngine($('art'));
let seed=crypto.getRandomValues(new Uint32Array(1))[0],scene=chooseScene(seed),paused=false,rendering=false,start=performance.now(),pausedAt=0,downloadURL=null;
function load(newScene){scene=newScene;engine.setScene(scene);$('scene-id').textContent='SCENE #'+String(seed).padStart(10,'0');$('theme-chip').textContent=scene.theme.toUpperCase()+' HEALING';$('download').hidden=true;if(downloadURL){URL.revokeObjectURL(downloadURL);downloadURL=null}start=performance.now();pausedAt=0}
function randomize(){seed=crypto.getRandomValues(new Uint32Array(1))[0];load(chooseScene(seed,$('style').value,$('pose').value))}
function preview(now){if(!rendering){const sec=paused?pausedAt:(now-start)/1000%DURATION;engine.render(sec);$('phase').textContent='00:'+String(Math.floor(sec)).padStart(2,'0')+' / 00:10'}requestAnimationFrame(preview)}
$('play').addEventListener('click',()=>{if(!paused){pausedAt=(performance.now()-start)/1000%DURATION;paused=true;$('play').textContent='▶ Play preview'}else{start=performance.now()-pausedAt*1000;paused=false;$('play').textContent='❚❚ Pause preview'}});
$('random-preview').addEventListener('click',()=>{if(!rendering){randomize();$('message').textContent='Random preview created. Press Generate to export video.'}});
$('generate').addEventListener('click',async()=>{if(rendering)return;rendering=true;randomize();$('generate').disabled=true;$('random-preview').disabled=true;$('generate').textContent='Rendering...';$('progress-wrap').hidden=false;$('download').hidden=true;
 try{const width=Number($('res').value);
 const result=await exportLoop(engine,width,(value,msg)=>{$('progress-bar').style.width=Math.floor(value*100)+'%';$('progress-pct').textContent=Math.floor(value*100)+'%';$('progress-description').textContent=msg});
 downloadURL=URL.createObjectURL(result.blob);const link=$('download');link.href=downloadURL;link.download=`healing_loop_${scene.theme}_${seed}_10s.${result.ext}`;link.textContent=`↓ Download ${result.ext.toUpperCase()} · ${(result.blob.size/1048576).toFixed(1)} MB`;link.hidden=false;
 $('message').textContent=result.exact?'Complete: 300 frames at 30 FPS; source animation has an exact 10-second cycle.':'Complete: WebM realtime recording. For exact 300-frame MP4 encoding, use desktop Chrome/Edge with H.264 WebCodecs.';
 }catch(e){console.error(e);$('message').textContent='Export failed: '+e.message+' — use Chrome/Edge on HTTPS or localhost.'}
 finally{rendering=false;start=performance.now();$('generate').disabled=false;$('random-preview').disabled=false;$('generate').textContent='✦ Generate random 10s video'}
});
load(scene);requestAnimationFrame(preview);