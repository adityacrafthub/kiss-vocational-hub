import {database} from './database';
import {settings,hash} from './security';

// Deployment-only configuration contains salted hashes, never plaintext passwords.
export async function ensureConfiguredAdmins(){
 const raw=settings().ADMIN_ACCOUNTS_JSON;if(!raw)return;
 const revision=await hash(raw);const db=database();
 if(await db.prepare('SELECT revision FROM account_provisioning WHERE revision=?').bind(revision).first())return;
 const accounts=JSON.parse(raw) as {id:string;email:string;name:string;password:string;salt:string}[];
 if(!Array.isArray(accounts)||!accounts.length||accounts.some(a=>!a.id||!a.name||!/^\S+@\S+\.\S+$/.test(a.email)||! /^[a-f0-9]{64}$/.test(a.password)||a.salt?.length<32))throw new Error('Invalid administrator configuration');
 const statements=accounts.flatMap(a=>[
  db.prepare('DELETE FROM mfa_challenges WHERE account IN (SELECT id FROM accounts WHERE email=?) AND NOT EXISTS(SELECT 1 FROM account_provisioning WHERE revision=?)').bind(a.email.toLowerCase(),revision),
  db.prepare('DELETE FROM sessions WHERE account IN (SELECT id FROM accounts WHERE email=?) AND NOT EXISTS(SELECT 1 FROM account_provisioning WHERE revision=?)').bind(a.email.toLowerCase(),revision),
  db.prepare("INSERT INTO accounts(id,email,name,password,salt,role,created) SELECT ?,?,?,?,?,'admin',? WHERE NOT EXISTS(SELECT 1 FROM account_provisioning WHERE revision=?) ON CONFLICT(email) DO UPDATE SET password=excluded.password,salt=excluded.salt,role='admin'").bind(a.id,a.email.toLowerCase(),a.name,a.password,a.salt,new Date().toISOString(),revision)
 ]);
 statements.push(db.prepare('INSERT OR IGNORE INTO account_provisioning(revision) VALUES (?)').bind(revision));
 await db.batch(statements);
}
