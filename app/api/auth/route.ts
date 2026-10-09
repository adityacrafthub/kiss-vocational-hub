import {beginMfa,finishMfa} from '@/lib/mfa';
import {audit} from '@/lib/audit';
import {ensureConfiguredAdmins} from '@/lib/admin-accounts';
import {database} from '@/lib/database';
import {identity,password as newPassword,limit} from '@/lib/auth-utils';
import {currentUser,sameOrigin,readJson,json,failure,text,passwordHash,settings,hash,session,throttle,HttpError,type Account} from '@/lib/security';
export async function GET(r:Request){try{const role=new URL(r.url).searchParams.get('role');const user=await currentUser(r,['admin','participant','customer'].includes(role||'')?role as any:undefined)||(role==='customer'?await currentUser(r,'participant'):null);return json({user,demo:settings().DEMO_MODE==='true'})}catch(e){return failure(e)}}
export async function POST(r:Request){try{sameOrigin(r);if(Number(r.headers.get('content-length'))>12000)throw new HttpError('Request too large.',413);const b=await readJson(r,12000);
 if(b.action==='logout'){const response=json({ok:true});for(const name of ['kiss_session','kiss_admin_session','kiss_participant_session','kiss_customer_session']){const token=r.headers.get('cookie')?.match(new RegExp('(?:^|;\\s*)'+name+'=([a-f0-9]+)'))?.[1];if(token)await database().prepare('DELETE FROM sessions WHERE token=?').bind(await hash(token)).run();response.headers.append('Set-Cookie',`${name}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`)}return response}
 await limit('auth-ip:'+(r.headers.get('cf-connecting-ip')||'local'),80,15*60000);
 if(b.action==='mfa'){const out=await finishMfa(b.challenge,b.code);const response=await session(out.user,r,true);if(out.codes.length){const body=await response.json() as any;return new Response(JSON.stringify({...body,recoveryCodes:out.codes}),{headers:response.headers})}return response}
 if(b.action==='verify'||b.action==='forgot')throw new HttpError('Email recovery is no longer used. Ask an administrator to reset your password in Settings.',410);
 const email=identity(b.identity||b.email);await throttle(r,email);if(b.role==='admin'||b.action==='register')await ensureConfiguredAdmins();
 const role=['admin','participant','customer'].includes(b.role)?b.role:'participant';
 const found=await database().prepare('SELECT * FROM accounts WHERE email=?').bind(email).first<Account&{password:string;salt:string}>();
 const roleMatches=found&&(found.role===role||(role==='customer'&&found.role==='participant'));
 if(b.action==='register'){
  if(role==='admin')throw new HttpError('Administrator registration is not public.',403);
  if(found)throw new HttpError('This contact is already registered. Log in or use Forgot password.',409);
  const salt=crypto.randomUUID()+crypto.randomUUID();const user:Account={id:crypto.randomUUID(),email,name:text(b.name,'name',100),role,created:new Date().toISOString(),verified:0};
  const hashed=await passwordHash(newPassword(b.password),salt);
  const inserted=await database().prepare('INSERT INTO accounts (id,email,name,password,salt,role,created,verified) VALUES (?,?,?,?,?,?,?,0) ON CONFLICT(email) DO NOTHING RETURNING id').bind(user.id,email,user.name,hashed,salt,role,user.created).first();
  if(!inserted)throw new HttpError('This contact is already registered. Please log in.',409);
  await audit(user.id,'account_registered');return await session(user,r);
 }
 if(b.action==='setup')throw new HttpError('Administrator setup is managed by the site owner.',403);
 if(b.action!=='login')throw new HttpError('Invalid authentication action.');
 if(typeof b.password!=='string'||!b.password.length||b.password.length>128)throw new HttpError('Enter your password.');
 const computed=await passwordHash(b.password,found?.salt||'invalid-account-salt');if(!found||!roleMatches||computed!==found.password)throw new HttpError('Contact, password or selected role is incorrect.',401);
 if(found.role==='admin')return json(await beginMfa(found));
 const {password:_p,salt:_s,...user}=found;return await session(user,r);
 }catch(e){return failure(e)}}
