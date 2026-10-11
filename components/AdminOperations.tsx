'use client'
import {useEffect,useState} from 'react'
import {authedFetch} from '@/lib/client'

type Provider='gmail'|'zoho'|'custom'
type Smtp={provider:Provider;host:string;port:string;secure:boolean;username:string;password:string;from_name:string;from_email:string;reply_to:string;internal_recipients:string;cc_recipients:string;test_email:string;password_configured?:boolean;updated_at?:string}
const defaults:Smtp={provider:'gmail',host:'smtp.gmail.com',port:'587',secure:false,username:'',password:'',from_name:'Fyxnora',from_email:'',reply_to:'',internal_recipients:'',cc_recipients:'',test_email:''}
const presets:Record<Exclude<Provider,'custom'>,{host:string;port:string;secure:boolean}>={gmail:{host:'smtp.gmail.com',port:'587',secure:false},zoho:{host:'smtp.zoho.in',port:'465',secure:true}}

export default function AdminOperations(){
 const [smtp,setSmtp]=useState<Smtp>(defaults)
 const [loading,setLoading]=useState(true)
 const [busy,setBusy]=useState(false)
 const [message,setMessage]=useState('')
 const [error,setError]=useState('')

 useEffect(()=>{
  authedFetch('/api/admin/settings',undefined,'GET')
   .then(data=>setSmtp(current=>({...current,...data,provider:data.provider||'custom',port:String(data.port||587),password:''})))
   .catch(cause=>setError(cause instanceof Error?cause.message:'Unable to load SMTP settings.'))
   .finally(()=>setLoading(false))
 },[])

 function chooseProvider(provider:Provider){
  setSmtp(current=>({...current,provider,...(provider==='custom'?{}:presets[provider])}))
 }
 async function save(event:React.FormEvent<HTMLFormElement>){
  event.preventDefault()
  setBusy(true)
  setMessage('')
  setError('')
  try{
   const result=await authedFetch('/api/admin/settings',{...smtp,port:Number(smtp.port)})
   setMessage(result.message)
   setSmtp(current=>({...current,password:'',password_configured:true}))
  }catch(cause){
   setError(cause instanceof Error?cause.message:'Unable to save SMTP settings.')
  }finally{
   setBusy(false)
  }
 }
 async function test(){
  setBusy(true)
  setMessage('')
  setError('')
  try{
   const result=await authedFetch('/api/admin/settings',{test_email:smtp.test_email},'PUT')
   setMessage(result.message)
  }catch(cause){
   setError(cause instanceof Error?cause.message:'SMTP email test failed.')
  }finally{
   setBusy(false)
  }
 }

 return <section className="admin-module">
  <div className="module-heading">
   <div><h2>Integrations / Email SMTP</h2><p>Send verification OTPs, welcome messages, customer milestones and internal request alerts.</p></div>
   <div className="smtp-heading-actions"><a className="admin-secondary workflow-download" href="/api/role-workflow">Download role workflow PDF</a><span className={`integration-status ${smtp.password_configured?'connected':''}`}><i/>{smtp.password_configured?'Configured':'Not configured'}</span></div>
  </div>
  {error&&<p className="alert" role="alert">{error}</p>}
  {message&&<p className="success" role="status">{message}</p>}
  <form className="admin-panel settings-panel" onSubmit={save}>
   <div className="panel-title"><span>✉</span><div><h3>Email delivery provider</h3><p>Choose a preset or enter any compatible SMTP server. Use an app password where your provider requires it.</p></div></div>
   {loading?<p>Loading settings...</p>:<>
    <div className="provider-options">{(['gmail','zoho','custom'] as Provider[]).map(provider=><button type="button" className={smtp.provider===provider?'active':''} key={provider} onClick={()=>chooseProvider(provider)}>{provider==='gmail'?'Gmail':provider==='zoho'?'Zoho Mail':'Other / Custom'}</button>)}</div>
    <div className="formgrid">
     <label className="field">SMTP host<input required className="input" value={smtp.host} onChange={event=>setSmtp(current=>({...current,host:event.target.value}))}/></label>
     <label className="field">Port<input required min="1" max="65535" type="number" className="input" value={smtp.port} onChange={event=>setSmtp(current=>({...current,port:event.target.value}))}/></label>
     <label className="field">Username<input required className="input" autoComplete="username" value={smtp.username} onChange={event=>setSmtp(current=>({...current,username:event.target.value}))}/></label>
     <label className="field">App password / SMTP password<input required={!smtp.password_configured} type="password" autoComplete="new-password" className="input" placeholder={smtp.password_configured?'Saved - enter only to replace':'Enter SMTP credential'} value={smtp.password} onChange={event=>setSmtp(current=>({...current,password:event.target.value}))}/></label>
     <label className="field">Sender name<input required className="input" value={smtp.from_name} onChange={event=>setSmtp(current=>({...current,from_name:event.target.value}))}/></label>
     <label className="field">Sender email<input required type="email" className="input" value={smtp.from_email} onChange={event=>setSmtp(current=>({...current,from_email:event.target.value}))}/></label>
     <label className="field">Reply-to email<input type="email" className="input" value={smtp.reply_to} onChange={event=>setSmtp(current=>({...current,reply_to:event.target.value}))}/></label>
     <label className="field">Test recipient<input required type="email" className="input" value={smtp.test_email} onChange={event=>setSmtp(current=>({...current,test_email:event.target.value}))}/></label>
    </div>
    <label className="field">Internal notification recipients
     <input className="input" placeholder="operations@example.com, support@example.com" value={smtp.internal_recipients} onChange={event=>setSmtp(current=>({...current,internal_recipients:event.target.value}))}/>
     <small className="smalltext">New customer accounts, repair requests, status updates and business enquiries are sent to these addresses.</small>
    </label>
    <label className="field smtp-cc">CC recipients
     <input className="input" placeholder="founder@example.com, audit@example.com" value={smtp.cc_recipients} onChange={event=>setSmtp(current=>({...current,cc_recipients:event.target.value}))}/>
     <small className="smalltext">Comma-separated CC addresses are copied on automated messages. Security codes and password links are never copied.</small>
    </label>
    <label className="switch-line"><input type="checkbox" checked={smtp.secure} onChange={event=>setSmtp(current=>({...current,secure:event.target.checked}))}/> Use implicit TLS (normally port 465)</label>
    <div className="settings-actions">
     <button className="admin-primary" disabled={busy}>{busy?'Working...':'Save email integration'}</button>
     <button type="button" className="admin-secondary" disabled={busy||!smtp.password_configured} onClick={test}>Send test email</button>
     {smtp.updated_at&&<span>Last updated {new Date(smtp.updated_at).toLocaleString('en-IN')}</span>}
    </div>
   </>}
  </form>
 </section>
}
