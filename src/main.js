import {HealingEngine,chooseScene,DURATION} from './engine.js';
import {exportLoop} from './exporter.js';
const $=id=>document.getElementById(id),engine=new HealingEngine($('art'));
const photos=[];
let seed=crypto.getRandomValues(new Uint32Array(1))[0],scene=chooseScene(seed);
let paused=false,rendering=false,start=performance.now(),pausedAt=0,downloadURL=null,currentImage=null;
const openDB=()=>new Promise((res,rej)=>{const req=indexedDB.open('healingloop-photos-v2',1);req.onupgradeneeded=()=>req.result.createObjectStore('photos',{keyPath:'id'});req.onsuccess=()=>res(req.result);req.onerror=()=>rej(req.error)});
async function savePhoto(photo){try{const db=await openDB();await new Promise((res,rej)=>{const tx=db.transaction('photos','readwrite');tx.objectStore('photos').put(photo);tx.oncomplete=res;tx.onerror=()=>rej(tx.error)});db.close();return true}catch(e){console.warn('Cannot persist image',e);return false}}
async function restorePhotos(){try{const db=await openDB();const found=await new Promise((res,rej)=>{const q=db.transaction('photos','readonly').objectStore('photos').getAll();q.onsuccess=()=>res(q.result);q.onerror=()=>rej(q.error)});db.close();photos.push(...found);refreshChoices();if(photos.length)await loadPhoto(photos[0]);}catch(e){console.warn(e)}}
function refreshChoices(){const select=$('photo-select'),previous=select.value;select.replaceChildren(new Option('🎲 Random uploaded photo','random'));for(const p of photos)select.add(new Option(p.name,p.id));if(previous)select.value=previous;$('photo-count').textContent=photos.length?photos.length+' ảnh đã thêm vào thư viện trình duyệt (không gửi lên máy chủ).':'Chưa có ảnh. Hãy tải ảnh PNG/JPG/WebP lên.'}
const bitmap=async blob=>{if('createImageBitmap' in window)return createImageBitmap(blob);return new Promise((res,rej)=>{const u=URL.createObjectURL(blob),im=new Image();im.onload=()=>{URL.revokeObjectURL(u);res(im)};im.onerror=()=>{URL.revokeObjectURL(u);rej(Error('Image cannot load'))};im.src=u})};
async function loadPhoto(photo){if(!photo)return;const img=await bitmap(photo.blob),old=currentImage;currentImage=img;engine.setBackgroundImage(img,photo.name);if(old?.close)old.close();activePhotoId=photo.id;loadSavedPaths(photo.id);$('message').textContent='Ảnh: '+photo.name+'. Bật Edit Path, chọn Outline và chấm theo viền người. Path được lưu riêng cho từng ảnh.';}
function setScene(next){scene=next;engine.setScene(scene);$('scene-id').textContent='SCENE #'+String(seed).padStart(10,'0');$('theme-chip').textContent=scene.theme.toUpperCase()+' · '+scene.effect.toUpperCase();$('download').hidden=true;if(downloadURL){URL.revokeObjectURL(downloadURL);downloadURL=null}start=performance.now();pausedAt=0}
async function randomize(){seed=crypto.getRandomValues(new Uint32Array(1))[0];setScene(chooseScene(seed,$('style').value,$('pose').value));if(photos.length){const choice=$('photo-select').value;const target=choice==='random'?photos[Math.floor(Math.random()*photos.length)]:photos.find(p=>p.id===choice)||photos[0];await loadPhoto(target)}}
function preview(now){if(!rendering){const sec=paused?pausedAt:(now-start)/1000%DURATION;engine.render(sec);$('phase').textContent='00:'+String(Math.floor(sec)).padStart(2,'0')+' / 00:10'}requestAnimationFrame(preview)}
$('photo-upload').addEventListener('change',async e=>{const selected=[...e.target.files].filter(f=>/^image\/(png|jpeg|webp)$/.test(f.type));if(!selected.length)return;$('photo-count').textContent='Đang nhập ảnh...';let saved=0;for(const blob of selected){const p={id:crypto.randomUUID(),name:blob.name,blob};photos.push(p);if(await savePhoto(p))saved++;}refreshChoices();$('photo-select').value='random';await loadPhoto(photos[photos.length-1]);$('message').textContent='Đã tải '+selected.length+' ảnh, lưu cục bộ '+saved+' ảnh. Bấm Generate để tạo video 10 giây.';e.target.value='';});
$('photo-select').addEventListener('change',async()=>{if(rendering)return;const p=photos.find(x=>x.id===$('photo-select').value);if(p)await loadPhoto(p)});
$('play').addEventListener('click',()=>{if(!paused){pausedAt=(performance.now()-start)/1000%DURATION;paused=true;$('play').textContent='▶ Play preview'}else{start=performance.now()-pausedAt*1000;paused=false;$('play').textContent='❚❚ Pause preview'}});
$('random-preview').addEventListener('click',async()=>{if(!rendering){await randomize();if(!photos.length)$('message').textContent='Hãy tải ảnh AI lên trước khi Generate.'}});
$('generate').addEventListener('click',async()=>{if(rendering)return;if(!photos.length){$('message').textContent='Bạn chưa tải ảnh AI. Hãy chọn ảnh ở AI background library trước.';return}rendering=true;$('generate').disabled=true;$('random-preview').disabled=true;$('photo-upload').disabled=true;$('photo-select').disabled=true;$('generate').textContent='Rendering...';$('progress-wrap').hidden=false;$('download').hidden=true;$('progress-bar').style.width='0%';
 try{if(!editing && $('photo-select').value==='random')await randomize();else {seed=crypto.getRandomValues(new Uint32Array(1))[0];setScene(chooseScene(seed,$('style').value,$('pose').value));}const width=Number($('res').value);const result=await exportLoop(engine,width,(value,msg)=>{$('progress-bar').style.width=Math.floor(value*100)+'%';$('progress-pct').textContent=Math.floor(value*100)+'%';$('progress-description').textContent=msg});downloadURL=URL.createObjectURL(result.blob);const link=$('download');link.href=downloadURL;link.download='healing_photo_loop_'+seed+'_10s.'+result.ext;link.textContent='↓ Download '+result.ext.toUpperCase()+' · '+(result.blob.size/1048576).toFixed(1)+' MB';link.hidden=false;$('message').textContent=result.exact?'Hoàn tất 300 khung hình MP4. Các hiệu ứng tuần hoàn đúng 10 giây, hãy ghép hai bản để kiểm tra điểm nối.':'Đã xuất video WebM realtime; số khung hình có thể không chính xác như MP4 WebCodecs.';}catch(e){console.error(e);$('message').textContent='Không thể xuất: '+e.message}finally{rendering=false;start=performance.now();$('generate').disabled=false;$('random-preview').disabled=false;$('photo-upload').disabled=false;$('photo-select').disabled=false;$('generate').textContent='✦ Generate random 10s video';}});

// Manual path editor (SVG is separate from the canvas and never gets exported).
const svg=$('path-svg'),SVG_NS='http://www.w3.org/2000/svg';
const PATH_TYPES=['outline','body','arm','leg','aura'];
const PATH_COLORS={outline:'#76f2ff',body:'#70c8ff',arm:'#ffb978',leg:'#8ef5b6',aura:'#dfa0ff'};
let activePhotoId=null,editorPaths=Object.fromEntries(PATH_TYPES.map(k=>[k,[]]));
let pointerDragging=null,editing=false;
const emptyPaths=()=>Object.fromEntries(PATH_TYPES.map(k=>[k,[]]));
function readStoredPaths(photoId){
 try{const raw=localStorage.getItem('hls:manual-paths:'+photoId);return raw?JSON.parse(raw):emptyPaths()}catch(e){console.warn('Cannot load paths',e);return emptyPaths()}
}
function saveStoredPaths(){
 if(!activePhotoId)return false;
 try{localStorage.setItem('hls:manual-paths:'+activePhotoId,JSON.stringify(editorPaths));return true}
 catch(e){console.warn('Cannot save paths',e);$('message').textContent='Path chỉ lưu được tạm thời: bộ nhớ trình duyệt đang không khả dụng.';return false}
}
function loadSavedPaths(photoId){
 const saved=readStoredPaths(photoId);
 engine.setManualPaths(saved);editorPaths=engine.getManualPaths();
 drawPathEditor();updatePathStatus();
}
function updatePathStatus(){
 const n=PATH_TYPES.filter(k=>editorPaths[k].length>=2).length;
 $('body-status').classList.toggle('active',n>0);
 $('body-status').textContent=n?('✓ '+n+' PATH ACTIVE · Ánh sáng bám theo đường đã chọn, không xuyên qua vùng bạn không đánh dấu.'):'Chưa có path. Chọn Outline để chấm sát viền người, hoặc Arm / Leg / Aura.';
 $('path-summary').textContent=PATH_TYPES.map(k=>k+': '+editorPaths[k].length).join(' · ');
}
function applyPaths({save=true}={}){
 engine.setManualPaths(editorPaths);editorPaths=engine.getManualPaths();
 drawPathEditor();updatePathStatus();
 if(save)saveStoredPaths();
}
function svgEl(tag,attrs){
 const el=document.createElementNS(SVG_NS,tag);
 for(const [key,val] of Object.entries(attrs))el.setAttribute(key,String(val));
 return el;
}
function drawPathEditor(){
 svg.replaceChildren();
 if(!editing)return;
 const active=$('path-type').value;
 for(const key of PATH_TYPES){
  const pts=editorPaths[key];if(!pts?.length)continue;
  const color=PATH_COLORS[key],selected=key===active;
  if(pts.length>=2){
   svg.append(svgEl('polyline',{points:pts.map(p=>p.join(',')).join(' '),fill:'none',stroke:color,'stroke-width':selected?3:1.9,opacity:selected?.95:.4,'stroke-linejoin':'round','stroke-linecap':'round'}));
  }
  if(selected)pts.forEach(([x,y],i)=>{
   const el=svgEl('circle',{cx:x,cy:y,r:7,fill:color,stroke:'#091525','stroke-width':2,class:'path-point'});
   el.dataset.path=key;el.dataset.index=String(i);svg.append(el);
  });
 }
}
function mapPoint(e){
 const rect=svg.getBoundingClientRect();const x=(e.clientX-rect.left)*1280/rect.width,y=(e.clientY-rect.top)*720/rect.height;
 return [Math.max(0,Math.min(1280,Math.round(x*10)/10)),Math.max(0,Math.min(720,Math.round(y*10)/10))];
}
svg.addEventListener('pointerdown',e=>{
 if(!editing||rendering||!activePhotoId)return;
 e.preventDefault();const key=$('path-type').value,point=e.target.closest?.('.path-point');
 svg.setPointerCapture(e.pointerId);
 if(point&&point.dataset.path===key){pointerDragging={key,index:Number(point.dataset.index),id:e.pointerId};return}
 editorPaths[key].push(mapPoint(e));applyPaths();
});
svg.addEventListener('pointermove',e=>{
 if(!pointerDragging||pointerDragging.id!==e.pointerId||!editing)return;
 editorPaths[pointerDragging.key][pointerDragging.index]=mapPoint(e);
 applyPaths({save:false});
});
function endDrag(e){
 if(!pointerDragging||pointerDragging.id!==e.pointerId)return;
 pointerDragging=null;applyPaths();
 try{if(svg.hasPointerCapture(e.pointerId))svg.releasePointerCapture(e.pointerId)}catch{}
}
svg.addEventListener('pointerup',endDrag);
svg.addEventListener('pointercancel',endDrag);
$('edit-paths').addEventListener('change',e=>{
 editing=e.target.checked;svg.classList.toggle('editing',editing);
 $('editor-state').textContent=editing?'EDIT ON':'OFF';
 $('editor-state').classList.toggle('active',editing);
 if(editing&&activePhotoId&&[...$('photo-select').options].some(o=>o.value===activePhotoId))$('photo-select').value=activePhotoId;
 drawPathEditor();
});
$('path-type').addEventListener('change',drawPathEditor);
$('undo-path').addEventListener('click',()=>{
 const pts=editorPaths[$('path-type').value];if(pts?.length){pts.pop();applyPaths();}
});
$('clear-path').addEventListener('click',()=>{
 editorPaths[$('path-type').value]=[];applyPaths();
});
$('close-path').addEventListener('click',()=>{
 const key=$('path-type').value,pts=editorPaths[key];
 if(pts.length<3){$('message').textContent='Cần ít nhất 3 điểm để Close Path.';return}
 const first=pts[0],last=pts[pts.length-1];
 if(Math.hypot(first[0]-last[0],first[1]-last[1])>2)pts.push([...first]);
 applyPaths();$('message').textContent='Đã đóng path, dòng ánh sáng có thể chạy quanh viền đã vẽ.';
});
$('save-path').addEventListener('click',()=>{
 if(saveStoredPaths())$('message').textContent='Đã lưu path của ảnh hiện tại. Bấm Generate để dùng các đường vừa vẽ.';
});
const FX_KEYS=['aurora','mist','fireflies','glints','orbits','backgroundTrails'];
function syncAmbient(){
 const options=Object.fromEntries(FX_KEYS.map(k=>[k,$('fx-'+k).checked]));
 engine.setAmbientEffects(options);
}
for(const key of FX_KEYS)$('fx-'+key).addEventListener('change',syncAmbient);
syncAmbient();

setScene(scene);restorePhotos();requestAnimationFrame(preview);
