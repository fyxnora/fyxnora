import {NextRequest,NextResponse} from 'next/server'
import {z} from 'zod'
import {adminClient,publicClient} from '@/lib/supabase'

async function admin(req:NextRequest){
 const token=req.headers.get('authorization')?.replace(/^Bearer\s+/i,'')
 if(!token)return null
 const {data:{user}}=await publicClient().auth.getUser(token);if(!user)return null
 const db=adminClient();const {data:profile}=await db.from('profiles').select('role,active').eq('id',user.id).single()
 return profile?.role==='admin'&&profile.active?{db,user}:null
}
const row=z.object({category:z.string().trim().min(1),brand:z.string().trim().min(1),model:z.string().trim().min(1),model_code:z.string().trim().optional().default(''),repair_service:z.string().trim().min(1),description:z.string().trim().optional().default(''),price:z.coerce.number().nonnegative(),discount_price:z.union([z.coerce.number().nonnegative(),z.literal(''),z.null()]).optional(),duration_minutes:z.coerce.number().int().positive().default(60),warranty_months:z.coerce.number().int().nonnegative().default(3),doorstep_available:z.coerce.boolean().default(true)})
const input=z.object({rows:z.array(row).min(1).max(500)})
const updateInput=z.object({updates:z.array(z.object({id:z.string().uuid(),price:z.coerce.number().nonnegative(),discount_price:z.union([z.coerce.number().nonnegative(),z.null()]),doorstep_available:z.boolean(),active:z.boolean()})).min(1).max(500)})

export async function GET(req:NextRequest){
 try{
  const a=await admin(req);if(!a)return NextResponse.json({error:'Super admin access required'},{status:403})
  const [categories,brands,models,services,pricesPageOne,pricesPageTwo]=await Promise.all([
   a.db.from('service_categories').select('id,name,sort_order,active').order('sort_order').range(0,4999),
   a.db.from('device_brands').select('id,category_id,name,sort_order,active').order('sort_order').range(0,4999),
   a.db.from('device_models').select('id,brand_id,name,model_code,sort_order,active').order('sort_order').range(0,4999),
   a.db.from('repair_services').select('id,name,description,default_duration_minutes,default_warranty_months,sort_order,active').order('sort_order').range(0,4999),
   a.db.from('model_repair_prices').select('id,model_id,repair_service_id,price,discount_price,doorstep_available,active').range(0,999),
   a.db.from('model_repair_prices').select('id,model_id,repair_service_id,price,discount_price,doorstep_available,active').range(1000,1999)
  ])
  for(const result of [categories,brands,models,services,pricesPageOne,pricesPageTwo])if(result.error)throw result.error
  return NextResponse.json({categories:categories.data||[],brands:brands.data||[],models:models.data||[],services:services.data||[],prices:[...(pricesPageOne.data||[]),...(pricesPageTwo.data||[])]})
 }catch(error){return NextResponse.json({error:error instanceof Error?error.message:'Unable to load admin catalog'},{status:500})}
}

export async function POST(req:NextRequest){
 try{
  const auth=await admin(req);if(!auth)return NextResponse.json({error:'Super admin access required'},{status:403})
  const parsed=input.safeParse(await req.json());if(!parsed.success)return NextResponse.json({error:parsed.error.issues[0].message},{status:400})
  for(const item of parsed.data.rows){
   let {data:category}=await auth.db.from('service_categories').select('id').ilike('name',item.category).maybeSingle()
   if(!category){const result=await auth.db.from('service_categories').insert({name:item.category}).select('id').single();if(result.error)throw result.error;category=result.data}
   let {data:brand}=await auth.db.from('device_brands').select('id').eq('category_id',category.id).ilike('name',item.brand).maybeSingle()
   if(!brand){const result=await auth.db.from('device_brands').insert({category_id:category.id,name:item.brand}).select('id').single();if(result.error)throw result.error;brand=result.data}
   let {data:model}=await auth.db.from('device_models').select('id').eq('brand_id',brand.id).ilike('name',item.model).maybeSingle()
   if(!model){const result=await auth.db.from('device_models').insert({brand_id:brand.id,name:item.model,model_code:item.model_code||null}).select('id').single();if(result.error)throw result.error;model=result.data}
   let {data:service}=await auth.db.from('repair_services').select('id').ilike('name',item.repair_service).maybeSingle()
   if(!service){const result=await auth.db.from('repair_services').insert({name:item.repair_service,description:item.description,default_duration_minutes:item.duration_minutes,default_warranty_months:item.warranty_months}).select('id').single();if(result.error)throw result.error;service=result.data}
   const {error}=await auth.db.from('model_repair_prices').upsert({model_id:model.id,repair_service_id:service.id,price:item.price,discount_price:item.discount_price===''||item.discount_price==null?null:item.discount_price,doorstep_available:item.doorstep_available,active:true},{onConflict:'model_id,repair_service_id'});if(error)throw error
  }
  return NextResponse.json({message:`Imported ${parsed.data.rows.length} catalog row${parsed.data.rows.length===1?'':'s'}.`})
 }catch(error){return NextResponse.json({error:error instanceof Error?error.message:'Catalog import failed'},{status:500})}
}

export async function PATCH(req:NextRequest){
 try{
  const auth=await admin(req);if(!auth)return NextResponse.json({error:'Super admin access required'},{status:403})
  const parsed=updateInput.safeParse(await req.json());if(!parsed.success)return NextResponse.json({error:parsed.error.issues[0].message},{status:400})
  for(const update of parsed.data.updates){const {id,...values}=update;const {error}=await auth.db.from('model_repair_prices').update(values).eq('id',id);if(error)throw error}
  return NextResponse.json({message:`Updated ${parsed.data.updates.length} price row${parsed.data.updates.length===1?'':'s'}.`})
 }catch(error){return NextResponse.json({error:error instanceof Error?error.message:'Catalog update failed'},{status:500})}
}
