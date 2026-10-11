import {NextRequest,NextResponse} from 'next/server'
import {publicClient,adminClient} from '@/lib/supabase'

export const dynamic='force-dynamic'

export async function GET(req:NextRequest){
 try{
  const token=req.headers.get('authorization')?.replace(/^Bearer\s+/i,'')
  if(!token)return NextResponse.json({error:'Unauthorized'},{status:401})
  const {data:{user},error:authError}=await publicClient().auth.getUser(token)
  if(authError||!user)return NextResponse.json({error:'Unauthorized'},{status:401})
  const db=adminClient()
  const {data:profile,error:profileError}=await db.from('profiles').select('*').eq('id',user.id).single()
  if(profileError||!profile)return NextResponse.json({error:'Profile missing'},{status:403})
  if(!profile.active)return NextResponse.json({error:'This account is disabled. Contact an administrator.'},{status:403})

  let query=db.from('bookings').select('*').order('created_at',{ascending:false}).limit(200)
  if(profile.role==='customer')query=query.eq('customer_id',user.id)
  if(profile.role==='technician')query=query.eq('technician_id',user.id)
  if(profile.role==='partner')query=query.eq('partner_id',profile.partner_id||'00000000-0000-0000-0000-000000000000')
  if(profile.role==='regional')query=query.eq('regional_id',user.id)
  const {data:bookings,error:bookingError}=await query
  if(bookingError)throw bookingError

  let people:unknown[]=[]
  if(profile.role==='admin'){
   const {data,error}=await db.from('profiles').select('id,full_name,email,role,region_id,partner_id').in('role',['technician','partner','regional']).eq('active',true)
   if(error)throw error
   people=data||[]
  }
  if(profile.role==='regional'){
   const {data,error}=await db.from('profiles').select('id,full_name,email,role,region_id,partner_id').eq('region_id',profile.region_id||'00000000-0000-0000-0000-000000000000').eq('active',true)
   if(error)throw error
   people=data||[]
  }
  if(profile.role==='partner'){
   const {data,error}=await db.from('profiles').select('id,full_name,email,role,region_id,partner_id').eq('role','technician').eq('partner_id',profile.partner_id||'00000000-0000-0000-0000-000000000000').eq('active',true)
   if(error)throw error
   people=data||[]
  }
  const ids=(bookings||[]).map(booking=>booking.id)
  let events:unknown[]=[]
  if(ids.length){
   const {data,error}=await db.from('booking_events').select('id,booking_id,kind,description,created_at').in('booking_id',ids).order('created_at',{ascending:true})
   if(error)throw error
   events=data||[]
  }
  return NextResponse.json({profile,bookings,people,events})
 }catch(error){
  return NextResponse.json({error:error instanceof Error?error.message:'Server error'},{status:500})
 }
}
