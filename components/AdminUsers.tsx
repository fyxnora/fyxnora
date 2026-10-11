'use client'
import {useEffect,useState} from 'react'
import {authedFetch} from '@/lib/client'
import {Role,roles,pretty} from '@/lib/constants'

type ManagedUser={
 id:string
 full_name:string
 email:string
 phone:string|null
 role:Role
 active:boolean
 region_id:string|null
 partner_id:string|null
 created_at:string
}
type Region={id:string;name:string;state:string}
type Partner={id:string;name:string;region_id:string|null}
type UserData={users:ManagedUser[];regions:Region[];partners:Partner[]}
type UserDraft=Pick<ManagedUser,'full_name'|'phone'|'role'|'active'|'region_id'|'partner_id'>
 const blankInvite={full_name:'',email:'',role:'customer' as Role,region_id:'',partner_id:''}

export default function AdminUsers(){
 const [data,setData]=useState<UserData>({users:[],regions:[],partners:[]})
 const [drafts,setDrafts]=useState<Record<string,UserDraft>>({})
 const [invite,setInvite]=useState(blankInvite)
 const [filter,setFilter]=useState('')
 const [roleFilter,setRoleFilter]=useState<'all'|Role>('all')
 const [loading,setLoading]=useState(true)
 const [busy,setBusy]=useState('')
 const [message,setMessage]=useState('')
 const [error,setError]=useState('')

 async function load(){
  setError('')
  try{
   const result=await authedFetch('/api/admin/users',undefined,'GET') as UserData
   setData(result)
   setDrafts(Object.fromEntries(result.users.map(user=>[user.id,{
    full_name:user.full_name,phone:user.phone,role:user.role,active:user.active,region_id:user.region_id,partner_id:user.partner_id
   }])))
  }catch(cause){
   setError(cause instanceof Error?cause.message:'Unable to load users.')
  }finally{
   setLoading(false)
  }
 }
 useEffect(()=>{void load()},[])

 function updateInvite<K extends keyof typeof blankInvite>(key:K,value:(typeof blankInvite)[K]){
  setInvite(previous=>({...previous,[key]:value,...(key==='role'&&!['partner','technician'].includes(String(value))?{partner_id:''}:{}),...(key==='role'&&value!=='regional'?{region_id:''}:{})}))
  setMessage('')
  setError('')
 }
 function updateDraft<K extends keyof UserDraft>(id:string,key:K,value:UserDraft[K]){
  setDrafts(previous=>({...previous,[id]:{...previous[id],...(key==='role'&&!['partner','technician'].includes(String(value))?{partner_id:null}:{}),...(key==='role'&&value!=='regional'?{region_id:null}:{}),[key]:value}}))
  setMessage('')
  setError('')
 }
 async function sendInvite(event:React.FormEvent<HTMLFormElement>){
  event.preventDefault()
  setBusy('invite')
  setMessage('')
  setError('')
  try{
   const result=await authedFetch('/api/admin/users',{...invite,region_id:invite.region_id||null,partner_id:invite.partner_id||null}) as {message:string}
   setInvite(blankInvite)
   setMessage(result.message)
   await load()
  }catch(cause){
   setError(cause instanceof Error?cause.message:'Unable to send invitation.')
  }finally{
   setBusy('')
  }
 }
 async function saveUser(id:string){
  setBusy(id)
  setMessage('')
  setError('')
  try{
   await authedFetch('/api/admin/users',{id,...drafts[id],phone:drafts[id].phone||null},'PATCH')
   setMessage('User profile updated.')
   await load()
  }catch(cause){
   setError(cause instanceof Error?cause.message:'Unable to update user.')
  }finally{
   setBusy('')
  }
 }
 async function resetPassword(user:ManagedUser){
  if(!window.confirm(`Send a password reset link to ${user.email}? Their current password stays active until they choose a new one.`))return
  setBusy(`reset-${user.id}`);setMessage('');setError('')
  try{const result=await authedFetch('/api/admin/users',{id:user.id},'PUT') as {message:string};setMessage(result.message)}catch(cause){setError(cause instanceof Error?cause.message:'Unable to send password reset email.')}finally{setBusy('')}
 }
 const visibleUsers=data.users.filter(user=>(roleFilter==='all'||user.role===roleFilter)&&`${user.full_name} ${user.email} ${user.role}`.toLowerCase().includes(filter.toLowerCase()))

 return <section className="admin-users">
  <div className="row-between"><div><h2 style={{marginBottom:5}}>Users &amp; role access</h2><p className="muted" style={{marginTop:0}}>Invite team members and manage customer and operations profiles.</p></div><span className="badge">{data.users.length} users</span></div>
  {error&&<p className="alert" role="alert">{error}</p>}
  {message&&<p className="success" role="status">{message}</p>}
  <form className="card admin-invite" onSubmit={sendInvite}>
   <div className="eyebrow">Invite a user</div>
   <h3>Send a secure account invitation</h3>
   <p className="smalltext">Fyxnora emails an invitation so the user can set their own password. Passwords are never entered or stored here.</p>
   <div className="formgrid">
    <label className="field">Full name<input className="input" required minLength={2} maxLength={120} value={invite.full_name} onChange={event=>updateInvite('full_name',event.target.value)}/></label>
    <label className="field">Email<input className="input" required type="email" maxLength={255} value={invite.email} onChange={event=>updateInvite('email',event.target.value)}/></label>
    <label className="field">Role<select className="input" value={invite.role} onChange={event=>updateInvite('role',event.target.value as Role)}>{roles.map(role=><option key={role} value={role}>{pretty(role)}</option>)}</select></label>
    {invite.role==='regional'&&<label className="field">Region<select required className="input" value={invite.region_id} onChange={event=>updateInvite('region_id',event.target.value)}><option value="">Choose region</option>{data.regions.map(region=><option key={region.id} value={region.id}>{region.name}, {region.state}</option>)}</select></label>}
    {['partner','technician'].includes(invite.role)&&<label className="field">Verified service centre<select required className="input" value={invite.partner_id} onChange={event=>updateInvite('partner_id',event.target.value)}><option value="">Choose service centre</option>{data.partners.map(partner=><option key={partner.id} value={partner.id}>{partner.name}</option>)}</select></label>}
   </div>
   <button className="button small" disabled={busy==='invite'}>{busy==='invite'?'Sending invite...':'Send invitation →'}</button>
  </form>
  <div className="admin-user-list">
   <div className="row-between admin-user-tools"><h3>Registered users by category</h3><input aria-label="Search users" className="input admin-search" placeholder="Search name, email or role" value={filter} onChange={event=>setFilter(event.target.value)}/></div>
   <div className="role-filter" aria-label="Filter users by role"><button className={roleFilter==='all'?'active':''} onClick={()=>setRoleFilter('all')}>All ({data.users.length})</button>{roles.map(role=><button key={role} className={roleFilter===role?'active':''} onClick={()=>setRoleFilter(role)}>{pretty(role)} ({data.users.filter(user=>user.role===role).length})</button>)}</div>
   {loading?<div className="card">Loading users...</div>:visibleUsers.length===0?<div className="card empty">No matching users.</div>:<div className="admin-user-grid">{visibleUsers.map(user=>{
    const draft=drafts[user.id]
    if(!draft)return null
    return <form key={user.id} className="card admin-user-card" onSubmit={event=>{event.preventDefault();void saveUser(user.id)}}>
     <div className="row-between admin-user-header"><div><strong>{user.email}</strong><div className="smalltext">Joined {new Date(user.created_at).toLocaleDateString('en-IN')}</div></div><span className={`badge${draft.active?'':' inactive-badge'}`}>{draft.active?'Active':'Disabled'}</span></div>
     <div className="formgrid">
      <label className="field">Full name<input className="input" required minLength={2} maxLength={120} value={draft.full_name} onChange={event=>updateDraft(user.id,'full_name',event.target.value)}/></label>
      <label className="field">Phone<input className="input" maxLength={30} value={draft.phone||''} onChange={event=>updateDraft(user.id,'phone',event.target.value||null)}/></label>
      <label className="field">Role<select className="input" value={draft.role} onChange={event=>updateDraft(user.id,'role',event.target.value as Role)}>{roles.map(role=><option key={role} value={role}>{pretty(role)}</option>)}</select></label>
      {draft.role==='regional'&&<label className="field">Region<select required className="input" value={draft.region_id||''} onChange={event=>updateDraft(user.id,'region_id',event.target.value||null)}><option value="">Choose region</option>{data.regions.map(region=><option key={region.id} value={region.id}>{region.name}, {region.state}</option>)}</select></label>}
      {['partner','technician'].includes(draft.role)&&<label className="field">Verified service centre<select required className="input" value={draft.partner_id||''} onChange={event=>updateDraft(user.id,'partner_id',event.target.value||null)}><option value="">Choose service centre</option>{data.partners.map(partner=><option key={partner.id} value={partner.id}>{partner.name}</option>)}</select></label>}
     </div>
     <div className="row-between admin-user-footer"><label className="user-active-toggle"><input type="checkbox" checked={draft.active} onChange={event=>updateDraft(user.id,'active',event.target.checked)}/> Account enabled</label><div className="user-card-actions"><button type="button" className="admin-secondary" disabled={busy===`reset-${user.id}`} onClick={()=>void resetPassword(user)}>{busy===`reset-${user.id}`?'Sending...':'Send password reset email'}</button><button className="button small" disabled={busy===user.id}>{busy===user.id?'Saving...':'Save changes'}</button></div></div>
    </form>
   })}</div>}
  </div>
 </section>
}
