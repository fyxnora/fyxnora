import {NextRequest,NextResponse} from 'next/server'
import {z} from 'zod'
import {publicClient,adminClient} from '@/lib/supabase'
import {emailShell,escapeHtml,sendConfiguredEmail} from '@/lib/mailer'
import {createRoleWorkflowPdf} from '@/lib/role-workflow-pdf'

async function notifyBooking(db:ReturnType<typeof adminClient>,booking:Record<string,unknown>,subject:string,description:string){
 const {data:customer,error:customerError}=await db.from('profiles').select('email,full_name').eq('id',String(booking.customer_id)).single()
 if(customerError||!customer?.email){console.error('Unable to find booking notification recipient',customerError);return}
 let mailError:unknown=null
 try{
  await sendConfiguredEmail({
   to:customer.email,
   includeInternal:true,
   subject,
   html:emailShell(subject,`<p>Hello ${escapeHtml(customer.full_name||'Customer')},</p><p><strong>Repair ${escapeHtml(String(booking.reference))}</strong></p><p>${escapeHtml(description)}</p><p>Current status: <strong>${escapeHtml(String(booking.status).replaceAll('_',' '))}</strong></p><p>Updated: ${escapeHtml(new Date(String(booking.updated_at||booking.created_at||new Date().toISOString())).toLocaleString('en-IN',{dateStyle:'medium',timeStyle:'short'}))}</p><p>Your attached workflow guide lists completed and upcoming repair stages.</p>`),
   text:`Hello ${customer.full_name||'Customer'}, repair ${String(booking.reference)} has an update: ${description}. Current status: ${String(booking.status).replaceAll('_',' ')}. Updated: ${new Date(String(booking.updated_at||booking.created_at||new Date().toISOString())).toLocaleString('en-IN',{dateStyle:'medium',timeStyle:'short'})}. The attached workflow guide lists all repair stages.`,
   attachments:[{filename:'fyxnora-repair-workflow-guide.pdf',content:Buffer.from(await createRoleWorkflowPdf()),contentType:'application/pdf'}]
  })
 }catch(error){
  mailError=error
  console.error('Booking status email failed',error)
 }
 const {error:notificationError}=await db.from('notifications').insert({
  user_id:booking.customer_id,
  booking_id:booking.id,
  channel:'email',
  template:'booking_status',
  payload:{subject,...(mailError?{error:mailError instanceof Error?mailError.message:'Email failed'}:{})},
  status:mailError?'failed':'sent',
  ...(!mailError?{sent_at:new Date().toISOString()}:{})
 })
 if(notificationError)console.error('Unable to record booking email result',notificationError)
}

const bookingSchema=z.object({
 action:z.literal('create_booking'),
 category:z.string().trim().min(1).max(80),
 brand:z.string().trim().min(2).max(80),
 model:z.string().trim().min(1).max(100),
 issue:z.string().trim().min(2).max(2000),
 model_id:z.string().uuid(),
 repair_service_ids:z.array(z.string().uuid()).min(1).max(20),
 estimated_amount:z.number().nonnegative().max(10000000),
 city:z.string().trim().min(2).max(80),
 state:z.string().trim().min(2).max(100),
 country:z.string().trim().min(2).max(100),
 pincode:z.string().regex(/^[1-9][0-9]{5}$/),
 address:z.string().trim().min(10).max(1000),
 latitude:z.number().min(-90).max(90).nullable().optional(),
 longitude:z.number().min(-180).max(180).nullable().optional(),
 phone:z.string().regex(/^[6-9][0-9]{9}$/),
 preferred_date:z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
 consent:z.literal(true)
})
const actionSchema=z.object({
 action:z.enum(['assign_partner','assign_technician','assign_region','schedule_visit','verify_pickup','mark_in_transit','receive_centre','diagnosis_done','submit_quote','approve_quote','reject_quote','start_repair','finish_repair','quality_approved','ready_delivery','out_for_delivery','complete_delivery','close_order','mark_return','mark_parts_delayed','resume_repair']),
 bookingId:z.string().uuid(),
 targetId:z.string().uuid().optional(),
 amount:z.number().positive().max(10000000).optional(),
 details:z.string().max(5000).optional()
})
const transitions:Record<string,{roles:string[];from:string[];to:string}>={
 schedule_visit:{roles:['admin','regional','technician'],from:['ASSIGNED','BOOKED'],to:'VISIT_SCHEDULED'},
 verify_pickup:{roles:['technician','admin'],from:['VISIT_SCHEDULED','ASSIGNED'],to:'PICKUP_VERIFIED'},
 mark_in_transit:{roles:['technician','admin'],from:['PICKUP_VERIFIED'],to:'IN_TRANSIT'},
 receive_centre:{roles:['partner','admin'],from:['IN_TRANSIT','PICKUP_VERIFIED'],to:'RECEIVED_AT_CENTRE'},
 diagnosis_done:{roles:['partner','admin'],from:['RECEIVED_AT_CENTRE'],to:'DIAGNOSIS'},
 submit_quote:{roles:['partner','admin'],from:['DIAGNOSIS'],to:'QUOTE_SENT'},
 approve_quote:{roles:['customer'],from:['QUOTE_SENT'],to:'CUSTOMER_APPROVED'},
 reject_quote:{roles:['customer'],from:['QUOTE_SENT'],to:'QUOTE_REJECTED'},
 start_repair:{roles:['partner','admin'],from:['CUSTOMER_APPROVED'],to:'REPAIRING'},
 finish_repair:{roles:['partner','admin'],from:['REPAIRING'],to:'QUALITY_CHECK'},
 quality_approved:{roles:['partner','admin'],from:['QUALITY_CHECK'],to:'READY_FOR_DELIVERY'},
 ready_delivery:{roles:['partner','admin'],from:['QUALITY_CHECK'],to:'READY_FOR_DELIVERY'},
 out_for_delivery:{roles:['technician','admin'],from:['READY_FOR_DELIVERY'],to:'OUT_FOR_DELIVERY'},
 complete_delivery:{roles:['technician','admin'],from:['OUT_FOR_DELIVERY'],to:'DELIVERED'},
 close_order:{roles:['admin','customer'],from:['DELIVERED'],to:'CLOSED'},
 mark_return:{roles:['partner','admin'],from:['QUOTE_REJECTED'],to:'RETURN_WITHOUT_REPAIR'},
 mark_parts_delayed:{roles:['partner','admin'],from:['REPAIRING'],to:'PARTS_DELAYED'},
 resume_repair:{roles:['partner','admin'],from:['PARTS_DELAYED'],to:'REPAIRING'}
}

export async function POST(req:NextRequest){
 try{
  const token=req.headers.get('authorization')?.replace(/^Bearer\s+/i,'')
  if(!token)return NextResponse.json({error:'Please log in again'},{status:401})
  const {data:{user},error:authError}=await publicClient().auth.getUser(token)
  if(authError||!user)return NextResponse.json({error:'Please log in again'},{status:401})
  const db=adminClient()
  const {data:profile,error:profileError}=await db.from('profiles').select('*').eq('id',user.id).single()
  if(profileError||!profile)return NextResponse.json({error:'No profile found'},{status:403})
  if(!profile.active)return NextResponse.json({error:'This account is disabled. Contact an administrator.'},{status:403})
  const body:unknown=await req.json()
  if(typeof body==='object'&&body!==null&&'action'in body&&body.action==='create_booking'){
   const parsed=bookingSchema.safeParse(body)
   if(!parsed.success)return NextResponse.json({error:parsed.error.issues[0].message},{status:400})
   if(profile.role!=='customer')return NextResponse.json({error:'Only customer accounts can book'},{status:403})
   const {category,brand,model,issue,city,state,country,pincode,address,phone,preferred_date,model_id,repair_service_ids,latitude,longitude}=parsed.data
   const {data:catalogModel,error:modelError}=await db.from('device_models').select('id').eq('id',model_id).eq('active',true).single()
   if(modelError||!catalogModel)return NextResponse.json({error:'Selected device model is unavailable.'},{status:400})
   const {data:catalogPrices,error:priceError}=await db.from('model_repair_prices').select('repair_service_id,price,discount_price').eq('model_id',model_id).eq('active',true).in('repair_service_id',repair_service_ids)
   if(priceError||!catalogPrices||catalogPrices.length!==repair_service_ids.length)return NextResponse.json({error:'One or more repair services are unavailable.'},{status:400})
   const estimated_amount=catalogPrices.reduce((total,item)=>total+Number(item.discount_price??item.price),0)
   const values={category,brand,model,issue,city,state,country,pincode,address,phone,preferred_date,model_id,repair_service_ids,estimated_amount,location_latitude:latitude??null,location_longitude:longitude??null}
   const {data:booking,error}=await db.from('bookings').insert({...values,customer_id:user.id,status:'BOOKED'}).select().single()
   if(error)throw error
   const {error:eventError}=await db.from('booking_events').insert({booking_id:booking.id,actor_id:user.id,kind:'BOOKED',description:'Repair booking requested by customer'})
   if(eventError)throw eventError
   await notifyBooking(db,booking,`Repair ${booking.reference} booked`,'Your repair request was received. Our operations team will review and assign it shortly.')
   return NextResponse.json({booking})
  }

  const parsed=actionSchema.safeParse(body)
  if(!parsed.success)return NextResponse.json({error:parsed.error.issues[0].message},{status:400})
  const action=parsed.data
  const {data:booking,error:bookingError}=await db.from('bookings').select('*').eq('id',action.bookingId).single()
  if(bookingError||!booking)return NextResponse.json({error:'Booking not found'},{status:404})
  const allowed=profile.role==='admin'||
   (profile.role==='customer'&&booking.customer_id===user.id)||
   (profile.role==='technician'&&booking.technician_id===user.id)||
   (profile.role==='partner'&&booking.partner_id===(profile.partner_id||user.id))||
   (profile.role==='regional'&&booking.regional_id===user.id)
  if(!allowed)return NextResponse.json({error:'Not permitted for this booking'},{status:403})

  const change:Record<string,unknown>={}
  let description=''
  if(['assign_partner','assign_technician','assign_region'].includes(action.action)){
   const partnerAssigningTechnician=profile.role==='partner'&&action.action==='assign_technician'
   if((!['admin','regional'].includes(profile.role)&&!partnerAssigningTechnician)||(profile.role==='regional'&&action.action==='assign_region'))return NextResponse.json({error:'Not permitted'},{status:403})
   if(!action.targetId)return NextResponse.json({error:'Select an active assignee'},{status:400})
   const required=action.action==='assign_partner'?'partner':action.action==='assign_technician'?'technician':'regional'
   const {data:target,error:targetError}=await db.from('profiles').select('*').eq('id',action.targetId).eq('role',required).eq('active',true).single()
   if(targetError||!target)return NextResponse.json({error:'Active assignee not found'},{status:400})
   if(profile.role==='regional'&&(!profile.region_id||target.region_id!==profile.region_id))return NextResponse.json({error:'Assignee is outside your region'},{status:403})
   if(profile.role==='partner'&&target.partner_id!==profile.partner_id)return NextResponse.json({error:'Technician is not linked to your service centre'},{status:403})
   if(required==='technician')change.technician_id=target.id
   if(required==='partner'){
    if(!target.partner_id)return NextResponse.json({error:'Partner account must be linked to a verified service centre'},{status:400})
    const {data:centre,error:centreError}=await db.from('partners').select('verification_status').eq('id',target.partner_id).single()
    if(centreError||centre?.verification_status!=='verified')return NextResponse.json({error:'Partner centre is not verified'},{status:400})
    change.partner_id=target.partner_id
   }
   if(required==='regional')change.regional_id=target.id
   if(['BOOKED','ASSIGNED'].includes(booking.status))change.status='ASSIGNED'
   else if(!['VISIT_SCHEDULED','PICKUP_VERIFIED'].includes(booking.status))return NextResponse.json({error:'Assignments locked at current stage'},{status:409})
   description=`Assigned ${required} ${target.full_name}`
  }else{
   const transition=transitions[action.action]
   if(!transition||!transition.roles.includes(profile.role))return NextResponse.json({error:'Action not permitted'},{status:403})
   if(!transition.from.includes(booking.status))return NextResponse.json({error:`Cannot ${action.action} from ${booking.status}`},{status:409})
   if(action.action==='submit_quote'&&(!action.amount||!action.details?.trim()))return NextResponse.json({error:'Amount and itemized quote are required'},{status:400})
   if(['verify_pickup','complete_delivery'].includes(action.action)&&!action.details?.trim())return NextResponse.json({error:'Record the custody verification details'},{status:400})
   if(action.action==='approve_quote'&&booking.quoted_amount==null)return NextResponse.json({error:'No quotation available'},{status:409})
   change.status=transition.to
   if(action.action==='submit_quote'){change.quoted_amount=action.amount;change.quote_details=action.details}
   if(action.action==='approve_quote'){change.approved_at=new Date().toISOString();change.approved_amount=booking.quoted_amount}
   description=action.details?.trim()||action.action.replaceAll('_',' ')
  }

  const {data:updated,error:updateError}=await db.from('bookings').update(change).eq('id',booking.id).eq('status',booking.status).select().maybeSingle()
  if(updateError)throw updateError
  if(!updated)return NextResponse.json({error:'Booking was updated by someone else. Refresh and retry.'},{status:409})
  const {error:eventError}=await db.from('booking_events').insert({booking_id:booking.id,actor_id:user.id,kind:updated.status,description})
  if(eventError)throw eventError
  await notifyBooking(db,updated,`Repair ${updated.reference}: ${String(updated.status).replaceAll('_',' ')}`,description)
  return NextResponse.json({booking:updated})
 }catch(error){
  return NextResponse.json({error:error instanceof Error?error.message:'Server error'},{status:500})
 }
}
