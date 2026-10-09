import {shopper} from '@/lib/shop-identity';
import {paymentsReady} from '@/lib/payments';
import {readWorkspace} from '@/lib/workspace';
import {json,failure} from '@/lib/security';
import {orderReceipt} from '@/lib/commerce';
export async function GET(r:Request){try{const identity=await shopper(r);const {state}=await readWorkspace();return json({user:identity.user,paymentsEnabled:paymentsReady(),orders:(state.orders||[]).filter(o=>identity.owners.includes(o.account)).map(orderReceipt)})}catch(e){return failure(e)}}
