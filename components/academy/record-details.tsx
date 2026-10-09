'use client';
import {Table,TableBody,TableCell,TableHead,TableHeader,TableRow} from '@/components/ui/table';
const hidden=new Set(['password','salt','key','fingerprint','token','code','demo']);
const label=(s:string)=>s.replace(/([a-z])([A-Z])/g,'$1 $2').replace(/_/g,' ').replace(/^./,c=>c.toUpperCase());
function scalar(k:string,v:any){if(k==='paymentMethod'&&typeof v==='string'&&/^Demo\b/i.test(v))return '—';if(v===null||v===undefined||v==='')return '—';if(typeof v==='boolean')return v?'Yes':'No';if(['price','total'].includes(k)&&typeof v==='number')return new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR'}).format(v/100);if(typeof v==='string'&&/^\d{4}-\d\d-\d\dT/.test(v))return new Date(v).toLocaleString('en-IN',{timeZone:'Asia/Kolkata'});return String(v)}
export function RecordDetails({record,depth=0}:{record:any;depth?:number}){
 if(depth>5)return <span>Additional nested details</span>;
 if(Array.isArray(record)){if(!record.length)return <p className="record-empty">No entries</p>;if(record.every(x=>!x||typeof x!=='object'))return <ul>{record.map((v,i)=><li key={i}>{scalar('',v)}</li>)}</ul>;
 const keys=[...new Set(record.flatMap(x=>Object.keys(x||{})))].filter(k=>!hidden.has(k));return <div className="record-table-wrap"><Table><TableHeader><TableRow>{keys.map(k=><TableHead key={k}>{label(k)}</TableHead>)}</TableRow></TableHeader><TableBody>{record.map((r,i)=><TableRow key={i}>{keys.map(k=><TableCell key={k}>{r?.[k]&&typeof r[k]==='object'?<RecordDetails record={r[k]} depth={depth+1}/>:scalar(k,r?.[k])}</TableCell>)}</TableRow>)}</TableBody></Table></div>}
 if(!record||typeof record!=='object')return <span>{scalar('',record)}</span>;
 return <div className="record-details">{Object.entries(record).filter(([k])=>!hidden.has(k)).map(([k,v])=>v&&typeof v==='object'?<details className="record-group" key={k} open><summary>{label(k)}{Array.isArray(v)&&<span>{v.length} entries</span>}</summary><RecordDetails record={v} depth={depth+1}/></details>:<div className="record-field" key={k}><dt>{label(k)}</dt><dd>{scalar(k,v)}</dd></div>)}</div>
}
