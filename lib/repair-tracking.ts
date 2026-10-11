import {steps} from './constants'

export type BookingEvent={
 id:string
 booking_id:string
 kind:string
 description:string
 created_at:string
}

export function sortBookingEvents(events:readonly BookingEvent[]):BookingEvent[]{
 return [...events].sort((a,b)=>{
  const timeA=Date.parse(a.created_at),timeB=Date.parse(b.created_at)
  if(Number.isFinite(timeA)&&Number.isFinite(timeB)&&timeA!==timeB)return timeA-timeB
  if(Number.isFinite(timeA)!==Number.isFinite(timeB))return Number.isFinite(timeA)?-1:1
  return a.id.localeCompare(b.id)
 })
}

export function formatTrackingTimestamp(value:string):string{
 const date=new Date(value)
 if(!Number.isFinite(date.getTime()))return 'Time unavailable'
 return new Intl.DateTimeFormat('en-IN',{
  day:'numeric',
  month:'short',
  year:'numeric',
  hour:'numeric',
  minute:'2-digit'
 }).format(date)
}

export function trackingStage(status:string,events:readonly BookingEvent[]):string|null{
 if((steps as readonly string[]).includes(status))return status
 const related:Record<string,string>={
  QUOTE_REJECTED:'QUOTE_SENT',
  RETURN_WITHOUT_REPAIR:'QUOTE_SENT',
  PARTS_DELAYED:'REPAIRING',
  WARRANTY_REOPENED:'DELIVERED'
 }
 if(related[status])return related[status]
 return sortBookingEvents(events).reverse().find(event=>(steps as readonly string[]).includes(event.kind))?.kind||null
}
