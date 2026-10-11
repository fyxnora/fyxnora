'use client'

import {useEffect,useState} from 'react'
import {useRouter} from 'next/navigation'
import Link from 'next/link'
import {authedFetch,supabase} from '@/lib/client'
import {Role,sections} from '@/lib/constants'

type AuthStage='details'|'otp'|'recovery-email'|'recovery-otp'|'new-password'

function requestedDestination(){
 if(typeof window==='undefined')return null
 const next=new URLSearchParams(window.location.search).get('next')
 return next?.startsWith('/')&&!next.startsWith('//')?next:null
}

export default function Auth({register=false}:{register?:boolean}){
 const [name,setName]=useState('')
 const [email,setEmail]=useState('')
 const [password,setPassword]=useState('')
 const [confirmPassword,setConfirmPassword]=useState('')
 const [otp,setOtp]=useState('')
 const [stage,setStage]=useState<AuthStage>('details')
 const [busy,setBusy]=useState(false)
 const [msg,setMsg]=useState('')
 const [success,setSuccess]=useState(false)
 const [resendAt,setResendAt]=useState(0)
 const [now,setNow]=useState(Date.now())
 const [adminLogin,setAdminLogin]=useState(false)
 const [nextDestination,setNextDestination]=useState<string|null>(null)
 const router=useRouter()
 const resendSeconds=Math.max(0,Math.ceil((resendAt-now)/1000))
 const codeStage=stage==='otp'||stage==='recovery-otp'

 useEffect(()=>{
  if(!codeStage||resendSeconds===0)return
  const timer=window.setInterval(()=>setNow(Date.now()),1000)
  return ()=>window.clearInterval(timer)
 },[codeStage,resendSeconds])

 useEffect(()=>{
  const destination=requestedDestination()
  setNextDestination(destination)
  setAdminLogin(destination==='/admin')
 },[])

 async function registerRequest(action:'request_otp'|'verify_otp'){
  const response=await fetch('/api/auth/register',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action,full_name:name,email,password,...(action==='verify_otp'?{otp}:{})})})
  const result=await response.json()
  if(!response.ok)throw Error(result.error||'Unable to complete email verification')
  return result as {message:string;welcomeEmailSent?:boolean}
 }

 async function requestCode(resend=false){
  setBusy(true)
  setMsg('')
  setSuccess(false)
  try{
   const result=await registerRequest('request_otp')
   setStage('otp')
   setOtp('')
   setResendAt(Date.now()+60_000)
   setNow(Date.now())
   setMsg(resend?'A new verification code was sent.':result.message)
   setSuccess(true)
  }catch(error){
   setMsg(error instanceof Error?error.message:'Unable to send the verification code')
  }finally{
   setBusy(false)
  }
 }

 async function requestRecoveryCode(resend=false){
  setBusy(true)
  setMsg('')
  setSuccess(false)
  try{
   const normalizedEmail=email.trim().toLowerCase()
   const response=await fetch('/api/auth/recovery',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:normalizedEmail})})
   const result=await response.json() as {message?:string;error?:string}
   if(!response.ok)throw Error(result.error||'Unable to request a password reset code.')
   setEmail(normalizedEmail)
   setStage('recovery-otp')
   setOtp('')
   setResendAt(Date.now()+60_000)
   setNow(Date.now())
   setMsg(resend?'If an account is registered with this email, a new code has been sent.':result.message||'If an account is registered with this email, a recovery code has been sent.')
   setSuccess(true)
  }catch(error){
   setMsg(error instanceof Error?error.message:'Unable to send the recovery code.')
  }finally{
   setBusy(false)
  }
 }

 async function submit(event:React.FormEvent){
  event.preventDefault()
  if(register&&stage==='details'){
   await requestCode()
   return
  }
  if(!register&&stage==='recovery-email'){
   await requestRecoveryCode()
   return
  }
  if(!register&&stage==='new-password'&&password!==confirmPassword){
   setMsg('Passwords do not match.')
   setSuccess(false)
   return
  }
  setBusy(true)
  setMsg('')
  setSuccess(false)
  try{
   if(register){
    const result=await registerRequest('verify_otp')
    const signed=await supabase().auth.signInWithPassword({email,password})
    if(signed.error)throw signed.error
    const destination=requestedDestination()||'/dashboard'
    if(result.welcomeEmailSent===false)console.error('Account created, but the welcome email was not delivered.')
    router.replace(destination)
    router.refresh()
    return
   }
   if(stage==='recovery-otp'){
    const verification=await supabase().auth.verifyOtp({email,token:otp,type:'recovery'})
    if(verification.error)throw verification.error
    setPassword('')
    setConfirmPassword('')
    setStage('new-password')
    setMsg('Email verified. Choose a new password for your account.')
    setSuccess(true)
    return
   }
   if(stage==='new-password'){
    const {error:passwordError}=await supabase().auth.updateUser({password})
    if(passwordError)throw passwordError
    const data=await authedFetch('/api/bookings',undefined,'GET') as {profile:{role:Role}}
    if(requestedDestination()==='/admin'&&data.profile.role!=='admin'){
     await supabase().auth.signOut()
     throw Error('This sign-in is restricted to administrator accounts.')
    }
    const destination=requestedDestination()||sections.find(section=>section.role===data.profile.role)?.href||'/dashboard'
    router.replace(destination)
    router.refresh()
    return
   }
   const signed=await supabase().auth.signInWithPassword({email,password})
   if(signed.error)throw signed.error
   const data=await authedFetch('/api/bookings',undefined,'GET') as {profile:{role:Role}}
   if(requestedDestination()==='/admin'&&data.profile.role!=='admin'){
    await supabase().auth.signOut()
    throw Error('This sign-in is restricted to administrator accounts.')
   }
   const destination=requestedDestination()||sections.find(section=>section.role===data.profile.role)?.href||'/dashboard'
   router.replace(destination)
   router.refresh()
  }catch(error){
   setMsg(error instanceof Error?error.message:'Unable to continue')
  }finally{
   setBusy(false)
  }
 }

 const next=nextDestination
 const loginHref=next?`/login?next=${encodeURIComponent(next)}`:'/login'
 const registerHref=next?`/register?next=${encodeURIComponent(next)}`:'/register'

 return <div className="auth-wrap"><form onSubmit={submit} className="card auth-card">
  <div className="eyebrow">{adminLogin?'Administrator access':'Fyxnora account'}</div>
  <h1 style={{fontSize:29,marginBottom:7}}>{register?(stage==='otp'?'Verify your email':'Create your account'):stage==='recovery-email'?'Reset your password':stage==='recovery-otp'?'Verify your email':stage==='new-password'?'Choose a new password':adminLogin?'Admin sign in':'Welcome back'}</h1>
  <p className="muted" style={{marginBottom:25}}>{register?(stage==='otp'?`Enter the 6-digit code sent to ${email}. The code expires in 10 minutes.`:'Book and follow your repair from anywhere.'):stage==='recovery-email'?'Enter the email address associated with your Fyxnora account.':stage==='recovery-otp'?`Enter the recovery code sent to ${email}.`:stage==='new-password'?'Your email is verified. Set a new password to finish resetting your account.':adminLogin?'Sign in with an administrator account to continue to the admin workspace.':'Sign in to manage service requests and work orders.'}</p>
  {register&&stage==='details'&&<label className="field">Full name<input className="input" autoComplete="name" required value={name} onChange={event=>setName(event.target.value)}/></label>}
  {(stage==='details'||stage==='recovery-email')&&<>
   <label className="field">Email address<input className="input" type="email" autoComplete="email" required value={email} onChange={event=>setEmail(event.target.value)}/></label>
   {stage==='details'&&<>
   <label className="field">Password<input className="input" type="password" minLength={8} autoComplete={register?'new-password':'current-password'} required value={password} onChange={event=>setPassword(event.target.value)}/></label>
   </>}
  </>}
  {codeStage&&<label className="field">Verification code<input className="input otp-input" inputMode="numeric" pattern="[0-9]{6}" maxLength={6} autoFocus required value={otp} onChange={event=>setOtp(event.target.value.replace(/\D/g,''))}/></label>}
  {!register&&stage==='new-password'&&<>
   <label className="field">New password<input className="input" type="password" minLength={8} autoComplete="new-password" required value={password} onChange={event=>setPassword(event.target.value)}/></label>
   <label className="field">Confirm new password<input className="input" type="password" minLength={8} autoComplete="new-password" required value={confirmPassword} onChange={event=>setConfirmPassword(event.target.value)}/></label>
  </>}
  {msg&&<p className={success?'success':'alert'} role={success?'status':'alert'}>{msg}</p>}
  <button disabled={busy} className="button" style={{width:'100%'}}>{busy?'Please wait...':register?(stage==='otp'?'Verify and create account':'Send verification code'):stage==='recovery-email'?'Send recovery code':stage==='recovery-otp'?'Verify code':stage==='new-password'?'Save new password':adminLogin?'Admin sign in':'Sign in'}</button>
  {!register&&stage==='details'&&<p style={{fontSize:13,textAlign:'right',margin:'14px 0 0'}}><button type="button" className="text-button" onClick={()=>{setStage('recovery-email');setPassword('');setMsg('');setSuccess(false)}}>Forgot password?</button></p>}
  {register&&stage==='otp'&&<div className="otp-actions">
   <button type="button" className="text-button" onClick={()=>{setStage('details');setOtp('');setMsg('')}}>Change email or password</button>
   <button type="button" className="text-button" disabled={busy||resendSeconds>0} onClick={()=>void requestCode(true)}>{resendSeconds>0?`Resend code in ${resendSeconds}s`:'Resend verification code'}</button>
  </div>}
  {!register&&(stage==='recovery-otp'||stage==='recovery-email')&&<div className="otp-actions">
   <button type="button" className="text-button" onClick={()=>{setStage(stage==='recovery-otp'?'recovery-email':'details');setOtp('');setMsg('');setSuccess(false)}}>{stage==='recovery-otp'?'Change email':'Back to sign in'}</button>
   {stage==='recovery-otp'&&<button type="button" className="text-button" disabled={busy||resendSeconds>0} onClick={()=>void requestRecoveryCode(true)}>{resendSeconds>0?`Resend code in ${resendSeconds}s`:'Resend recovery code'}</button>}
  </div>}
  {!adminLogin&&stage!=='recovery-otp'&&stage!=='new-password'&&<p style={{fontSize:13,textAlign:'center',marginTop:20}}>{register?'Already registered?':stage==='recovery-email'?'Remember your password?':'New to Fyxnora?'} <Link style={{color:'#007aee',fontWeight:700}} href={register?loginHref:stage==='recovery-email'?loginHref:registerHref}>{register?'Sign in':stage==='recovery-email'?'Sign in':'Create an account'}</Link></p>}
 </form></div>
}
