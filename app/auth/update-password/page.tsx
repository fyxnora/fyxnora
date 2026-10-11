'use client'
import {useEffect,useState} from 'react'
import Link from 'next/link'
import {useRouter} from 'next/navigation'
import {authedFetch,supabase} from '@/lib/client'
import {Role,sections} from '@/lib/constants'

export default function UpdatePasswordPage(){
 const [ready,setReady]=useState(false)
 const [password,setPassword]=useState('')
 const [confirm,setConfirm]=useState('')
 const [busy,setBusy]=useState(false)
 const [message,setMessage]=useState('')
 const [error,setError]=useState('')
 const router=useRouter()

 useEffect(()=>{
  supabase().auth.getSession().then(({data,error:sessionError})=>{
   if(sessionError)setError(sessionError.message)
   else if(!data.session)setError('This password link is invalid or expired. Ask an administrator for a new link.')
   setReady(true)
  }).catch(cause=>{
   setError(cause instanceof Error?cause.message:'Unable to verify the password link.')
   setReady(true)
  })
 },[])

 async function submit(event:React.FormEvent<HTMLFormElement>){
  event.preventDefault()
  if(password!==confirm){setError('Passwords do not match.');return}
  setBusy(true)
  setError('')
  setMessage('')
  try{
   const {error:passwordError}=await supabase().auth.updateUser({password})
   if(passwordError)throw passwordError
   setMessage('Password updated. Opening your Fyxnora account...')
   const data=await authedFetch('/api/bookings',undefined,'GET') as {profile:{role:Role}}
   router.replace(sections.find(section=>section.role===data.profile.role)?.href||'/dashboard')
   router.refresh()
  }catch(cause){
   setError(cause instanceof Error?cause.message:'Unable to update the password.')
  }finally{
   setBusy(false)
  }
 }

 return <main className="auth-wrap"><form onSubmit={submit} className="card auth-card">
  <div className="eyebrow">Secure account access</div>
  <h1 style={{fontSize:29,marginBottom:7}}>Set your password</h1>
  <p className="muted" style={{marginBottom:25}}>Choose a password to activate your Fyxnora account.</p>
  {!ready?<p className="muted">Checking your secure link...</p>:<>
   {error&&<p className="alert" role="alert">{error}</p>}
   {message&&<p className="success" role="status">{message}</p>}
   {!error&&<><label className="field">New password<input className="input" type="password" minLength={8} autoComplete="new-password" required value={password} onChange={event=>setPassword(event.target.value)}/></label><label className="field">Confirm password<input className="input" type="password" minLength={8} autoComplete="new-password" required value={confirm} onChange={event=>setConfirm(event.target.value)}/></label><button disabled={busy} className="button" style={{width:'100%'}}>{busy?'Updating...':'Save password'}</button></>}
  </>}
  {error&&<p style={{fontSize:13,textAlign:'center',marginTop:20}}><Link style={{color:'#007aee',fontWeight:700}} href="/login">Return to sign in</Link></p>}
 </form></main>
}
