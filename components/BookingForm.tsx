'use client'

import {useEffect,useMemo,useState} from 'react'
import {useRouter} from 'next/navigation'
import Link from 'next/link'
import {LocateFixed,MapPin} from 'lucide-react'
import {authedFetch,supabase} from '@/lib/client'
import {money} from '@/lib/constants'
import DeviceArtwork from '@/components/DeviceArtwork'

type Item={id:string;name:string;image_url?:string|null;[key:string]:unknown}
type Price={id:string;model_id:string;repair_service_id:string;price:number;discount_price:number|null;doorstep_available:boolean}
type Catalog={categories:Item[];brands:(Item&{category_id:string})[];models:(Item&{brand_id:string;model_code?:string})[];services:(Item&{description:string;default_duration_minutes:number;default_warranty_months:number})[];prices:Price[]}
type LocationSuggestion={label:string;street:string;area:string;city:string;state:string;country:string;pincode:string;latitude:number;longitude:number}
type LocationProperties={name?:string;housenumber?:string;street?:string;suburb?:string;neighbourhood?:string;city?:string;town?:string;village?:string;district?:string;state?:string;country?:string;postcode?:string}
type LocationFeature={geometry:{coordinates:[number,number]};properties:LocationProperties}
type LocationResponse={features?:LocationFeature[]}
type PostOffice={Name:string;District:string;State:string;Country:string;Block?:string}
type PincodeResponse={Status:string;PostOffice?:PostOffice[]|null}
type AddressForm={categoryId:string;brandId:string;modelId:string;serviceIds:string[];notes:string;area:string;city:string;state:string;country:string;pincode:string;address:string;preferred_date:string;phone:string;consent:boolean;latitude:number|null;longitude:number|null}
type Draft={form:AddressForm;step:number}
const initialForm:AddressForm={categoryId:'',brandId:'',modelId:'',serviceIds:[],notes:'',area:'',city:'',state:'',country:'',pincode:'',address:'',preferred_date:'',phone:'',consent:false,latitude:null,longitude:null}
const labels=['Device type','Brand','Model','Repair services','Pickup']

function makeSuggestion(feature:LocationFeature):LocationSuggestion{
 const properties=feature.properties
 const street=[properties.housenumber,properties.street||properties.name].filter(Boolean).join(' ')
 const city=properties.city||properties.town||properties.village||properties.district||''
 const label=[street,properties.suburb,city,properties.state,properties.postcode,properties.country].filter(Boolean).join(', ')
 return {label,street,area:properties.suburb||properties.neighbourhood||properties.village||properties.town||properties.city||'',city,state:properties.state||'',country:properties.country||'',pincode:properties.postcode||'',latitude:feature.geometry.coordinates[1],longitude:feature.geometry.coordinates[0]}
}

export default function BookingForm(){
 const [catalog,setCatalog]=useState<Catalog>({categories:[],brands:[],models:[],services:[],prices:[]})
 const [step,setStep]=useState(0)
 const [busy,setBusy]=useState(false)
 const [message,setMessage]=useState('')
 const [pinMessage,setPinMessage]=useState('')
 const [pinBusy,setPinBusy]=useState(false)
 const [pinAreas,setPinAreas]=useState<string[]>([])
 const [locating,setLocating]=useState(false)
 const [locationPinned,setLocationPinned]=useState(false)
 const [form,setForm]=useState<AddressForm>(initialForm)
 const router=useRouter()

 useEffect(()=>{
  fetch('/api/catalog').then(async response=>{const data=await response.json();if(!response.ok||data.error)throw Error(data.error||'Unable to load the repair catalog');setCatalog(data);const requestedCategory=new URLSearchParams(window.location.search).get('category');if(requestedCategory){const match=data.categories.find((item:Item)=>item.name.toLowerCase()===requestedCategory.toLowerCase());if(match){setForm(current=>current.categoryId?current:{...current,categoryId:match.id});setStep(current=>current===0?1:current)}}}).catch(error=>setMessage(error instanceof Error?error.message:'Unable to load the repair catalog'))
  try{
   const raw=sessionStorage.getItem('fyxnora-booking-draft')
   if(raw){const draft=JSON.parse(raw) as Draft;if(draft.form&&draft.step===4){setForm({...initialForm,...draft.form});setLocationPinned(draft.form.latitude!=null&&draft.form.longitude!=null);setStep(4)}}
  }catch(error){console.error('Unable to restore booking draft',error);sessionStorage.removeItem('fyxnora-booking-draft')}
 },[])

 const category=catalog.categories.find(item=>item.id===form.categoryId)
 const brand=catalog.brands.find(item=>item.id===form.brandId)
 const model=catalog.models.find(item=>item.id===form.modelId)
 const brands=catalog.brands.filter(item=>item.category_id===form.categoryId)
 const models=catalog.models.filter(item=>item.brand_id===form.brandId)
 const prices=catalog.prices.filter(item=>item.model_id===form.modelId)
 const available=catalog.services.filter(service=>prices.some(price=>price.repair_service_id===service.id))
 const selected=useMemo(()=>prices.filter(price=>form.serviceIds.includes(price.repair_service_id)),[prices,form.serviceIds])
 const estimate=selected.reduce((sum,price)=>sum+Number(price.discount_price??price.price),0)

 function patch(values:Partial<AddressForm>){setForm(current=>({...current,...values}));setMessage('')}
 function chooseService(id:string){patch({serviceIds:form.serviceIds.includes(id)?form.serviceIds.filter(value=>value!==id):[...form.serviceIds,id]})}

 useEffect(()=>{
  if(locationPinned||form.pincode.length!==6||!/^[1-9][0-9]{5}$/.test(form.pincode)){
   setPinBusy(false)
   setPinAreas([])
   if(!locationPinned)setPinMessage('')
   return
  }
  const pincode=form.pincode
  const controller=new AbortController()
  setPinBusy(true)
  setPinMessage('Finding area, city and state…')
  fetch(`https://api.postalpincode.in/pincode/${pincode}`,{signal:controller.signal})
   .then(async response=>{
    if(!response.ok)throw Error('PIN code lookup is temporarily unavailable. Enter your area, city, state and country manually.')
    const result=await response.json() as PincodeResponse[]
    const offices=(result[0]?.PostOffice||[])
     .filter(office=>office.Name?.trim()&&office.District?.trim()&&office.State?.trim()&&office.Country?.trim())
     .map(office=>({...office,Name:office.Name.trim(),District:office.District.trim(),State:office.State.trim(),Country:office.Country.trim()}))
    const office=offices[0]
    if(result[0]?.Status!=='Success'||!office){
     setPinMessage('No address details found for this PIN code. Enter the area, city, state and country manually.')
     return
    }
    setForm(current=>current.pincode===pincode&&!locationPinned?{
     ...current,
     area:office.Name,
     city:office.District,
     state:office.State,
     country:office.Country
    }:current)
    const otherAreas=[...new Set(offices.map(item=>item.Name))]
    setPinAreas(otherAreas)
    setPinMessage(otherAreas.length>1?`Location filled. Select the correct area from ${otherAreas.length} post offices if needed.`:'Area, city, state and country filled from PIN code.')
   })
   .catch(error=>{if(error instanceof Error&&error.name!=='AbortError')setPinMessage(error.message)})
   .finally(()=>{if(!controller.signal.aborted)setPinBusy(false)})
  return ()=>controller.abort()
 },[form.pincode,locationPinned])

 async function useCurrentLocation(){
  if(!navigator.geolocation){setMessage('Location is not supported by this browser. Enter your address manually.');return}
  setLocating(true);setMessage('')
  try{
   const position=await new Promise<GeolocationPosition>((resolve,reject)=>navigator.geolocation.getCurrentPosition(resolve,reject,{enableHighAccuracy:true,timeout:15000,maximumAge:60000}))
   const {latitude,longitude}=position.coords
   const response=await fetch(`https://photon.komoot.io/reverse?lat=${latitude}&lon=${longitude}&lang=en`)
   if(!response.ok)throw Error('Could not look up this location. Enter the address manually.')
   const data=await response.json() as LocationResponse
   const suggestion=data.features?.[0]?makeSuggestion(data.features[0]):null
   if(!suggestion)throw Error('No address was found for your current location. Enter the address manually.')
   if(!suggestion.street||!suggestion.area||!suggestion.city||!suggestion.state||!suggestion.country||!/^[1-9][0-9]{5}$/.test(suggestion.pincode)||suggestion.label.length<10)
    throw Error('A complete pickup address could not be confirmed from your location. Choose manual entry instead.')
   patch({address:suggestion.label,area:suggestion.area,city:suggestion.city,state:suggestion.state,country:suggestion.country,pincode:suggestion.pincode,latitude,longitude})
   setLocationPinned(true)
   setMessage('Live location pinned. The detected pickup address is locked for this booking.')
  }catch(error){
   const locationError=typeof error==='object'&&error!==null&&'code'in error?error as {code:number}:null
   setMessage(locationError?locationError.code===1?'Location permission was denied. Enter the address manually.':'Could not get your location. Enter the address manually.':error instanceof Error?error.message:'Unable to get current location.')
  }finally{setLocating(false)}
 }

 function chooseManualAddress(){
  setLocationPinned(false)
  patch({address:'',area:'',city:'',state:'',country:'',pincode:'',latitude:null,longitude:null})
 }

 async function continueToPickup(){
  setMessage('')
  try{
   const {data:{session}}=await supabase().auth.getSession()
   if(session){setStep(4);return}
   sessionStorage.setItem('fyxnora-booking-draft',JSON.stringify({form,step:4} satisfies Draft))
   setStep(5)
  }catch(error){setMessage(error instanceof Error?error.message:'Unable to check your sign-in status')}
 }

 async function submit(event:React.FormEvent){
  event.preventDefault()
  if(!category||!brand||!model)return
  setBusy(true)
  try{
   const names=catalog.services.filter(service=>form.serviceIds.includes(service.id)).map(service=>service.name)
   const result=await authedFetch('/api/action',{action:'create_booking',category:category.name,brand:brand.name,model:model.name,model_id:model.id,repair_service_ids:form.serviceIds,issue:[names.join(', '),form.notes].filter(Boolean).join(' — '),estimated_amount:estimate,...form,address:[form.area,form.address].filter(Boolean).join(', ')})
   sessionStorage.removeItem('fyxnora-booking-draft')
   router.push('/dashboard/'+result.booking.id)
  }catch(error){
   const detail=error instanceof Error?error.message:'Unable to create booking'
   if(/log in|unauthorized/i.test(detail)){sessionStorage.setItem('fyxnora-booking-draft',JSON.stringify({form,step:4} satisfies Draft));setStep(5);setMessage('Please sign in or create an account to submit this repair. Your booking details are saved on this device.')}
   else setMessage(detail)
  }finally{setBusy(false)}
 }

 return <main className="shell booking-shell">
  <div className="booking-heading"><div className="eyebrow">Book a repair</div><h1>What can we fix for you today?</h1><p className="muted">Choose your exact device and repair. You&apos;ll see an estimated price before booking.</p></div>
  <div className="booking-progress booking-progress-five">{labels.map((label,index)=><div key={label} className={`booking-progress-step${index<=Math.min(step,4)?' current':''}`}><span>{index+1}</span>{label}</div>)}</div>
  <form className="card booking-card" onSubmit={submit}>
   {step===0&&<><div className="eyebrow">Step 1 of 5</div><h2>Select device type</h2><div className="device-choice-grid category-grid">{catalog.categories.map(item=><button type="button" className={`device-choice${form.categoryId===item.id?' selected':''}`} key={item.id} onClick={()=>{patch({categoryId:item.id,brandId:'',modelId:'',serviceIds:[]});setStep(1)}}><DeviceArtwork category={item.name}/><strong>{item.name}</strong><span className="choice-indicator">Choose →</span></button>)}</div>{!catalog.categories.length&&!message&&<p>Loading catalog…</p>}{!catalog.categories.length&&message&&<p className="alert">{message}</p>}</>}
   {step===1&&<><div className="eyebrow">Step 2 of 5 · {category?.name}</div><h2>Select a brand</h2><div className="selection-grid">{brands.map(item=><button type="button" key={item.id} onClick={()=>{patch({brandId:item.id,modelId:'',serviceIds:[]});setStep(2)}}><DeviceArtwork category={category?.name||'Mobile'} brand={item.name}/><strong>{item.name}</strong></button>)}</div><button type="button" className="button secondary" onClick={()=>setStep(0)}>← Back</button></>}
   {step===2&&<><div className="eyebrow">Step 3 of 5 · {brand?.name}</div><h2>Select your model</h2><div className="selection-grid">{models.map(item=><button type="button" key={item.id} onClick={()=>{patch({modelId:item.id,serviceIds:[]});setStep(3)}}><DeviceArtwork category={category?.name||'Mobile'} brand={brand?.name} model={item.name} imageUrl={item.image_url}/><strong>{item.name}</strong></button>)}</div><button type="button" className="button secondary" onClick={()=>setStep(1)}>← Back</button></>}
   {step===3&&<><div className="eyebrow">Step 4 of 5 · {brand?.name} {model?.name}</div><h2>What needs repair?</h2><p className="muted">Select one or more services. Prices are confirmed after inspection.</p><div className="repair-grid">{available.map(service=>{const price=prices.find(item=>item.repair_service_id===service.id)!;return <button type="button" className={form.serviceIds.includes(service.id)?'selected':''} key={service.id} onClick={()=>chooseService(service.id)}><span className="repair-check">{form.serviceIds.includes(service.id)?'✓':'+'}</span><span><strong>{service.name}</strong><small>{service.description}</small><small>{price.doorstep_available?'Doorstep':'Pickup'} · {service.default_duration_minutes} min · {service.default_warranty_months} mo warranty</small></span><b>{money(Number(price.discount_price??price.price))}</b></button>})}</div>{!available.length&&<p className="alert">No priced repair services have been added for this model yet.</p>}<label className="field">Anything else? (optional)<textarea className="input" rows={3} value={form.notes} onChange={event=>patch({notes:event.target.value})}/></label><div className="estimate-bar"><span>Estimated repair cost</span><strong>{money(estimate)}</strong></div><div className="booking-actions"><button type="button" className="button secondary" onClick={()=>setStep(2)}>← Back</button><button type="button" className="button" disabled={!form.serviceIds.length} onClick={continueToPickup}>Continue →</button></div></>}
   {step===4&&<><div className="eyebrow">Step 5 of 5 · Pickup details</div><h2>Book your repair</h2><div className="booking-summary"><strong>{category?.name} · {brand?.name} {model?.name}</strong><span>Estimated total: <b>{money(estimate)}</b></span></div>
    <div className="booking-address-grid">
     <label className="field">Mobile number<input className="input" required type="tel" inputMode="numeric" autoComplete="tel-national" pattern="[6-9][0-9]{9}" maxLength={10} value={form.phone} onChange={event=>patch({phone:event.target.value.replace(/\D/g,'')})}/></label>
     <label className="field">PIN code<input className="input" required inputMode="numeric" autoComplete="off" pattern="[1-9][0-9]{5}" maxLength={6} readOnly={locationPinned} value={form.pincode} onChange={event=>patch({pincode:event.target.value.replace(/\D/g,''),area:'',city:'',state:'',country:''})}/>{pinBusy&&<small className="smalltext" role="status">{pinMessage}</small>}{!pinBusy&&pinMessage&&<small className="smalltext" role="status">{pinMessage}</small>}</label>
     <label className="field">Area / locality<input className="input" required autoComplete="off" list={pinAreas.length>1?'booking-pin-areas':undefined} readOnly={locationPinned} value={form.area} onChange={event=>patch({area:event.target.value})}/>{pinAreas.length>1&&<datalist id="booking-pin-areas">{pinAreas.map(area=><option key={area} value={area}/>)}</datalist>}</label>
     <label className="field">City<input className="input" required autoComplete="off" readOnly={locationPinned} value={form.city} onChange={event=>patch({city:event.target.value})}/></label>
     <label className="field">State / province<input className="input" required autoComplete="off" readOnly={locationPinned} value={form.state} onChange={event=>patch({state:event.target.value})}/></label>
     <label className="field">Country<input className="input" required autoComplete="off" readOnly={locationPinned} value={form.country} onChange={event=>patch({country:event.target.value})}/></label>
     <label className="field">Preferred date<input className="input" required type="date" min={new Date().toLocaleDateString('en-CA')} value={form.preferred_date} onChange={event=>patch({preferred_date:event.target.value})}/></label>
    </div>
    <div className="address-entry-heading"><span>Pickup address</span><label className="location-mode-toggle"><input type="checkbox" checked={locationPinned||locating} disabled={locating} onChange={event=>{if(event.target.checked)void useCurrentLocation();else chooseManualAddress()}}/><LocateFixed size={16}/>{locating?'Getting live location…':'Use live location pin'}</label></div>
    {locationPinned?<div className="pinned-address-card"><MapPin size={18}/><div><strong>Live location pinned</strong><p>{form.address}</p><small>Pickup address details are locked. Uncheck “Use live location pin” to enter an address manually.</small></div></div>:<label className="field address-search-field"><span className="visually-hidden">Enter full pickup address</span><textarea className="input" required minLength={10} rows={3} autoComplete="off" value={form.address} onChange={event=>patch({address:event.target.value})} placeholder="Enter house, street and area manually"/></label>}
    {locationPinned&&form.latitude!=null&&form.longitude!=null&&<a className="selected-location-link" href={`https://www.openstreetmap.org/?mlat=${form.latitude}&mlon=${form.longitude}#map=17/${form.latitude}/${form.longitude}`} target="_blank" rel="noreferrer"><MapPin size={14}/> View pinned location</a>}
    <p className="address-privacy-note">{locationPinned?'The location pin and address were detected using your browser location and OpenStreetMap.':'Entering a PIN code fills the area, city, state and country. Enter your house, building and street address manually; no address search is used.'}</p>
    <label className="booking-consent"><input type="checkbox" required checked={form.consent} onChange={event=>patch({consent:event.target.checked})}/> I agree to be contacted. Final price is confirmed before work begins.</label>
    <div className="booking-actions"><button type="button" className="button secondary" onClick={()=>setStep(3)}>← Back</button><button className="button" disabled={busy}>{busy?'Booking…':'Book repair →'}</button></div>
   </>}
   {step===5&&<><div className="eyebrow">Sign-in required</div><h2>Create an account or sign in to continue</h2><p className="muted">Your selected device and repair have been saved. Once signed in, add pickup details and submit your request.</p><div className="booking-summary"><strong>{category?.name} · {brand?.name} {model?.name}</strong><span>{form.serviceIds.length} repair service{form.serviceIds.length===1?'':'s'} selected · {money(estimate)}</span></div><div className="booking-actions"><button type="button" className="button secondary" onClick={()=>setStep(3)}>← Back to repairs</button><div className="booking-auth-actions"><Link className="button secondary" href="/login?next=%2Fbook">Sign in</Link><Link className="button" href="/register?next=%2Fbook">Create account</Link></div></div></>}
   {message&&step!==0&&<p className="alert" role="alert">{message}</p>}
  </form>
 </main>
}
