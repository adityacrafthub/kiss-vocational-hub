import type {State,Row} from './hub';
export type Lesson={id:string;title:string;kind:'youtube'|'upload';source:string};
export const catalogue=[
 {id:'bakery',name:'Bakery',category:'Food & nutrition',description:'Discover the fundamentals of baking, from measuring ingredients and mixing dough to shaping, baking and presenting fresh products.',skills:'Ingredient preparation · Dough making · Baking essentials'},
 {id:'knitting-crochet',name:'Knitting and crochet',category:'Textiles & craft',description:'Learn how yarn becomes useful, handmade products. Build confidence with tools, stitches, patterns and finishing techniques.',skills:'Basic stitches · Pattern reading · Finishing'},
 {id:'candle-making',name:'Candle making',category:'Home & craft',description:'Explore wax, wicks and moulds while learning to plan, make and finish candles with safe workshop practices.',skills:'Wax and wick basics · Moulding · Product finishing'},
 {id:'soft-toy-making',name:'Soft toy making',category:'Textiles & craft',description:'Bring a simple character to life through pattern preparation, fabric cutting, stitching, stuffing and careful finishing.',skills:'Pattern cutting · Stitching · Stuffing and finishing'},
 {id:'mushroom-cultivation',name:'Mushroom cultivation',category:'Agriculture',description:'Explore the cultivation cycle, including growing conditions, substrate preparation, hygiene, harvesting and storage.',skills:'Growing conditions · Hygiene · Harvest and storage'}
];
export function normalise(s:State){
 const aliases:Record<string,string[]>={'bakery':['bakery production'],'knitting-crochet':['knitting and crochet making']};
 const original=(id:string)=>s.programmes.some(p=>p.id!==id&&aliases[id]?.includes(p.name.toLowerCase().trim()));
 // Remove only unused, untouched default drafts when a real programme already exists.
 s.programmes=s.programmes.filter(p=>!(original(p.id)&&!p.published&&!p.lessons?.length&&!p.duration&&!s.people.some(x=>x.programme===p.id)&&!s.products.some(x=>x.programme===p.id)));
 if(!(s as any).catalogueVersion){for(const c of catalogue){if(!original(c.id)&&!s.programmes.some(p=>p.name.toLowerCase()===c.name.toLowerCase()))s.programmes.push({...c,trainer:'',duration:0,lessons:[],published:false})}(s as any).catalogueVersion=2}
 return s;
}
export function youtubeId(raw:string){try{const u=new URL(raw);if(!['https:','http:'].includes(u.protocol))return null;let id='';if(['youtube.com','www.youtube.com','m.youtube.com'].includes(u.hostname)){id=u.searchParams.get('v')||u.pathname.match(/^\/(?:embed|shorts)\/([^/]+)/)?.[1]||''}else if(u.hostname==='youtu.be')id=u.pathname.slice(1);return /^[\w-]{11}$/.test(id)?id:null}catch{return null}}
export function publicProgramme(p:Row){return {id:p.id,name:p.name,description:p.description||'A practical vocational programme to build skills for work.',category:p.category||'Vocational skills',skills:p.skills||'',duration:p.duration,trainer:p.trainer,parts:(p.lessons||[]).length,published:!!p.published}}
export function learnerRecord(s:State,userId:string){return s.people.find(p=>p.account===userId)}
export function saveProgramme(s:State,b:Record<string,any>):State{
 const next=structuredClone(s);const existing=next.programmes.find(p=>p.id===b.id);if(existing?.deleted)throw Error('This programme has been deleted.');const trimmed=(key:string,max:number)=>{if(typeof b[key]!=='string'||!b[key].trim()||b[key].trim().length>max)throw Error(`Enter a valid ${key}.`);return b[key].trim()};
 const name=trimmed('name',120), description=trimmed('description',1600),trainer=trimmed('trainer',120),category=trimmed('category',100);if(next.programmes.some(p=>p.id!==b.id&&p.name.toLowerCase()===name.toLowerCase()))throw Error('A programme with this name already exists.');
 const duration=Number(b.duration);if(!Number.isFinite(duration)||duration<=0||duration>10000)throw Error('Enter training hours between 0 and 10,000.');
 if(!Array.isArray(b.lessons)||b.lessons.length>100)throw Error('Use up to 100 parts per programme.');
 const lessons:Lesson[]=b.lessons.map((l:any)=>{if(typeof l.title!=='string'||!l.title.trim()||l.title.length>150)throw Error('Give every part a title.');if(l.kind==='youtube'){if(!youtubeId(l.source))throw Error('Paste a valid YouTube video link for every YouTube part.')}else if(l.kind==='upload'){if(typeof l.source!=='string'||!/^video-[a-f0-9-]+$/.test(l.source))throw Error('Upload a video for every uploaded-video part.')}else throw Error('Choose a video source.');return {id:typeof l.id==='string'&&existing?.lessons?.some((x:Lesson)=>x.id===l.id)?l.id:crypto.randomUUID(),title:l.title.trim(),kind:l.kind,source:l.source}});
 if(new Set(lessons.map(l=>l.id)).size!==lessons.length)throw Error('Lesson IDs must be unique.');
 if(b.published&&lessons.length===0)throw Error('Add at least one video part before publishing.');
 const p={...existing,id:existing?.id||crypto.randomUUID(),name,description,trainer,category,duration,lessons,published:!!b.published,updated:new Date().toISOString()};if(existing)next.programmes[next.programmes.indexOf(existing)]=p;else next.programmes.push(p);
 next.activity.unshift({id:crypto.randomUUID(),action:'programme',message:`Programme ${existing?'updated':'created'}: ${name}`,time:new Date().toISOString()});return next;
}
export function learnerAction(s:State,user:{id:string;name:string;email:string},action:string,b:Record<string,any>){const next=structuredClone(s);let person=learnerRecord(next,user.id);const now=new Date().toISOString();let message='';let celebrate=false;
 if(action==='enrol'){
  if(person)throw Error('You are already enrolled. Each participant can join only one programme.');const p=next.programmes.find(p=>p.id===b.programme);if(p?.deleted||!p?.published||!p.lessons?.length)throw Error('This programme is not open for enrolment yet.');
  person={id:crypto.randomUUID(),account:user.id,name:user.name,email:user.email,reference:user.id,programme:p.id,programmeName:p.name,courseLessons:structuredClone(p.lessons),courseHours:p.duration,done:[],status:'In training',enrolled:now,careerChoice:null};next.people.push(person);message=`${user.name} enrolled in ${p.name}`;
 }else{
  if(!person)throw Error('Enrol in a programme first.');const lessons:Lesson[]=person.courseLessons||[];const done:string[]=person.done||[];
  if(action==='completeLesson'||action==='finishCourse'){
   if(person.status==='Certified')return {state:next,celebrate:false};const idx=lessons.findIndex(l=>l.id===b.lesson);if(idx<0)throw Error('Lesson not found.');if(lessons.slice(0,idx).some(l=>!done.includes(l.id)))throw Error('Complete the earlier parts first.');const last=idx===lessons.length-1;
   if(last!== (action==='finishCourse'))throw Error(last?'Use Finish course for the final part.':'Finish the other parts first.');if(!done.includes(b.lesson))done.push(b.lesson);person.done=done;
   if(last){person.status='Certified';person.completed=now;person.certified=now;person.certificate='KISS-'+crypto.randomUUID().toUpperCase();message=`Certificate earned: ${person.name}`}else message=`${person.name} completed ${lessons[idx].title}`;
  }else if(action==='viewCertificate'){if(person.status!=='Certified')throw Error('Complete your course before opening the certificate.');celebrate=!person.certificateSeen;if(celebrate)person.certificateSeen=now;}
  else if(action==='careerChoice'){if(person.status!=='Certified')throw Error('Complete your course first.');if(!['work','leave'].includes(b.choice))throw Error('Choose whether to work or leave.');person.careerChoice=b.choice;person.careerChoiceAt=now;message=`${person.name} chose to ${b.choice==='work'?'continue in production':'leave after training'}`;}
  else throw Error('Unknown participant action.');
 }
 if(message)next.activity.unshift({id:crypto.randomUUID(),action,message,time:now});return {state:next,celebrate};
}
