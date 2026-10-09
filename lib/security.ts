import {database} from './database';
import {env} from 'cloudflare:workers';
export type Account={id:string;email:string;name:string;role:'admin'|'participant'|'customer';created:string;verified?:number};
export class HttpError extends Error { constructor(message:string,public status=400){super(message)} }
export const settings=()=>env as unknown as {DEMO_MODE?:string;OTP_SECRET?:string;BACKUP_JOB_SECRET?:string;BACKUP_ENCRYPTION_KEY?:string;STRIPE_SECRET_KEY?:string;STRIPE_WEBHOOK_SECRET?:string;PAYMENTS_ENABLED?:string;APP_URL?:string;COURIER_WEBHOOK_SECRET?:string;COURIER_PROVIDER?:string;APP_ENV?:string;COURIER_MOCK_ENABLED?:string;ADMIN_SETUP_HASH?:string;ADMIN_ACCOUNTS_JSON?:string;BUCKET:R2Bucket};
export const hex=(v:ArrayBuffer)=>Array.from(new Uint8Array(v),b=>b.toString(16).padStart(2,'0')).join('');
export const hash=async(v:string)=>hex(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(v)));
export async function passwordHash(password:string,salt:string){const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(password),'PBKDF2',false,['deriveBits']);return hex(await crypto.subtle.deriveBits({name:'PBKDF2',salt:new TextEncoder().encode(salt),iterations:100000,hash:'SHA-256'},key,256))}
export function sameOrigin(r:Request){if(r.headers.get('origin')!==new URL(r.url).origin)throw new HttpError('Request origin is not allowed.',403)}
export async function currentUser(r:Request,role?:'admin'|'participant'|'customer'):Promise<Account|null>{
 const cookies=r.headers.get('cookie')||'';
 const names=role?[`kiss_${role}_session`,'kiss_session']:['kiss_session'];
 for(const name of names){const token=cookies.match(new RegExp('(?:^|;\\s*)'+name+'=([a-f0-9]+)'))?.[1];if(!token)continue;
 const user=await database().prepare('SELECT a.id,a.email,a.name,a.role,a.created,a.verified FROM accounts a JOIN sessions s ON s.account=a.id WHERE s.token=? AND s.expires>? AND (a.role!="admin" OR s.mfa=1)').bind(await hash(token),Date.now()).first<Account>();
 if(user&&(!role||user.role===role))return user;
 }return null;
}
export async function requireUser(r:Request,role?:'admin'|'participant'|'customer'){const user=await currentUser(r,role);if(!user){if(role&&await currentUser(r))throw new HttpError(`Please sign in as ${role==='admin'?'an administrator':'a participant'} to continue.`,403);throw new HttpError('Please log in to continue.',401)}return user}
export function json(data:unknown,status=200,headers:Record<string,string>={}){return Response.json(data,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff',...headers}})}
export function failure(e:unknown){if(e instanceof HttpError)return json({error:e.message},e.status);console.error(e);return json({error:'Something went wrong. Please try again; your input has been preserved.'},503)}
export async function session(user:Account,r:Request,mfa=false){
 if(user.role==='admin'&&!mfa)throw new HttpError('Administrator MFA is required.',403);
 await database().batch([database().prepare('DELETE FROM sessions WHERE expires<?').bind(Date.now()),database().prepare('DELETE FROM auth_limits WHERE expires<?').bind(Date.now())]);
 const token=hex(crypto.getRandomValues(new Uint8Array(32)).buffer);await database().prepare('INSERT INTO sessions (token,account,expires,mfa) VALUES (?,?,?,?)').bind(await hash(token),user.id,Date.now()+7*86400000,mfa?1:0).run();
 const response=json({user});const flags=`; Path=/; HttpOnly; SameSite=Lax; Max-Age=604800${new URL(r.url).protocol==='https:'?'; Secure':''}`;
 response.headers.append('Set-Cookie',`kiss_session=${token}${flags}`);
 response.headers.append('Set-Cookie',`kiss_${user.role}_session=${token}${flags}`);return response;
}
export function text(v:unknown,label:string,max=160){if(typeof v!=='string'||!v.trim()||v.trim().length>max)throw new HttpError(`Enter a valid ${label}.`);return v.trim()}
export async function throttle(r:Request,email:string){const key=await hash((r.headers.get('cf-connecting-ip')||'local')+'|'+email);const now=Date.now();const result=await database().prepare('INSERT INTO auth_limits (key,count,expires) VALUES (?,1,?) ON CONFLICT(key) DO UPDATE SET count=CASE WHEN expires<? THEN 1 ELSE count+1 END,expires=CASE WHEN expires<? THEN excluded.expires ELSE expires END RETURNING count').bind(key,now+15*60000,now,now).first<{count:number}>();if(result&&result.count>12)throw new HttpError('Too many attempts. Please try again in 15 minutes.',429)}

export async function requireShopper(r:Request){const user=await currentUser(r,'customer')||await currentUser(r,'participant');if(!user)throw new HttpError('Sign in with a customer or participant account to continue.',401);return user}

export async function readJson(r:Request,max=12000):Promise<any>{
 if(!r.body)throw new HttpError('Enter the required details.');const reader=r.body.getReader();let size=0;const chunks:Uint8Array[]=[];
 while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>max){await reader.cancel();throw new HttpError('Request too large.',413)}chunks.push(value)}
 const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length}
 try{const body=JSON.parse(new TextDecoder().decode(bytes));if(!body||typeof body!=='object'||Array.isArray(body))throw Error();return body}catch{throw new HttpError('Invalid request details.',400)}
}
