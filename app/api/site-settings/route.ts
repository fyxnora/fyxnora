import {NextResponse} from 'next/server'
import {adminClient} from '@/lib/supabase'

export const dynamic='force-dynamic'
export async function GET(){try{const {data,error}=await adminClient().from('app_settings').select('value').eq('id','contact').maybeSingle();if(error)throw error;const value=(data?.value||{}) as Record<string,unknown>;return NextResponse.json({whatsapp_number:String(value.whatsapp_number||''),whatsapp_message:String(value.whatsapp_message||'Hello Fyxnora, I need help with a device repair.'),support_email:String(value.support_email||'support@fyxnora.com'),support_phone:String(value.support_phone||''),business_hours:String(value.business_hours||'Monday–Saturday, 9:00 AM–7:00 PM')})}catch{return NextResponse.json({whatsapp_number:'',whatsapp_message:'Hello Fyxnora, I need help with a device repair.',support_email:'support@fyxnora.com',support_phone:'',business_hours:'Monday–Saturday, 9:00 AM–7:00 PM'})}}
