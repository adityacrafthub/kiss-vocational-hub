import {requireUser,json,failure,settings} from '@/lib/security';
import {database} from '@/lib/database';
export async function GET(r:Request){try{await requireUser(r,'admin');return json({demo:settings().DEMO_MODE==='true',authentication:'password',adminMfa:true,audit:(await database().prepare('SELECT actor,action,target,created FROM security_audit ORDER BY created DESC LIMIT 100').all()).results})}catch(e){return failure(e)}}
