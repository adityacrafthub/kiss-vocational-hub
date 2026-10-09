import {database} from './database';
export async function audit(actor:string,action:string,target=''){await database().prepare('INSERT INTO security_audit(id,actor,action,target,created) VALUES (?,?,?,?,?)').bind(crypto.randomUUID(),actor,action,target,new Date().toISOString()).run()}
// Business audits commit together with the versioned state, never after a separate write.
export function auditState(s:any,actor:string,action:string,target=''){s.activity.unshift({id:crypto.randomUUID(),actor,action,message:action,target,time:new Date().toISOString()});return s}
