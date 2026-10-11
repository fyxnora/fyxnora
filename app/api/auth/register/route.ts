import {createHmac,randomInt,timingSafeEqual} from 'crypto'
import {NextRequest,NextResponse} from 'next/server'
import {z} from 'zod'
import {adminClient} from '@/lib/supabase'
import {emailShell,escapeHtml,sendConfiguredEmail} from '@/lib/mailer'

export const dynamic='force-dynamic'

const base=z.object({
 full_name:z.string().trim().min(2).max(120),
 email:z.string().trim().email().max(255).transform(value=>value.toLowerCase()),
 password:z.string().min(8).max(128)
})
const requestSchema=base.extend({action:z.literal('request_otp')})
const verifySchema=base.extend({action:z.literal('verify_otp'),otp:z.string().regex(/^\d{6}$/)})
const hash=(value:string)=>createHmac('sha256',process.env.SUPABASE_SERVICE_ROLE_KEY||'').update(value).digest('hex')
const equalsHash=(stored:string,submitted:string)=>{
 const storedBytes=Buffer.from(stored,'hex')
 const submittedBytes=Buffer.from(hash(submitted),'hex')
 return storedBytes.length===submittedBytes.length&&timingSafeEqual(storedBytes,submittedBytes)
}

export async function POST(req:NextRequest){
 try{
  if(!process.env.SUPABASE_SERVICE_ROLE_KEY)return NextResponse.json({error:'Email verification is not configured.'},{status:503})
  const body:unknown=await req.json()
  if(typeof body==='object'&&body!==null&&'action'in body&&body.action==='request_otp'){
   const parsed=requestSchema.safeParse(body)
   if(!parsed.success)return NextResponse.json({error:parsed.error.issues[0].message},{status:400})
   const db=adminClient()
   const {data:existingProfile,error:profileError}=await db.from('profiles').select('id').eq('email',parsed.data.email).limit(1).maybeSingle()
   if(profileError)throw profileError
   if(existingProfile)return NextResponse.json({error:'An account with this email already exists.'},{status:409})
   const {data:previous,error:previousError}=await db.from('email_verification_codes').select('last_sent_at').eq('email',parsed.data.email).maybeSingle()
   if(previousError)throw previousError
   if(previous?.last_sent_at&&Date.now()-new Date(previous.last_sent_at).getTime()<60_000){
    return NextResponse.json({error:'Please wait one minute before requesting another code.'},{status:429})
   }

   const otp=String(randomInt(100000,1000000))
   const now=new Date()
   const {error:saveError}=await db.from('email_verification_codes').upsert({
    email:parsed.data.email,
    code_hash:hash(otp),
    full_name:parsed.data.full_name,
    attempts:0,
    expires_at:new Date(now.getTime()+10*60*1000).toISOString(),
    used_at:null,
    last_sent_at:now.toISOString()
   },{onConflict:'email'})
   if(saveError)throw saveError
   try{
    await sendConfiguredEmail({
     to:parsed.data.email,
     subject:'Your Fyxnora verification code',
     suppressCc:true,
     html:emailShell('Verify your email',`<p>Hello ${escapeHtml(parsed.data.full_name)},</p><p>Your verification code is:</p><p style="font-size:30px;font-weight:800;letter-spacing:6px;color:#167ed2">${otp}</p><p>This code expires in 10 minutes. Do not share it with anyone.</p>`),
     text:`Your Fyxnora verification code is ${otp}. It expires in 10 minutes. Do not share it with anyone.`
    })
   }catch(error){
    await db.from('email_verification_codes').delete().eq('email',parsed.data.email)
    throw error
   }
   return NextResponse.json({message:'A 6-digit verification code was sent to your email.'})
  }

  const parsed=verifySchema.safeParse(body)
  if(!parsed.success)return NextResponse.json({error:parsed.error.issues[0].message},{status:400})
  const db=adminClient()
  const {data:record,error:recordError}=await db.from('email_verification_codes').select('*').eq('email',parsed.data.email).maybeSingle()
  if(recordError)throw recordError
  if(!record||record.used_at||new Date(record.expires_at)<=new Date()||record.attempts>=5){
   return NextResponse.json({error:'The verification code is invalid or expired.'},{status:400})
  }
  if(!equalsHash(record.code_hash,parsed.data.otp)){
   const {error:attemptError}=await db.from('email_verification_codes').update({attempts:record.attempts+1}).eq('id',record.id).eq('attempts',record.attempts)
   if(attemptError)throw attemptError
   return NextResponse.json({error:'The verification code is incorrect.'},{status:400})
  }

  const {data:created,error:createError}=await db.auth.admin.createUser({
   email:parsed.data.email,
   password:parsed.data.password,
   email_confirm:true,
   user_metadata:{full_name:record.full_name}
  })
  if(createError)throw createError
  const {error:profileError}=await db.from('profiles').upsert({
   id:created.user.id,
   full_name:record.full_name,
   email:parsed.data.email,
   role:'customer',
   active:true
  },{onConflict:'id'})
  if(profileError){
   await db.auth.admin.deleteUser(created.user.id)
   throw profileError
  }
  const {error:consumeError}=await db.from('email_verification_codes').update({used_at:new Date().toISOString()}).eq('id',record.id).is('used_at',null)
  if(consumeError)throw consumeError

  let welcomeEmailSent=true
  try{
   await sendConfiguredEmail({
    to:parsed.data.email,
    subject:'Welcome to Fyxnora',
    includeInternal:true,
    html:emailShell('Welcome to Fyxnora',`<p>Hello ${escapeHtml(record.full_name)},</p><p>Your email is verified and your customer account is ready. You can now book a repair and follow every service milestone from your dashboard.</p>`),
    text:`Hello ${record.full_name}, your email is verified and your Fyxnora customer account is ready.`
   })
  }catch(error){
   welcomeEmailSent=false
   console.error('Fyxnora welcome email failed',error)
  }
  const {error:notificationError}=await db.from('notifications').insert({
   user_id:created.user.id,
   channel:'email',
   template:'welcome',
   payload:{email:parsed.data.email},
   status:welcomeEmailSent?'sent':'failed',
   ...(welcomeEmailSent?{sent_at:new Date().toISOString()}:{})
  })
  if(notificationError)console.error('Unable to record welcome email result',notificationError)
  return NextResponse.json({
   message:welcomeEmailSent?'Email verified. Your account is ready.':'Your account is ready, but we could not send the welcome email. Please contact support.',
   welcomeEmailSent
  },{status:201})
 }catch(error){
  console.error('Account registration failed',error)
  return NextResponse.json({error:error instanceof Error?error.message:'Unable to create account'},{status:500})
 }
}
