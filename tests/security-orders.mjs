import {code as mfaCode} from './mfa-helper.mjs';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {readFile,readdir} from 'node:fs/promises';
import path from 'node:path';
import {pbkdf2Sync,randomUUID} from 'node:crypto';
const require=createRequire(import.meta.url);const {Miniflare}=createRequire(require.resolve('wrangler/package.json'))('miniflare');
const root=path.resolve('dist/server'),files=await readdir(root,{recursive:true});
const adminSalt=randomUUID(),adminPassword='Test@1234';const config=[{id:'test-admin',email:'admin@example.org',name:'Test Admin',salt:adminSalt,password:pbkdf2Sync(adminPassword,adminSalt,100000,32,'sha256').toString('hex')}];
const mf=new Miniflare({modules:[{type:'ESModule',path:path.join(root,'index.js')},...files.filter(f=>/\.m?js$/.test(f)&&f!=='index.js').map(f=>({type:'ESModule',path:path.join(root,f)}))],modulesRoot:root,compatibilityDate:'2026-05-15',compatibilityFlags:['nodejs_compat'],d1Databases:['DB'],r2Buckets:['BUCKET'],bindings:{ADMIN_ACCOUNTS_JSON:JSON.stringify(config),OTP_SECRET:'isolated-test-secret-not-for-production'},outboundService:()=>{throw Error('No email or SMS service should be called')}});
let cookie='';const pass='An example test passphrase 7291';
async function call(route,body,c=''){const r=await mf.dispatchFetch('http://test'+route,{method:body?'POST':'GET',headers:{...(body?{origin:'http://test','content-type':'application/json'}:{}),...(c?{cookie:c}:{})},body:body?JSON.stringify(body):undefined});return {status:r.status,j:await r.json(),cookie:r.headers.get('set-cookie')?.split(';')[0]}}
async function register(email,role='customer'){const r=await call('/api/auth',{action:'register',identity:email,password:pass,name:'Test '+role,role});assert.equal(r.status,200,JSON.stringify(r.j));assert.equal(r.j.verificationRequired,undefined);assert.equal(r.j.user.verified,0);assert.ok(r.cookie);return r}
try{
 const db=await mf.getD1Database('DB');for(const f of (await readdir('drizzle')).filter(f=>f.endsWith('.sql')).sort()){for(const sql of (await readFile('drizzle/'+f,'utf8')).split('--> statement-breakpoint').flatMap(s=>s.split(';')).map(s=>s.trim()).filter(Boolean))await db.prepare(sql).run()}
 const a=await call('/api/auth',{action:'login',email:'admin@example.org',password:adminPassword,role:'admin'});assert.equal(a.status,200);assert.equal(a.cookie,undefined);assert.equal(a.j.mfaRequired,true);const mfa=await call('/api/auth',{action:'mfa',challenge:a.j.challenge,code:mfaCode(a.j.secret)});assert.equal(mfa.status,200,JSON.stringify(mfa.j));const admin=mfa.cookie;
 assert.equal((await call('/api/auth',{action:'register',identity:'attacker@example.org',name:'X',password:pass,role:'admin'})).status,403);
 const one=await register('one@gmail.com'),two=await register('two@example.org'),learner=await register('learner@kiit.ac.in','participant');
 assert.equal((await call('/api/auth',{action:'register',identity:'one@gmail.com',password:pass,name:'Duplicate',role:'customer'})).status,409);
 assert.equal((await call('/api/auth',{action:'register',identity:'bad@example.org',password:'short',name:'Bad',role:'customer'})).status,400);
 assert.equal((await call('/api/auth',{action:'login',identity:'one@gmail.com',password:'wrong',role:'customer'})).status,401);
 assert.equal((await call('/api/auth',{action:'login',identity:'one@gmail.com',password:pass,role:'participant'})).status,401);
 for(const action of ['forgot','verify'])assert.equal((await call('/api/auth',{action,identity:'one@gmail.com',challenge:'old-token',code:'123456'})).status,410);
 const reset={action:'resetPassword',id:one.j.user.id,password:pass+' changed'};
 assert.equal((await call('/api/admin/accounts',reset)).status,401);assert.equal((await call('/api/admin/accounts',reset,two.cookie)).status,403);
 assert.equal((await call('/api/admin/accounts',{...reset,id:'test-admin'},admin)).status,403);
 assert.equal((await call('/api/admin/accounts',reset,admin)).status,200);
 assert.equal((await call('/api/orders',undefined,one.cookie)).status,401);assert.equal((await call('/api/auth',{action:'login',identity:'one@gmail.com',password:pass,role:'customer'})).status,401);
 const signed=await call('/api/auth',{action:'login',identity:'one@gmail.com',password:pass+' changed',role:'customer'});assert.equal(signed.status,200);cookie=signed.cookie;
 assert.equal((await db.prepare("SELECT count(*) n FROM security_audit WHERE action='admin_password_reset'").first()).n,1);
 assert.equal((await db.prepare('SELECT count(*) n FROM verification_challenges').first()).n,0);
 const catalogue=(await call('/api/shop')).j;const programme=catalogue.categories[0].id;
 const prod={action:'saveProduct',name:'Test bread',description:'Test only',programme,unit:'pieces',quantity:5,price:25};assert.equal((await call('/api/shop',prod,two.cookie)).status,403);assert.equal((await call('/api/shop',prod,admin)).status,200);
 const product=(await call('/api/shop')).j.products[0];const checkout={action:'checkout',key:randomUUID(),customer:{name:'Customer One',phone:'9876543210',address:'Test delivery address'},location:{lat:20.36,lng:85.81},items:[{product:product.id,quantity:2,price:2500}]};
 assert.equal((await call('/api/shop',{...checkout,customer:{}})).status,401);
 assert.equal((await call('/api/shop',{...checkout,location:{lat:200,lng:30}},cookie)).status,400);
 const order=await call('/api/shop',checkout,cookie);assert.equal(order.status,200,JSON.stringify(order.j));assert.equal((await call('/api/shop',checkout,cookie)).j.order.id,order.j.order.id);
 assert.equal((await call('/api/orders',undefined,two.cookie)).j.orders.length,0);assert.equal((await call('/api/orders',undefined,cookie)).j.orders.length,1);
 assert.equal((await call('/api/shop',{action:'cancelOrder',id:order.j.order.id},two.cookie)).status,404);
 assert.equal((await call('/api/shop',{action:'orderLocation',id:order.j.order.id,location:{lat:20.37,lng:85.82},note:'Test hub'},admin)).status,200);
 assert.equal((await call('/api/orders',undefined,cookie)).j.orders[0].tracking.note,'Test hub');
 assert.equal((await call('/api/shop',{action:'cancelOrder',id:order.j.order.id},cookie)).status,200);assert.equal((await call('/api/shop')).j.products[0].available,5);
 assert.equal((await call('/api/shop',{action:'orderPaid',id:order.j.order.id},admin)).status,400);
 const shipped=await call('/api/shop',{...checkout,key:randomUUID()},cookie);assert.equal((await call('/api/shop',{action:'orderStatus',id:shipped.j.order.id,status:'Shipped'},admin)).status,200);assert.equal((await call('/api/shop',{action:'cancelOrder',id:shipped.j.order.id},cookie)).status,400);
 const mixed=cookie+'; '+admin.replace('kiss_session=','kiss_admin_session=');assert.equal((await call('/api/academy?mode=admin',undefined,mixed)).status,200);assert.equal((await call('/api/academy?mode=admin',undefined,learner.cookie)).status,403);
 console.log('PASS: direct Gmail/university registration, password validation, duplicates, disabled email recovery, admin-only password reset, session revocation, MFA, role isolation, order history, stock and cancellation.');
}finally{await mf.dispose()}
