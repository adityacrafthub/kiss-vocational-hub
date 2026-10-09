import {code as mfaCode} from './mfa-helper.mjs';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {readFile,readdir} from 'node:fs/promises';
import path from 'node:path';
import {pbkdf2Sync,randomUUID} from 'node:crypto';
const require=createRequire(import.meta.url);const {Miniflare}=createRequire(require.resolve('wrangler/package.json'))('miniflare');
const root=path.resolve('dist/server');const files=await readdir(root,{recursive:true});
const password='Test@1234';
const accounts=['admin1@example.org','admin2@example.org'].map(email=>{const salt=randomUUID();return {id:randomUUID(),email,name:'Test admin',salt,password:pbkdf2Sync(password,salt,100000,32,'sha256').toString('hex')}});
const mf=new Miniflare({modules:[{type:'ESModule',path:path.join(root,'index.js')},...files.filter(f=>/\.m?js$/.test(f)&&f!=='index.js').map(f=>({type:'ESModule',path:path.join(root,f)}))],modulesRoot:root,compatibilityDate:'2026-05-15',compatibilityFlags:['nodejs_compat'],d1Databases:['DB'],r2Buckets:['BUCKET'],bindings:{OTP_SECRET:'test-secret-long-enough-for-encrypted-mfa',ADMIN_ACCOUNTS_JSON:JSON.stringify(accounts)}});
try{
 const db=await mf.getD1Database('DB');for(const f of (await readdir('drizzle')).filter(f=>f.endsWith('.sql')).sort()){for(const sql of (await readFile('drizzle/'+f,'utf8')).split('--> statement-breakpoint').flatMap(s=>s.split(';')).map(s=>s.trim()).filter(Boolean))await db.prepare(sql).run()}
 await db.prepare("INSERT INTO accounts(id,email,name,password,salt,role,created) VALUES ('existing',?,'Existing user','old','old','participant','2026-01-01')").bind(accounts[0].email).run();
 const login=(email,pass=password,role='admin')=>mf.dispatchFetch('http://test/api/auth',{method:'POST',headers:{origin:'http://test','content-type':'application/json'},body:JSON.stringify({action:'login',email,password:pass,role})});
 const cookies=[];
 for(const a of accounts){const r=await login(a.email);assert.equal(r.status,200);const first=await r.json();assert.equal(first.mfaRequired,true);const verified=await mf.dispatchFetch('http://test/api/auth',{method:'POST',headers:{origin:'http://test','content-type':'application/json'},body:JSON.stringify({action:'mfa',challenge:first.challenge,code:mfaCode(first.secret)})});assert.equal(verified.status,200);const j=await verified.json();assert.equal(j.user.role,'admin');assert.equal(j.user.password,undefined);if(a===accounts[0])assert.equal(j.user.id,'existing');cookies.push(verified.headers.get('set-cookie').split(';')[0])}
 assert.equal((await login(accounts[0].email,'incorrect')).status,401);
 assert.equal((await login(accounts[0].email,password,'participant')).status,401);
 for(const cookie of cookies){const r=await mf.dispatchFetch('http://test/api/academy?mode=admin',{headers:{cookie}});assert.equal(r.status,200);assert.equal((await r.json()).accounts.length,2)}
 // Reproduce participant sign-in replacing the shared cookie in another tab.
 await db.prepare("INSERT INTO accounts(id,email,name,password,salt,role,created,verified) VALUES ('learner-test','learner@example.org','Learner',?,?,'participant','2026-01-01',1)").bind(accounts[0].password,accounts[0].salt).run();
 const registered=await login('learner@example.org',password,'participant');assert.equal(registered.status,200);const learnerCookie=registered.headers.get('set-cookie').split(';')[0];
 const mixedCookie=learnerCookie+'; '+cookies[0].replace('kiss_session=','kiss_admin_session=');
 let response=await mf.dispatchFetch('http://test/api/academy?mode=admin',{headers:{cookie:mixedCookie}});assert.equal(response.status,200);const full=await response.json();assert.equal(full.user.role,'admin');
 const programme={...full.state.programmes[0],name:'Saved from admin tab',description:'Regression test',category:'Food',trainer:'Trainer',duration:10,lessons:[],published:false};
 response=await mf.dispatchFetch('http://test/api/academy',{method:'POST',headers:{origin:'http://test',cookie:mixedCookie,'content-type':'application/json'},body:JSON.stringify({action:'saveProgramme',programme})});assert.equal(response.status,200,await response.text());
 response=await mf.dispatchFetch('http://test/api/academy?mode=participant',{headers:{cookie:mixedCookie}});assert.equal((await response.json()).user.role,'participant');
 response=await mf.dispatchFetch('http://test/api/academy',{method:'POST',headers:{origin:'http://test',cookie:learnerCookie,'content-type':'application/json'},body:JSON.stringify({action:'saveProgramme',programme})});assert.equal(response.status,403);
 console.log('PASS: admin saves after participant signs in in another tab; participant remains unable to edit programmes.');
 assert.equal((await db.prepare('SELECT count(*) AS n FROM account_provisioning').first()).n,1);
 console.log('PASS: both configured admins, nine-character password, role isolation, wrong-password rejection, existing identity preservation and idempotent provisioning.');
}finally{await mf.dispose()}
