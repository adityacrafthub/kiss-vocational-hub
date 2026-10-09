'use client';
import {useEffect,useState} from 'react';
import {ArrowRight,GraduationCap,Eye,EyeOff} from 'lucide-react';
import {Tabs,TabsList,TabsTrigger} from '@/components/ui/tabs';
import {Header,Footer,api,Notice} from '@/components/academy/shared';
export default function Login(){
 const [mfa,setMfa]=useState<any>(null),[recoveryCodes,setRecoveryCodes]=useState<string[]>([]);
 const [role,setRole]=useState('participant'),[mode,setMode]=useState('login'),[name,setName]=useState(''),[identity,setIdentity]=useState(''),[password,setPassword]=useState(''),[show,setShow]=useState(false),[error,setError]=useState(''),[busy,setBusy]=useState(false),[code,setCode]=useState('');
 useEffect(()=>{const r=new URLSearchParams(location.search).get('role');if(r==='customer'){location.replace('/customer?login=1');return}setRole(r==='admin'?r:'participant')},[]);
 function changeMode(m:string){setMfa(null);setMode(m);setCode('');setError('');setPassword('')}
 async function submit(e:React.FormEvent){e.preventDefault();setBusy(true);setError('');try{
  const j=await api('/api/auth',mfa?{action:'mfa',challenge:mfa.challenge,code}:{action:mode,identity,name,password,role});
  if(j.mfaRequired){setMfa(j);setPassword('');setCode('');return}
  if(j.recoveryCodes){setRecoveryCodes(j.recoveryCodes);setMfa(null);return}
  location.href=role==='customer'?'/customer':j.user.role==='admin'?'/admin':'/learn';
 }catch(e){setError((e as Error).message)}finally{setBusy(false)}}
 if(recoveryCodes.length)return <><Header/><main className="login-card mx-auto my-12"><h1>Save your recovery codes</h1><p>Store these offline in a secure place. Each code works once if you lose your authenticator. They will not be displayed again.</p><pre className="p-4 whitespace-pre-wrap">{recoveryCodes.join('\n')}</pre><a className="primary" href="/admin">I have saved my codes — continue</a></main><Footer/></>;
 if(mfa)return <><Header/><main className="login-card mx-auto my-12"><h1>{mfa.enrollment?'Set up admin two-factor authentication':'Verify administrator sign-in'}</h1>{mfa.enrollment?<><p>Add a time-based account in your authenticator app. Enter this setup key manually; use six digits and a 30-second interval. Keep the key private.</p><code className="block break-all p-4">{mfa.secret}</code></>:<p>Enter your authenticator code or a single-use recovery code.</p>}<form onSubmit={submit}><label className="field">{mfa.enrollment?'Authenticator code':'Authenticator or recovery code'}<input autoComplete="one-time-code" required maxLength={32} value={code} onChange={e=>setCode(e.target.value)}/></label>{error&&<Notice>{error}</Notice>}<button className="primary" disabled={busy}>{busy?'Verifying…':'Verify & continue'}</button></form><button className="back-link" onClick={()=>changeMode('login')}>Back to login</button></main><Footer/></>;
 return <><Header/><main className="login-layout"><aside><span className="eyebrow">KISS VOCATIONAL HUB</span><h1>Your own account.<br/><em>Your next step.</em></h1><p>Learn, explore products and manage your orders in one place.</p><GraduationCap size={65} strokeWidth={.8}/><small>Create an account and start right away.</small></aside><section className="login-card"><span className="eyebrow">WELCOME TO YOUR WORKSPACE</span><h2>{mode==='forgot'?'Need a new password?':mode==='register'?'Create your account':'Good to see you.'}</h2><Tabs value={role} onValueChange={v=>{setRole(v);changeMode('login')}}><TabsList className="w-full"><TabsTrigger value="participant" className="flex-1">Participant</TabsTrigger><TabsTrigger value="admin" className="flex-1">Admin</TabsTrigger></TabsList></Tabs>
 {mode==='forgot'?<><p className="note">{role==='admin'?'Ask the site owner to restore your administrator password. If you lost your authenticator, use one of your saved recovery codes.':'Contact an administrator with your account email. They can set a new password from Admin → Settings. No email or SMS code is needed.'}</p><button className="back-link" onClick={()=>changeMode('login')}>Back to login</button></>:<><form onSubmit={submit}>
 {mode==='register'&&<label className="field">Full name<input required maxLength={100} autoComplete="name" value={name} onChange={e=>setName(e.target.value)}/></label>}
 <label className="field">Email address<input required type="email" maxLength={254} autoComplete="username" placeholder="Gmail or university email" value={identity} onChange={e=>setIdentity(e.target.value)}/></label>
 <label className="field">Password<div className="password-field"><input required type={show?'text':'password'} minLength={mode==='login'?1:12} maxLength={128} autoComplete={mode==='login'?'current-password':'new-password'} value={password} onChange={e=>setPassword(e.target.value)}/><button type="button" onClick={()=>setShow(!show)} aria-label={show?'Hide password':'Show password'}>{show?<EyeOff size={16}/>:<Eye size={16}/>}</button></div></label>
 {mode==='login'&&<button className="forgot-link" type="button" onClick={()=>changeMode('forgot')}>Forgot password?</button>}
 {mode==='register'&&<small>Use a password or passphrase of at least 12 characters.</small>}{error&&<Notice>{error}</Notice>}
 <button className="primary justify-center" disabled={busy}>{busy?'Please wait…':mode==='register'?'Create account':'Log in'}<ArrowRight size={16}/></button></form>
 {role!=='admin'&&mode==='login'&&<p className="login-switch">New here? <button onClick={()=>changeMode('register')}>Create your account</button></p>}
 {mode==='register'&&<button className="back-link" onClick={()=>changeMode('login')}>Back to login</button>}</>}
 {role==='admin'&&<p className="note">Use your assigned administrator account.</p>}<a href="/" className="back-link">← Back to programmes</a></section></main><Footer/></>
}
