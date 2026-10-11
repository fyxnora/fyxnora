'use client'
import {useEffect,useState} from 'react'
import {MessageCircle,X} from 'lucide-react'

type Settings={whatsapp_number:string;whatsapp_message:string}
export default function WhatsAppChat(){const [settings,setSettings]=useState<Settings|null>(null),[open,setOpen]=useState(false);useEffect(()=>{fetch('/api/site-settings').then(r=>r.json()).then(setSettings).catch(()=>{})},[]);if(!settings?.whatsapp_number)return null;const number=settings.whatsapp_number.replace(/\D/g,''),url=`https://wa.me/${number}?text=${encodeURIComponent(settings.whatsapp_message)}`;return <div className="whatsapp-widget">{open&&<div className="whatsapp-popover"><header><span><MessageCircle/><b>Fyxnora Support</b></span><button aria-label="Close WhatsApp chat" onClick={()=>setOpen(false)}><X/></button></header><p>Hi! How can we help with your device today?</p><a href={url} target="_blank" rel="noreferrer">Start WhatsApp chat</a></div>}<button className="whatsapp-button" aria-label="Chat with Fyxnora on WhatsApp" onClick={()=>setOpen(value=>!value)}><MessageCircle/></button></div>}
