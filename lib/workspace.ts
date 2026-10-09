import {database} from './database';
import {emptyState,type State} from './hub';
import {normalise} from './academy';
import {HttpError} from './security';
export async function readWorkspace(){const db=database();let row=await db.prepare('SELECT revision,data FROM workspace WHERE id=1').first<{revision:number;data:string}>();if(!row){await db.prepare('INSERT OR IGNORE INTO workspace (id,revision,data) VALUES (1,0,?)').bind(JSON.stringify(emptyState())).run();row=(await db.prepare('SELECT revision,data FROM workspace WHERE id=1').first<{revision:number;data:string}>())!}return {revision:row.revision,state:normalise(JSON.parse(row.data))}}
export async function updateWorkspace<T>(fn:(s:State)=>{state:State;result:T}){for(let i=0;i<3;i++){const row=await readWorkspace();const {state,result}=fn(row.state);const r=await database().prepare('UPDATE workspace SET data=?,revision=revision+1 WHERE id=1 AND revision=?').bind(JSON.stringify(state),row.revision).run();if(r.meta.changes)return {state,result,revision:row.revision+1}}throw new HttpError('Records changed. Please try again.',409)}
