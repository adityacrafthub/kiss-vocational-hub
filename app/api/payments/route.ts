import {sameOrigin,requireShopper,readJson,json,failure} from '@/lib/security';
import {startPayment} from '@/lib/payments';
import {limit} from '@/lib/auth-utils';
export async function POST(r:Request){try{sameOrigin(r);const user=await requireShopper(r);await limit('payment:'+user.id,10,60000);const b=await readJson(r);return json(await startPayment(b.id,user.id))}catch(e){return failure(e)}}
