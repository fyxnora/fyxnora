'use client'

import Link from 'next/link'
import {ArrowRight,CalendarDays,ChevronRight,Clock3,FileText,Headphones,Home,LifeBuoy,MapPin,PackageCheck,Plus,ShieldCheck,Sparkles,UserRound,WalletCards,Wrench} from 'lucide-react'
import {Notice,usePortal} from '@/components/Portal'
import {money,pretty,steps} from '@/lib/constants'
import {formatTrackingTimestamp,sortBookingEvents,trackingStage} from '@/lib/repair-tracking'

const finishedStatuses=['CLOSED','DELIVERED','QUOTE_REJECTED','RETURN_WITHOUT_REPAIR']
function statusTone(status:string){
 if(['DELIVERED','CLOSED'].includes(status)) return 'complete'
 if(['QUOTE_SENT','CUSTOMER_APPROVED'].includes(status)) return 'attention'
 if(['DISPUTED','LOST_OR_DAMAGED','CUSTOMER_UNREACHABLE'].includes(status)) return 'danger'
 return 'active'
}

export default function Page(){
 const {profile,orders,events,loading,error}=usePortal('customer')
 const active=orders.filter(order=>!finishedStatuses.includes(order.status))
 const awaiting=orders.filter(order=>order.status==='QUOTE_SENT')
 const completed=orders.filter(order=>['DELIVERED','CLOSED'].includes(order.status))

 return <main className="customer-portal"><div className="shell customer-dashboard-shell">
  <aside className="customer-side-nav">
   <div className="customer-side-brand" role="img" aria-label="Fyxnora"/>
   <p className="customer-nav-label">Workspace</p>
   <nav aria-label="Customer dashboard navigation">
    <a className="active" href="#overview"><Home/><span>Overview</span></a>
    <a href="#repairs"><Wrench/><span>My repairs</span>{active.length>0&&<em>{active.length}</em>}</a>
    <Link href="/book"><Plus/><span>Book repair</span></Link>
    <button onClick={()=>document.querySelector<HTMLButtonElement>('[aria-label="Open account settings"]')?.click()}><UserRound/><span>My profile</span></button>
    <a href="mailto:support@fyxnora.com"><LifeBuoy/><span>Help & support</span></a>
   </nav>
   <div className="customer-trust"><ShieldCheck/><div><b>Service protected</b><span>Secure handovers and transparent updates at every step.</span></div></div>
  </aside>

  <div className="customer-dashboard-main" id="overview">
   <section className="customer-head"><div className="customer-welcome"><span><Sparkles/> Customer dashboard</span><h1>Welcome back, {profile?.full_name?.split(' ')[0]||'there'}</h1><p>Manage your repairs, approvals and service history from one place.</p></div><Link className="button customer-book-button" href="/book"><Plus/> Book a repair</Link></section>
   <Notice loading={loading} error={error}/>
   {profile&&<>
    {awaiting.length>0&&<section className="customer-action-banner"><div className="action-banner-icon"><WalletCards/></div><div><small>Action required</small><h2>{awaiting.length===1?'A quotation is ready for your approval':`${awaiting.length} quotations are ready for approval`}</h2><p>Review the diagnosis and estimate to keep your repair moving.</p></div><Link href={`/dashboard/${awaiting[0].id}`}>Review quotation <ArrowRight/></Link></section>}

    <section className="customer-stats" aria-label="Repair summary">
     <div className="stat-blue"><span className="customer-stat-icon"><PackageCheck/></span><span><small>Total repairs</small><b>{orders.length}</b><em>All service requests</em></span></div>
     <div className="stat-purple"><span className="customer-stat-icon"><Wrench/></span><span><small>In progress</small><b>{active.length}</b><em>Currently active</em></span></div>
     <div className="stat-amber"><span className="customer-stat-icon"><Clock3/></span><span><small>Needs approval</small><b>{awaiting.length}</b><em>Waiting for you</em></span></div>
     <div className="stat-green"><span className="customer-stat-icon"><ShieldCheck/></span><span><small>Completed</small><b>{completed.length}</b><em>Successfully delivered</em></span></div>
    </section>

    <div className="customer-layout">
     <section id="repairs" className="customer-repairs-panel">
      <div className="section-heading"><div><span>Repair activity</span><h2>My repair requests</h2><p>Track progress, review quotations and access service records.</p></div><Link href="/book" className="customer-text-link">New repair <Plus/></Link></div>
      {orders.length===0?<div className="customer-empty"><span><Wrench/></span><h3>Your repair journey starts here</h3><p>Select a device, choose the issue and receive an upfront estimate.</p><Link className="button" href="/book">Book your first repair <ArrowRight/></Link></div>:
       <div className="customer-orders">{orders.map((order,index)=>{
        const orderEvents=sortBookingEvents(events.filter(event=>event.booking_id===order.id))
        const lastEvent=orderEvents.at(-1)
        const stage=trackingStage(order.status,orderEvents)
        const current=stage?steps.indexOf(stage as typeof steps[number]):0
        const progress=Math.max(5,Math.min(100,((current+1)/steps.length)*100))
        const updated=lastEvent?.created_at||order.updated_at||order.created_at
        return <Link href={`/dashboard/${order.id}`} className={`customer-order ${index===0?'is-latest':''}`} key={order.id}>
         {index===0&&<div className="latest-ribbon">Latest repair</div>}
         <div className="order-top"><div className="order-device-icon">{order.category?.slice(0,1)||'D'}</div><div className="order-device"><span>{order.reference}</span><h3>{order.brand} {order.model}</h3><p>{order.category} · {order.issue}</p></div><b className={`customer-status ${statusTone(order.status)}`}><i/>{pretty(order.status)}</b></div>
         <div className="order-progress-copy"><span>Repair progress</span><b>{Math.round(progress)}%</b></div>
         <div className="order-progress" role="progressbar" aria-label="Repair progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress)}><span style={{width:`${progress}%`}}/></div>
         <div className="order-finance"><div><small>Estimate</small><b>{order.quoted_amount!=null?money(order.quoted_amount):order.estimated_amount!=null?money(order.estimated_amount):'Being prepared'}</b></div><div><small>Preferred date</small><b><CalendarDays/>{order.preferred_date?new Date(`${order.preferred_date}T00:00:00`).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'}):'Scheduling'}</b></div><div><small>Service location</small><b><MapPin/>{order.city}</b></div></div>
         <div className="order-update"><Clock3/><span><b>{lastEvent?pretty(lastEvent.kind):'Booking received'}</b><time dateTime={updated}>{formatTrackingTimestamp(updated)}</time></span><strong>Open repair <ChevronRight/></strong></div>
        </Link>
       })}</div>}
     </section>

     <aside className="customer-right-rail">
      <div className="customer-profile-card"><div className="profile-card-top"><div className="profile-monogram">{profile.full_name?.slice(0,1).toUpperCase()}</div><button aria-label="Edit profile" onClick={()=>document.querySelector<HTMLButtonElement>('[aria-label="Open account settings"]')?.click()}>Edit</button></div><h3>{profile.full_name}</h3><p>{profile.email}</p><span><UserRound/> Verified customer</span><dl><div><dt>Phone</dt><dd>{profile.phone||'Not added'}</dd></div><div><dt>Active repairs</dt><dd>{active.length}</dd></div></dl></div>
      <div className="customer-quick-card"><div className="rail-card-title"><span>Quick actions</span><b>Self service</b></div><Link href="/book"><span><Plus/></span><div><b>Book a new repair</b><small>Get an instant estimate</small></div><ChevronRight/></Link><button onClick={()=>document.querySelector<HTMLButtonElement>('[aria-label="Open account settings"]')?.click()}><span><UserRound/></span><div><b>Update your profile</b><small>Contact and account details</small></div><ChevronRight/></button><a href="mailto:support@fyxnora.com"><span><Headphones/></span><div><b>Contact support</b><small>We are ready to help</small></div><ChevronRight/></a></div>
      <div className="customer-help"><ShieldCheck/><div><h3>Protected at every step</h3><p>Diagnosis, approvals, payments, warranty and handovers stay recorded in your digital service card.</p></div></div>
      <div className="customer-doc-card"><FileText/><div><b>Service documents</b><span>Invoices and warranties appear inside completed repairs.</span></div></div>
     </aside>
    </div>
   </>}
  </div>
 </div></main>
}
