import {NextRequest,NextResponse} from 'next/server'
import {z} from 'zod'
import {adminClient} from '@/lib/supabase'
import {emailShell,sendConfiguredEmail} from '@/lib/mailer'

export const dynamic='force-dynamic'

const requestSchema=z.object({
 email:z.string().trim().email().max(255).transform(value=>value.toLowerCase())
})

const genericMessage='If an account is registered with this email, a recovery code has been sent.'

export async function POST(request:NextRequest){
 try{
  if(!process.env.SUPABASE_SERVICE_ROLE_KEY){
   return NextResponse.json({error:'Password recovery is not configured.'},{status:503})
  }
  const parsed=requestSchema.safeParse(await request.json())
  if(!parsed.success)return NextResponse.json({error:parsed.error.issues[0].message},{status:400})

  const db=adminClient()
  const {data:profile,error:profileError}=await db.from('profiles').select('id').eq('email',parsed.data.email).maybeSingle()
  if(profileError)throw profileError
  if(!profile)return NextResponse.json({message:genericMessage})

  const {data,error}=await db.auth.admin.generateLink({type:'recovery',email:parsed.data.email})
  if(error)throw error
  const code=data.properties.email_otp
  if(!code)throw Error('Supabase did not return a password recovery code.')

  await sendConfiguredEmail({
   to:parsed.data.email,
   subject:'Your Fyxnora password recovery code',
   suppressCc:true,
   html:emailShell('Reset your password',`<p>Your Fyxnora password recovery code is:</p><p style="font-size:30px;font-weight:800;letter-spacing:6px;color:#167ed2">${code}</p><p>Enter this code on the password reset page to choose a new password. If you did not request this, you can ignore this email.</p>`),
   text:`Your Fyxnora password recovery code is ${code}. Enter it on the password reset page to choose a new password. If you did not request this, you can ignore this email.`
  })
  return NextResponse.json({message:genericMessage})
 }catch(error){
  console.error('Password recovery code delivery failed',error)
  return NextResponse.json({error:'Password recovery email is temporarily unavailable. Please try again later.'},{status:503})
 }
}
