import {currentUser,HttpError} from './security';
export async function shopper(r:Request,allowAnonymous=false){const user=await currentUser(r,'customer')||await currentUser(r,'participant');if(!user&&!allowAnonymous)throw new HttpError('Please log in to your customer account to continue.',401);return {user,id:user?.id||'',owners:user?[user.id]:[],cookie:undefined as string|undefined}}
