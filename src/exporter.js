import {DURATION,FPS} from './engine.js';
const yieldFrame=()=>new Promise(resolve=>requestAnimationFrame(resolve));
export async function exportLoop(engine,width,onProgress){
 const c=engine.canvas,old=[c.width,c.height];
 c.width=width;c.height=Math.round(width*9/16);
 try{
  if(typeof VideoEncoder!=='undefined' && typeof VideoFrame!=='undefined'){
   try{return await mp4(engine,onProgress)}catch(e){console.warn('MP4 unavailable',e);onProgress(0,'H.264 MP4 unavailable; using WebM fallback');}
  }
  return await webm(engine,onProgress);
 }finally{c.width=old[0];c.height=old[1];engine.render(0)}
}
async function mp4(engine,progress){
 const {Muxer,ArrayBufferTarget}=await import('https://esm.sh/mp4-muxer@5.2.2');
 const {width,height}=engine.canvas;
 const config={codec:height>720?'avc1.640028':'avc1.42E01F',width,height,bitrate:height>720?11000000:6500000,framerate:FPS,avc:{format:'avc'}};
 if(!(await VideoEncoder.isConfigSupported(config)).supported)throw new Error('H264 not supported');
 const target=new ArrayBufferTarget(),muxer=new Muxer({target,video:{codec:'avc',width,height,frameRate:FPS},fastStart:'in-memory',firstTimestampBehavior:'offset'});
 let fatal=null;const encoder=new VideoEncoder({output:(chunk,meta)=>muxer.addVideoChunk(chunk,meta),error:e=>{fatal=e}});
 encoder.configure(config);
 try{
  for(let i=0;i<DURATION*FPS;i++){
   if(fatal)throw fatal;
   engine.render(i/FPS);
   const frame=new VideoFrame(engine.canvas,{timestamp:Math.round(i*1e6/FPS),duration:Math.round(1e6/FPS)});
   encoder.encode(frame,{keyFrame:i%60===0});frame.close();
   if(i%3===0){if(encoder.encodeQueueSize>8)await encoder.flush();progress((i+1)/(DURATION*FPS),`Encoding H264 · ${i+1}/300 frames`);await yieldFrame()}
  }
  await encoder.flush();if(fatal)throw fatal;muxer.finalize();progress(1,'MP4 ready');
  return {blob:new Blob([target.buffer],{type:'video/mp4'}),ext:'mp4',exact:true};
 }finally{encoder.close()}
}
async function webm(engine,progress){
 if(!engine.canvas.captureStream||typeof MediaRecorder==='undefined')throw Error('Canvas recording unavailable');
 const mime=['video/webm;codecs=vp9','video/webm;codecs=vp8','video/webm'].find(t=>MediaRecorder.isTypeSupported(t));
 if(!mime)throw Error('WebM unsupported');
 const stream=engine.canvas.captureStream(FPS),chunks=[],recorder=new MediaRecorder(stream,{mimeType:mime,videoBitsPerSecond:7000000});
 const finished=new Promise((resolve,reject)=>{recorder.ondataavailable=e=>{if(e.data.size)chunks.push(e.data)};recorder.onstop=resolve;recorder.onerror=e=>reject(e.error||Error('Recording failed'))});
 recorder.start();const start=performance.now();
 while(performance.now()-start<DURATION*1000){const t=(performance.now()-start)/1000;engine.render(t);progress(Math.min(1,t/DURATION),'Recording WebM realtime');await yieldFrame()}
 recorder.stop();await finished;stream.getTracks().forEach(t=>t.stop());
 const blob=new Blob(chunks,{type:mime});if(!blob.size)throw Error('Empty video');
 return {blob,ext:'webm',exact:false};
}