import {NextResponse} from 'next/server'
import {adminClient} from '@/lib/supabase'

export const dynamic='force-dynamic'

export async function GET(){
 try{
  const db=adminClient()
  const [categories,brands,models,services,pricesPageOne,pricesPageTwo]=await Promise.all([
   db.from('service_categories').select('id,name,sort_order').eq('active',true).order('sort_order'),
   db.from('device_brands').select('id,category_id,name,sort_order').eq('active',true).order('sort_order'),
   db.from('device_models').select('id,brand_id,name,model_code,sort_order').eq('active',true).order('sort_order'),
   db.from('repair_services').select('id,name,description,default_duration_minutes,default_warranty_months,sort_order').eq('active',true).order('sort_order'),
   db.from('model_repair_prices').select('id,model_id,repair_service_id,price,discount_price,doorstep_available').eq('active',true).range(0,999),
   db.from('model_repair_prices').select('id,model_id,repair_service_id,price,discount_price,doorstep_available').eq('active',true).range(1000,1999)
  ])
  for(const result of [categories,brands,models,services,pricesPageOne,pricesPageTwo])if(result.error)throw result.error
  return NextResponse.json({categories:categories.data||[],brands:brands.data||[],models:models.data||[],services:services.data||[],prices:[...(pricesPageOne.data||[]),...(pricesPageTwo.data||[])]})
 }catch(error){return NextResponse.json({error:error instanceof Error?error.message:'Unable to load catalog'},{status:500})}
}
