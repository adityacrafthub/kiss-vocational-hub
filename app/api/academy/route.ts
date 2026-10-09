import {productionFor,productionAction} from '@/lib/production';
import {auditState} from '@/lib/audit';
import {database} from '@/lib/database';
import {settings,readJson,currentUser,requireUser,sameOrigin,json,failure,HttpError} from '@/lib/security';
import {readWorkspace,updateWorkspace} from '@/lib/workspace';
import {learnerAction,learnerRecord,publicProgramme,saveProgramme,type Lesson} from '@/lib/academy';
export async function GET(r:Request){try{const mode=new URL(r.url).searchParams.get('mode');if(mode==='admin'){
 const user=await requireUser(r,'admin');const [{state},accounts,uploads]=await Promise.all([readWorkspace(),database().prepare('SELECT id,email,name,role,created FROM accounts ORDER BY created DESC').all(),database().prepare('SELECT id,name,type,size,owner,created FROM media ORDER BY created DESC').all()]);return json({user,state,accounts:accounts.results,uploads:uploads.results,demo:settings().DEMO_MODE==='true'});
 }const [{state},user]=await Promise.all([readWorkspace(),currentUser(r,mode==='participant'?'participant':undefined)]);return json({user,production:user?productionFor(state,user.id):[],programmes:state.programmes.filter(p=>!p.deleted).map(publicProgramme),person:user?learnerRecord(state,user.id)||null:null})}catch(e){return failure(e)}}
export async function POST(r:Request){try{sameOrigin(r);const b=await readJson(r,100000) as Record<string,any>;const user=await requireUser(r,b.action==='saveProgramme'?'admin':'participant');
 if(b.action==='saveProgramme'){if(user.role!=='admin')throw new HttpError('Only administrators can edit programmes.',403);for(const lesson of (b.programme?.lessons||[]) as Lesson[]){if(lesson.kind==='upload'&&!await database().prepare('SELECT id FROM media WHERE id=?').bind(lesson.source).first())throw new HttpError('An uploaded video could not be found. Upload it again.')}const result=await updateWorkspace(s=>({state:auditState(saveProgramme(s,b.programme),user.id,'saveProgramme',b.programme?.id||''),result:null}));return json({state:result.state})}
 if(user.role!=='participant')throw new HttpError('This action is for participants only.',403);
 if(['acceptWork','rejectWork','completeWork'].includes(b.action)){const out=await updateWorkspace(s=>({state:productionAction(s,user.id,b.action,b.id),result:null}));return json({person:learnerRecord(out.state,user.id),production:productionFor(out.state,user.id)})}
 const result=await updateWorkspace(s=>{const out=learnerAction(s,user,b.action,b);return {state:out.state,result:out.celebrate}});return json({person:learnerRecord(result.state,user.id),celebrate:result.result});
 }catch(e){if(e instanceof HttpError)return failure(e);if(e instanceof Error&&!/D1|SQLITE|database/i.test(e.message))return json({error:e.message},400);return failure(e)}}
