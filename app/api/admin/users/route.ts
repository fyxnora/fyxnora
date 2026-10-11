import {NextRequest,NextResponse} from 'next/server'
import {z} from 'zod'
import {adminClient,publicClient} from '@/lib/supabase'
import {roles} from '@/lib/constants'
import {emailShell,escapeHtml,sendConfiguredEmail} from '@/lib/mailer'

export const dynamic='force-dynamic'

const userFields=z.object({
 full_name:z.string().trim().min(2).max(120),
 email:z.string().trim().email().max(255),
 role:z.enum(roles),
 region_id:z.string().uuid().nullable().optional(),
 partner_id:z.string().uuid().nullable().optional()
})
const updateFields=userFields.omit({email:true}).extend({
 id:z.string().uuid(),
 phone:z.string().trim().max(30).nullable(),
 active:z.boolean()
})

async function getAdmin(req:NextRequest){
 const token=req.headers.get('authorization')?.replace(/^Bearer\s+/i,'')
 if(!token)return {error:NextResponse.json({error:'Please log in again'},{status:401})}
 const {data:{user},error}=await publicClient().auth.getUser(token)
 if(error||!user)return {error:NextResponse.json({error:'Please log in again'},{status:401})}
 const db=adminClient()
 const {data:profile,error:profileError}=await db.from('profiles').select('id,role,active').eq('id',user.id).single()
 if(profileError||!profile)return {error:NextResponse.json({error:'No profile found'},{status:403})}
 if(!profile.active)return {error:NextResponse.json({error:'This account is disabled. Contact an administrator.'},{status:403})}
 if(profile.role!=='admin')return {error:NextResponse.json({error:'Administrator access required'},{status:403})}
 return {db,user}
}

async function validateRoleLinks(db:ReturnType<typeof adminClient>,role:string,regionId:string|null|undefined,partnerId:string|null|undefined){
 if(role==='regional'&&!regionId)return 'Select a region for regional users.'
 if(regionId){
  const {data,error}=await db.from('regions').select('id').eq('id',regionId).single()
  if(error||!data)return 'Selected region was not found.'
 }
 if(role==='partner'||role==='technician'){
  if(!partnerId)return 'Select a verified service centre for partner users.'
  const {data,error}=await db.from('partners').select('id').eq('id',partnerId).eq('verification_status','verified').single()
  if(error||!data)return 'Selected service centre is not verified.'
 }else if(partnerId){
  return 'Only partner and technician users can be linked to a service centre.'
 }
 return null
}

export async function GET(req:NextRequest){
 try{
  const auth=await getAdmin(req)
  if('error'in auth)return auth.error
  const [usersResult,regionsResult,partnersResult]=await Promise.all([
   auth.db.from('profiles').select('id,full_name,email,phone,role,active,region_id,partner_id,created_at').order('created_at',{ascending:false}).limit(1000),
   auth.db.from('regions').select('id,name,state').eq('active',true).order('name'),
   auth.db.from('partners').select('id,name,region_id').eq('verification_status','verified').order('name')
  ])
  if(usersResult.error)throw usersResult.error
  if(regionsResult.error)throw regionsResult.error
  if(partnersResult.error)throw partnersResult.error
  return NextResponse.json({users:usersResult.data||[],regions:regionsResult.data||[],partners:partnersResult.data||[]})
 }catch(error){
  return NextResponse.json({error:error instanceof Error?error.message:'Unable to load users'},{status:500})
 }
}

export async function POST(req:NextRequest){
 try{
  const auth=await getAdmin(req)
  if('error'in auth)return auth.error
  const parsed=userFields.safeParse(await req.json())
  if(!parsed.success)return NextResponse.json({error:parsed.error.issues[0].message},{status:400})
  const values=parsed.data
  const linkError=await validateRoleLinks(auth.db,values.role,values.region_id,values.partner_id)
  if(linkError)return NextResponse.json({error:linkError},{status:400})
  const {data:invitation,error:inviteError}=await auth.db.auth.admin.generateLink({
   type:'invite',
   email:values.email,
   options:{data:{full_name:values.full_name},redirectTo:new URL('/auth/update-password',req.nextUrl.origin).toString()}
  })
  if(inviteError)throw inviteError
  if(!invitation.user)return NextResponse.json({error:'Supabase did not return the invited user.'},{status:502})
  const {data:profile,error:profileError}=await auth.db.from('profiles').upsert({
   id:invitation.user.id,
   full_name:values.full_name,
   email:values.email,
   role:values.role,
   active:true,
   region_id:values.region_id||null,
   partner_id:['partner','technician'].includes(values.role)?values.partner_id||null:null
  },{onConflict:'id'}).select('id,full_name,email,phone,role,active,region_id,partner_id,created_at').single()
  if(profileError){
   await auth.db.auth.admin.deleteUser(invitation.user.id)
   throw profileError
  }
  try{
   await sendConfiguredEmail({
    to:values.email,
    subject:'You are invited to Fyxnora',
    suppressCc:true,
    html:emailShell('Your Fyxnora account is ready',`<p>Hello ${escapeHtml(values.full_name)},</p><p>An administrator invited you to Fyxnora as a <strong>${escapeHtml(values.role)}</strong>.</p><p><a href="${escapeHtml(invitation.properties.action_link)}" style="display:inline-block;background:#0879d9;color:#fff;text-decoration:none;padding:12px 18px;border-radius:8px">Accept invitation and set password</a></p><p>If the button does not work, copy this link into your browser:<br>${escapeHtml(invitation.properties.action_link)}</p>`),
    text:`Hello ${values.full_name}, you were invited to Fyxnora as ${values.role}. Accept your invitation and set a password here: ${invitation.properties.action_link}`
   })
  }catch(error){
   await auth.db.from('profiles').delete().eq('id',invitation.user.id)
   await auth.db.auth.admin.deleteUser(invitation.user.id)
   throw error
  }
  let internalEmailSent=true
  try{
   await sendConfiguredEmail({
    to:[],
    includeInternal:true,
    suppressCc:true,
    subject:'Fyxnora user invitation sent',
    html:emailShell('User invitation sent',`<p>${escapeHtml(values.full_name)} (${escapeHtml(values.email)}) was invited as <strong>${escapeHtml(values.role)}</strong>.</p>`)
   })
  }catch(error){
   internalEmailSent=false
   console.error('Internal user invitation notification failed',error)
  }
  return NextResponse.json({user:profile,message:internalEmailSent?'Invitation email sent.':'Invitation sent, but internal notification email failed.'},{status:201})
 }catch(error){
  return NextResponse.json({error:error instanceof Error?error.message:'Unable to invite user'},{status:500})
 }
}

export async function PATCH(req:NextRequest){
 try{
  const auth=await getAdmin(req)
  if('error'in auth)return auth.error
  const parsed=updateFields.safeParse(await req.json())
  if(!parsed.success)return NextResponse.json({error:parsed.error.issues[0].message},{status:400})
  const values=parsed.data
  if(values.id===auth.user.id&&(!values.active||values.role!=='admin')){
   return NextResponse.json({error:'You cannot disable or demote your own administrator account.'},{status:400})
  }
  const {data:current,error:currentError}=await auth.db.from('profiles').select('id,role,active').eq('id',values.id).single()
  if(currentError||!current)return NextResponse.json({error:'User not found.'},{status:404})
  if(current.role==='admin'&&(!values.active||values.role!=='admin')){
   const {count,error}=await auth.db.from('profiles').select('id',{count:'exact',head:true}).eq('role','admin').eq('active',true)
   if(error)throw error
   if((count||0)<=1)return NextResponse.json({error:'The last active administrator cannot be disabled or demoted.'},{status:409})
  }
  const linkError=await validateRoleLinks(auth.db,values.role,values.region_id,values.partner_id)
  if(linkError)return NextResponse.json({error:linkError},{status:400})
  const {data:user,error}=await auth.db.from('profiles').update({
   full_name:values.full_name,
   phone:values.phone||null,
   role:values.role,
   active:values.active,
   region_id:values.region_id||null,
   partner_id:['partner','technician'].includes(values.role)?values.partner_id||null:null
  }).eq('id',values.id).select('id,full_name,email,phone,role,active,region_id,partner_id,created_at').single()
  if(error)throw error
  return NextResponse.json({user})
 }catch(error){
  return NextResponse.json({error:error instanceof Error?error.message:'Unable to update user'},{status:500})
 }
}

export async function PUT(req:NextRequest){
 try{
  const auth=await getAdmin(req)
  if('error'in auth)return auth.error
  const parsed=z.object({id:z.string().uuid()}).safeParse(await req.json())
  if(!parsed.success)return NextResponse.json({error:'A valid user is required.'},{status:400})
  const {data:profile,error:profileError}=await auth.db.from('profiles').select('id,email,full_name').eq('id',parsed.data.id).single()
  if(profileError||!profile)return NextResponse.json({error:'User not found.'},{status:404})
  const {data:link,error:linkError}=await auth.db.auth.admin.generateLink({
   type:'recovery',
   email:profile.email,
   options:{redirectTo:new URL('/auth/update-password',req.nextUrl.origin).toString()}
  })
  if(linkError)throw linkError
  await sendConfiguredEmail({
   to:profile.email,
   subject:'Reset your Fyxnora password',
   suppressCc:true,
   html:emailShell('Reset your password',`<p>Hello ${escapeHtml(profile.full_name||'there')},</p><p>An administrator requested a password reset for your Fyxnora account.</p><p><a href="${escapeHtml(link.properties.action_link)}" style="display:inline-block;background:#0879d9;color:#fff;text-decoration:none;padding:12px 18px;border-radius:8px">Choose a new password</a></p><p>This one-time link should only be used by you.</p>`),
   text:`Hello ${profile.full_name||'there'}, choose a new Fyxnora password using this one-time link: ${link.properties.action_link}`
  })
  let internalAlertSent=true
  try{
   await sendConfiguredEmail({
    to:[],
    includeInternal:true,
    suppressCc:true,
    subject:'Fyxnora password reset requested',
    html:emailShell('Password reset requested',`<p>A password reset link was sent to ${escapeHtml(profile.email)}.</p><p>The reset link was not copied to this notification.</p>`)
   })
  }catch(error){
   internalAlertSent=false
   console.error('Internal password reset notification failed',error)
  }
  const {error:auditError}=await auth.db.from('audit_logs').insert({actor_id:auth.user.id,entity_type:'profile',entity_id:profile.id,action:'password_reset_link_sent',metadata:{email:profile.email}})
  if(auditError)throw auditError
  return NextResponse.json({message:internalAlertSent?`Password reset email sent to ${profile.email}.`:`Password reset email sent to ${profile.email}, but the internal notification could not be delivered.`})
 }catch(error){
  return NextResponse.json({error:error instanceof Error?error.message:'Unable to reset password'},{status:500})
 }
}
