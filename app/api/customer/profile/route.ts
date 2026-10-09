import {requireShopper,sameOrigin,readJson,json,failure,HttpError} from '@/lib/security';
import {readWorkspace,updateWorkspace} from '@/lib/workspace';
import {profileFor,profileInput,saveProfile} from '@/lib/customer-profile';
export async function GET(r:Request){try{const user=await requireShopper(r);return json({user,profile:profileFor((await readWorkspace()).state,user)})}catch(e){return failure(e)}}
export async function POST(r:Request){try{sameOrigin(r);const user=await requireShopper(r);const profile=profileInput(await readJson(r));const out=await updateWorkspace(s=>({state:saveProfile(s,user.id,profile),result:null}));return json({profile:profileFor(out.state,user)})}catch(e){if(e instanceof HttpError)return failure(e);if(e instanceof Error&&!/D1|SQLITE|database/i.test(e.message))return json({error:e.message},400);return failure(e)}}
