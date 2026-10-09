import {validPoint,DISPATCH_LOCATION} from './locations';
import {warehouse,type State,type Row} from './hub';
const value=(v:unknown,label:string,max=160)=>{if(typeof v!=='string'||!v.trim()||v.trim().length>max)throw Error(`Enter a valid ${label}.`);return v.trim()};
const quantity=(v:unknown)=>{const n=Number(v);if(!Number.isSafeInteger(n)||n<0||n>1000000)throw Error('Enter a whole quantity between 0 and 1,000,000.');return n};
export const money=(cents:number)=>new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR'}).format(cents/100);
export function shopCatalogue(s:State){return {categories:s.programmes.filter(p=>!p.deleted).map(p=>({id:p.id,name:p.name})),products:s.products.filter(p=>!p.deleted&&p.price>0&&!s.programmes.find(c=>c.id===p.programme)?.deleted).map(p=>({id:p.id,name:p.name,description:p.description||'',programme:p.programme,unit:p.unit,price:p.price,available:Math.max(0,warehouse(s,p.id))}))}}
export function commerceAction(original:State,action:string,b:any){
 const s=structuredClone(original);s.orders??=[];s.stockAdjustments??=[];let message='';const now=new Date().toISOString();
 if(action==='saveProduct'){
  const p=b.id?s.products.find(p=>p.id===b.id):undefined;if(b.id&&!p)throw Error('Product not found.');if(p?.deleted)throw Error('This product has been deleted.');
  const programme=s.programmes.find(p=>p.id===b.programme&&!p.deleted);if(!programme)throw Error('Choose an active programme.');
  const name=value(b.name,'product name',120),unit=value(b.unit,'unit',40),description=value(b.description||name,'description',800);const price=Number(b.price);
  if(!Number.isFinite(price)||price<=0||price>1000000||Math.abs(price*100-Math.round(price*100))>.00001)throw Error('Enter a positive price with at most two decimal places.');
  if(s.products.some(x=>!x.deleted&&x.id!==p?.id&&x.programme===programme.id&&x.name.toLowerCase()===name.toLowerCase()))throw Error('This product already exists in the programme.');
  const available=quantity(b.quantity);const before=p?warehouse(s,p.id):0;
  if(p&&(Number(b.expectedStock)!==before||b.expectedUpdated!==(p.updated||'')))throw Error('This product or its stock changed. Close the editor and reopen it before saving.');
  const item={...p,id:p?.id||crypto.randomUUID(),name,description,unit,programme:programme.id,price:Math.round(price*100),threshold:p?.threshold||0,updated:now};
  if(p)s.products[s.products.indexOf(p)]=item;else s.products.push(item);
  if(available!==before)s.stockAdjustments.push({id:crypto.randomUUID(),product:item.id,quantity:available-before,before,after:available,created:now,reason:'Admin stock adjustment'});
  message=`Product ${p?'updated':'created'}: ${name}`;
 }else if(action==='deleteProduct'){
  const p=s.products.find(p=>p.id===b.id);if(!p)throw Error('Product not found.');p.deleted=now;p.updated=now;message=`Product deleted from shop: ${p.name}`;
 }else if(action==='deleteProgramme'){
  const p=s.programmes.find(p=>p.id===b.id);if(!p)throw Error('Programme not found.');p.deleted=now;p.published=false;message=`Programme deleted: ${p.name}`;
 }else if(action==='orderStatus'){
  const o=s.orders.find(o=>o.id===b.id);if(!o)throw Error('Order not found.');if(o.status==='Cancelled')throw Error('This order has been cancelled.');const statuses=['Pending','Shipped','In transit','Delivered'];if(statuses.indexOf(b.status)!==statuses.indexOf(o.status)+1)throw Error('Move the order to its next delivery stage.');o.status=b.status;o.updated=now;o.history.push({status:b.status,time:now});message=`Order ${o.reference}: ${o.status}`;
 }else if(action==='orderLocation'){
  const o=s.orders.find(o=>o.id===b.id);if(!o)throw Error('Order not found.');if(['Cancelled','Delivered'].includes(o.status))throw Error('This order is closed.');if(!validPoint(b.location))throw Error('Select a valid parcel location.');
  o.tracking={lat:b.location.lat,lng:b.location.lng,note:value(b.note||'Location updated by dispatch team','location note',240),updated:now,source:'Admin update'};o.history.push({status:o.status,time:now,note:o.tracking.note});message=`Parcel location updated: ${o.reference}`;
 }else if(action==='linkShipment'){
  const o=s.orders.find(o=>o.id===b.id);if(!o||['Cancelled','Delivered'].includes(o.status))throw Error('Order unavailable.');const id=value(b.shipmentId,'shipment ID',120),provider=value(b.provider,'courier provider',120);if(s.orders.some(x=>x.id!==o.id&&x.shipment?.id===id&&x.shipment?.provider===provider))throw Error('Shipment is already assigned.');o.shipment={id,provider};message=`Shipment linked: ${o.reference}`;
 }else if(action==='orderPaid'){
  const o=s.orders.find(o=>o.id===b.id);if(!o)throw Error('Order not found.');if(o.status==='Cancelled')throw Error('Cannot record payment for a cancelled order.');if(o.payment&&o.payment.state!=='expired')throw Error('Online payment must be verified through the provider.');o.paid=true;o.paidAt=now;message=`Payment received: ${o.reference}`;
 }else throw Error('Unknown shop action.');
 s.activity.unshift({id:crypto.randomUUID(),action,message,time:now});return s;
}
export function placeOrder(original:State,b:any,account:string,demo=false){
 const s=structuredClone(original);s.orders??=[];
 if(!account)throw Error('Please sign in to continue.');if(!demo&&!validPoint(b.location))throw Error('Select your parcel receiving location on the map.');
 const key=value(b.key,'checkout reference',80);if(!/^[a-f0-9-]{36}$/.test(key))throw Error('Invalid checkout reference. Refresh and try again.');
 const customer={name:value(b.customer?.name,'name',120),phone:value(b.customer?.phone,'phone',24),address:value(b.customer?.address,'delivery address',600)};
 if(!/^[+\d ()-]{7,24}$/.test(customer.phone))throw Error('Enter a valid phone number.');
 if(!Array.isArray(b.items)||!b.items.length||b.items.length>100)throw Error('Add between 1 and 100 products to your cart.');
 const requested=b.items.map((i:any)=>({product:value(i.product,'product'),quantity:quantity(i.quantity),price:Number(i.price)})).sort((a:any,b:any)=>a.product.localeCompare(b.product));
 if(new Set(requested.map((i:any)=>i.product)).size!==requested.length||requested.some((i:any)=>i.quantity===0||!Number.isSafeInteger(i.price)||i.price<=0))throw Error('Invalid cart quantities.');
 const fingerprint=JSON.stringify({account,customer,location:b.location,items:requested});const existing=s.orders.find(o=>o.key===key);if(existing){if(existing.fingerprint!==fingerprint)throw Error('This checkout reference has already been used.');return {state:s,order:existing}}
 const items=requested.map((i:any)=>{const p=s.products.find(p=>p.id===i.product&&!p.deleted);if(!p||!p.price||s.programmes.find(c=>c.id===p.programme)?.deleted)throw Error('An item is no longer available. Refresh your cart.');if(i.price!==p.price)throw Error(`${p.name} has a new price. Refresh your cart before ordering.`);if(warehouse(s,p.id)<i.quantity)throw Error(`Only ${Math.max(0,warehouse(s,p.id))} ${p.unit} of ${p.name} remain. Update your cart.`);return {product:p.id,name:p.name,programme:p.programme,unit:p.unit,quantity:i.quantity,price:p.price}});
 const total=items.reduce((n:number,i:any)=>n+i.price*i.quantity,0);if(!Number.isSafeInteger(total))throw Error('Order total is too large. Reduce the quantities.');
 const now=new Date().toISOString();const id=crypto.randomUUID();const order:Row={id,key,fingerprint,account,demo,location:demo?null:{lat:b.location.lat,lng:b.location.lng},dispatchLocation:DISPATCH_LOCATION,reference:'KISS-'+id.slice(0,8).toUpperCase(),customer,items,total,status:'Pending',paid:false,paymentMethod:demo?'Demo — no payment required':'Pay on delivery',created:now,history:[{status:'Pending',time:now}]};
 s.orders.unshift(order);s.activity.unshift({id:crypto.randomUUID(),action:'order',message:`Order received: ${order.reference}`,time:now});return {state:s,order};
}
export function orderReceipt(o:Row){return {id:o.id,receivedByCustomer:o.receivedByCustomer,demo:!!o.demo,reference:o.reference,items:o.items,total:o.total,status:o.status,paymentMethod:o.paymentMethod,paid:o.paid,created:o.created,location:o.location,tracking:o.courierTracking&&(!o.tracking||Date.parse(o.courierTracking.updated)>Date.parse(o.tracking.updated))?o.courierTracking:o.tracking,movement:o.movement||[],paymentState:o.payment?.state,history:o.history,customer:o.customer}}

export function cancelOrder(original:State,id:string,account:string){const s=structuredClone(original);const order=s.orders?.find(o=>o.id===id&&o.account===account);if(!order)throw Error('Order not found.');if(order.payment&&order.payment.state!=='expired')throw Error('An online payment is pending. Wait for provider confirmation or expiry before cancelling.');if(order.status!=='Pending'||order.paid)throw Error('Only unpaid orders that have not shipped can be cancelled.');order.status='Cancelled';order.history.push({status:'Cancelled',time:new Date().toISOString()});s.activity.unshift({id:crypto.randomUUID(),action:'cancelOrder',message:`Customer cancelled ${order.reference}`,time:new Date().toISOString()});return s}

export function confirmDelivery(original:State,id:string,owners:string[]){const s=structuredClone(original);const order=s.orders?.find(o=>o.id===id&&owners.includes(o.account));if(!order)throw Error('Order not found.');if(order.status==='Cancelled')throw Error('This order was cancelled.');if(!['Shipped','In transit','Delivered'].includes(order.status))throw Error('This order has not shipped yet.');if(order.receivedByCustomer)return s;const now=new Date().toISOString();order.status='Delivered';order.receivedByCustomer=now;order.updated=now;order.history.push({status:'Delivered',time:now,note:'Receipt confirmed by customer'});s.activity.unshift({id:crypto.randomUUID(),action:'confirmDelivery',message:`Customer received ${order.reference}`,time:now});return s}
