'use client'

import Link from 'next/link'
import {useParams} from 'next/navigation'
import {ArrowLeft,CalendarDays,Clock3,MapPin,PackageCheck,ShieldCheck} from 'lucide-react'
import {Action,usePortal,Notice,Shell} from '@/components/Portal'
import {formatTrackingTimestamp,sortBookingEvents,trackingStage} from '@/lib/repair-tracking'
import {pretty,money,steps,sections} from '@/lib/constants'
import type {BookingEvent} from '@/lib/repair-tracking'

const exceptionStatuses=['QUOTE_REJECTED','RETURN_WITHOUT_REPAIR','PARTS_DELAYED','CUSTOMER_UNREACHABLE','DISPUTED','LOST_OR_DAMAGED','WARRANTY_REOPENED']

export default function Page(){
 const params=useParams<{id:string}>()
 const {profile,orders,events,loading,error,reload}=usePortal()
 const booking=orders.find(order=>order.id===params.id)
 const bookingEvents=sortBookingEvents(events.filter(event=>event.booking_id===params.id))
 const stage=booking?trackingStage(booking.status,bookingEvents):null
 const currentIndex=stage?steps.indexOf(stage as typeof steps[number]):-1
 const eventByStage=new Map<string,BookingEvent>()
 for(const event of bookingEvents){
  if((steps as readonly string[]).includes(event.kind))eventByStage.set(event.kind,event)
 }
 const dashboardHref=sections.find(section=>section.role===profile?.role)?.href||'/dashboard'
 const returnHref=profile?.role==='customer'?`${dashboardHref}#repairs`:`${dashboardHref}#${profile?.role==='admin'?'orders':'jobs'}`

 return <Shell role={profile?.role||'customer'}>
  <div className="tracking-dashboard" id="tracking">
   <div className="tracking-header">
    <div>
     <span className="tracking-eyebrow">Repair tracking</span>
     <h1>Your repair, clearly tracked.</h1>
     <p>See the latest status, important milestones and the full service history.</p>
    </div>
    <Link className="tracking-back" href={returnHref}><ArrowLeft size={16}/> All requests</Link>
   </div>

   <Notice loading={loading} error={error}/>
   {!loading&&!booking&&<div className="alert">This order is not available to your account.</div>}

   {booking&&<>
    <section className="tracking-hero">
     <div>
      <span className="tracking-reference">{booking.reference}</span>
      <h2>{pretty(booking.status)}</h2>
      <p>{booking.brand} {booking.model} <span aria-hidden="true">·</span> {booking.category}</p>
     </div>
     <div className="tracking-last-update">
      <Clock3 size={17}/>
      <span><small>Last updated</small><time dateTime={booking.updated_at}>{formatTrackingTimestamp(booking.updated_at)}</time></span>
     </div>
    </section>

    {exceptionStatuses.includes(booking.status)&&<div className={`tracking-state-note${['DISPUTED','LOST_OR_DAMAGED'].includes(booking.status)?' attention':''}`}>
     <ShieldCheck size={18}/>
     <span><strong>{pretty(booking.status)}</strong><br/>{booking.status==='PARTS_DELAYED'?'The repair is paused while required parts are sourced.':booking.status==='QUOTE_REJECTED'?'The quotation was declined. The service team will confirm the next step.':booking.status==='RETURN_WITHOUT_REPAIR'?'The device is being returned without repair.':booking.status==='WARRANTY_REOPENED'?'A warranty follow-up has reopened this repair.':'The service team is reviewing this update.'}</span>
    </div>}

    <section className="tracking-facts" aria-label="Repair details">
     <div><PackageCheck/><span><small>Device</small><strong>{booking.brand} {booking.model}</strong></span></div>
     <div><CalendarDays/><span><small>Requested pickup</small><strong>{booking.preferred_date?new Date(`${booking.preferred_date}T00:00:00`).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'}):'To be scheduled'}</strong></span></div>
     <div><MapPin/><span><small>Service location</small><strong>{[booking.city,booking.state,booking.country,booking.pincode].filter(Boolean).join(', ')}</strong></span></div>
    </section>

    <div className="tracking-content">
     <section className="tracking-panel">
      <div className="tracking-panel-heading"><div><span>Live progress</span><h2>Repair milestones</h2></div><span className="tracking-count">{bookingEvents.length} updates</span></div>
      {currentIndex>=0&&<div className="tracking-progress"><span style={{width:`${Math.max(4,((currentIndex+1)/steps.length)*100)}%`}}/></div>}
      <ol className="tracking-milestones">
       {steps.map((step,index)=>{
        const event=eventByStage.get(step)
        const isComplete=index<currentIndex||booking.status==='CLOSED'&&index<=currentIndex
        const isCurrent=index===currentIndex
        const timestamp=event?.created_at||(step==='BOOKED'?booking.created_at:isCurrent?booking.updated_at:null)
        return <li key={step} className={`tracking-milestone${isComplete?' complete':''}${isCurrent?' current':''}`}>
         <span className="milestone-marker">{isComplete?'✓':index+1}</span>
         <div className="milestone-copy"><strong>{pretty(step)}</strong><span>{isCurrent?'Current stage':isComplete?'Completed':'Upcoming'}</span></div>
         {timestamp&&<time dateTime={timestamp}>{formatTrackingTimestamp(timestamp)}</time>}
        </li>
       })}
      </ol>
     </section>

     <aside className="tracking-side">
      <section className="tracking-panel service-summary">
       <div className="tracking-panel-heading"><div><span>Service summary</span><h2>Repair details</h2></div></div>
       <dl>
        <dt>Order reference</dt><dd>{booking.reference}</dd>
        <dt>Reported issue</dt><dd>{booking.issue}</dd>
        <dt>Estimated cost</dt><dd>{booking.estimated_amount!=null?money(booking.estimated_amount):'Pending'}</dd>
        <dt>Final quotation</dt><dd>{booking.quoted_amount!=null?money(booking.quoted_amount):'Awaiting diagnosis'}</dd>
       </dl>
       {booking.quote_details&&<div className="tracking-quote"><strong>Diagnosis &amp; quotation</strong><p>{booking.quote_details}</p></div>}
       {profile?.role==='customer'&&booking.status==='QUOTE_SENT'&&<Action booking={booking} actions={['approve_quote','reject_quote']} onDone={reload}/>}
       {profile?.role==='customer'&&booking.status==='DELIVERED'&&<Action booking={booking} actions={['close_order']} onDone={reload}/>}
      </section>
     </aside>
    </div>

    <section className="tracking-panel tracking-activity">
     <div className="tracking-panel-heading"><div><span>Every handover, in order</span><h2>Activity history</h2></div></div>
     {bookingEvents.length? <ol className="activity-list">{[...bookingEvents].reverse().map((event,index)=><li key={event.id||`${event.kind}-${event.created_at}-${index}`}>
      <span className="activity-dot"/>
      <div><strong>{pretty(event.kind)}</strong><p>{event.description||'Repair status updated.'}</p></div>
      <time dateTime={event.created_at}>{formatTrackingTimestamp(event.created_at)}</time>
     </li>)}</ol>:<div className="tracking-empty"><Clock3/><div><strong>Booking received</strong><p>{formatTrackingTimestamp(booking.created_at)} · Your service timeline will appear here as the repair progresses.</p></div></div>}
    </section>
   </>}
  </div>
 </Shell>
}
