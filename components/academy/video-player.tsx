'use client';
import {useEffect,useRef,useState} from 'react';
import {PlayCircle,RotateCcw,ExternalLink} from 'lucide-react';
import {youtubeId,type Lesson} from '@/lib/academy';
let apiPromise:Promise<any>|null=null;
export function warmVideoPlayer():Promise<any>{
 if(typeof window==='undefined')return Promise.resolve(null);
 const w=window as any;if(w.YT?.Player)return Promise.resolve(w.YT);
 if(apiPromise)return apiPromise;
 apiPromise=new Promise((resolve,reject)=>{
  const previous=w.onYouTubeIframeAPIReady;
  const timer=setTimeout(()=>{apiPromise=null;reject(Error('YouTube is taking longer to connect. Reload the player to retry.'))},15000);
  w.onYouTubeIframeAPIReady=()=>{clearTimeout(timer);previous?.();resolve(w.YT)};
  let script=document.getElementById('kiss-youtube-api') as HTMLScriptElement|null;
  if(!script){script=document.createElement('script');script.id='kiss-youtube-api';script.src='https://www.youtube.com/iframe_api';script.async=true;script.onerror=()=>{clearTimeout(timer);script?.remove();apiPromise=null;reject(Error('YouTube could not connect. Check your connection and reload the player.'))};document.head.appendChild(script)}
 });return apiPromise;
}
export function VideoPlayer({lesson}:{lesson:Lesson}){
 const [started,setStarted]=useState(false),[ready,setReady]=useState(false),[error,setError]=useState(''),[attempt,setAttempt]=useState(0);
 const video=useRef<HTMLVideoElement>(null),host=useRef<HTMLDivElement>(null),player=useRef<any>(null),playRequested=useRef(false);
 const id=lesson.kind==='youtube'?youtubeId(lesson.source):null;
 useEffect(()=>{
  let disposed=false;setStarted(false);setReady(false);setError('');playRequested.current=false;
  if(!id)return;
  // Load the player as soon as the lesson opens, before the learner presses Play.
  warmVideoPlayer().then(YT=>{
   if(disposed||!host.current)return;const mount=document.createElement('div');host.current.replaceChildren(mount);
   player.current=new YT.Player(mount,{videoId:id,playerVars:{autoplay:0,controls:1,playsinline:1,rel:0,origin:location.origin},events:{
    onReady:(e:any)=>{if(disposed)return;setReady(true);setError('');if(playRequested.current)e.target.playVideo()},
    onStateChange:(e:any)=>{if(disposed)return;if(e.data===1){setStarted(true);setReady(true);setError('')}},
    onError:(e:any)=>{if(disposed)return;setError([101,150].includes(e.data)?'The video owner does not allow playback inside websites. Open this lesson on YouTube.':'This lesson could not be played. Reload the player or open it on YouTube.')}
   }});
  }).catch(e=>{if(!disposed)setError(e.message)});
  return()=>{disposed=true;player.current?.destroy?.();player.current=null};
 },[lesson.source,lesson.kind,attempt,id]);
 const play=()=>{playRequested.current=true;setStarted(true);setError('');if(id){if(ready)player.current?.playVideo()}else video.current?.play().catch(()=>setError('Press Play in the video controls. If playback still fails, ask your trainer for an MP4 (H.264) version.'))};
 return <div className="lesson-player"><div className="video-wrapper">
 {lesson.kind==='youtube'?<div className="youtube-host" ref={host}/>:<video key={lesson.source+attempt} ref={video} controls playsInline preload="auto" src={'/api/media/'+encodeURIComponent(lesson.source)} onLoadedData={()=>setReady(true)} onPlaying={()=>{setStarted(true);setReady(true);setError('')}} onError={()=>setError('This video could not be loaded or its format is unsupported. Retry, or ask your trainer to upload an MP4 (H.264) video.')} aria-label={lesson.title}/>}
 {!started&&<button className="video-start" type="button" onClick={play} disabled={lesson.kind==='youtube'&&!id}><PlayCircle size={58}/><strong>{lesson.kind==='youtube'&&!id?'Enter a valid YouTube link':'Play video'}</strong><span>{lesson.title}</span></button>}
 {started&&!ready&&!error&&<div className="video-loading" role="status">Connecting video… It will play when ready.</div>}
 </div>{error&&<p className="player-message" role="status">{error}</p>}<div className="player-actions"><button type="button" onClick={()=>setAttempt(n=>n+1)}><RotateCcw size={15}/>Reload player</button>{id&&<a href={'https://www.youtube.com/watch?v='+id} target="_blank" rel="noopener"><ExternalLink size={15}/>Open on YouTube</a>}</div></div>
}
