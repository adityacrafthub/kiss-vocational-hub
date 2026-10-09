import {profileInput,saveProfile} from '@/lib/customer-profile';
import {shopper} from '@/lib/shop-identity';
import {auditState} from '@/lib/audit';
import {settings} from '@/lib/security';
import {readWorkspace,updateWorkspace} from '@/lib/workspace';
import {shopCatalogue,commerceAction,placeOrder,orderReceipt,cancelOrder,confirmDelivery} from '@/lib/commerce';
import {sameOrigin,readJson,requireUser,requireShopper,json,failure,HttpError,throttle} from '@/lib/security';
export async function GET(r:Request){try{const identity=await shopper(r,true);return json({...shopCatalogue((await readWorkspace()).state),demo:settings().DEMO_MODE==='true'},200,identity.cookie?{'Set-Cookie':identity.cookie}:{})}catch(e){return failure(e)}}
export async function POST(r:Request){try{
 sameOrigin(r);if(Number(r.headers.get('content-length'))>50000)throw new HttpError('Request too large.',413);const b=await readJson(r,50000);
 if(b.action==='checkout'){const identity=await shopper(r);const profile=profileInput(b.customer);await throttle(r,'shop-checkout');const result=await updateWorkspace(s=>{const out=placeOrder(s,b,identity.id,settings().DEMO_MODE==='true');return {state:saveProfile(out.state,identity.id,profile),result:orderReceipt(out.order)}});return json({order:result.result},200,identity.cookie?{'Set-Cookie':identity.cookie}:{})}
 if(b.action==='cancelOrder'||b.action==='confirmDelivery'){const identity=await shopper(r);await updateWorkspace(s=>{const order=s.orders?.find(o=>o.id===b.id&&identity.owners.includes(o.account));if(!order)throw new HttpError('Order not found.',404);return {state:b.action==='cancelOrder'?cancelOrder(s,b.id,order.account):confirmDelivery(s,b.id,identity.owners),result:null}});return json({ok:true})}
 const admin=await requireUser(r,'admin');if(settings().DEMO_MODE==='true'&&['orderLocation','linkShipment','orderPaid'].includes(b.action))throw new HttpError('Payments and physical delivery are disabled for this demo.',400);if(b.action==='linkShipment'&&(!settings().COURIER_PROVIDER||b.provider!==settings().COURIER_PROVIDER))throw new HttpError('Use the configured courier provider.',400);await updateWorkspace(s=>({state:auditState(commerceAction(s,b.action,b),admin.id,b.action,b.id||''),result:null}));return json({ok:true});
 }catch(e){if(e instanceof HttpError)return failure(e);if(e instanceof Error&&!/D1|SQLITE|database/i.test(e.message))return json({error:e.message},400);return failure(e)}}
