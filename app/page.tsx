import Link from 'next/link'
import {ArrowRight,CheckCircle2,Clock3,ShieldCheck,Sparkles,Star} from 'lucide-react'
import DeviceArtwork from '@/components/DeviceArtwork'

const services=[['Mobile','Screens, batteries, charging and more'],['Tablet','Display, battery and board repair'],['Laptop','Screen, keyboard and motherboard'],['Smart Watch','Display, battery and sensor repair'],['AirPods','Battery, charging and audio repair'],['Desktop','Hardware, upgrades and diagnosis']]

function ArchitectureBackdrop(){return <div className="architecture-backdrop" aria-hidden="true"><span className="architecture-frame"/><span className="architecture-building"/><span className="architecture-route"/></div>}

export default function Home(){
 return <main>
  <section className="public-hero architecture-scene">
   <ArchitectureBackdrop/>
   <div className="shell hero">
    <div className="hero-copy">
     <div className="eyebrow"><Sparkles/> TRUSTED DOORSTEP DEVICE REPAIR</div>
     <h1>Expert gadget repair.<br/><span className="gradient">Without the<span className="hero-mobile-break"> </span> guesswork.</span></h1>
     <p>Choose your device, see a clear estimate and track every step from doorstep pickup to safe delivery.</p>
     <div className="actions hero-actions">
      <Link className="button" href="#services">Book a repair <ArrowRight/></Link>
      <Link className="button secondary" href="/dashboard">Track my repair</Link>
     </div>
     <div className="hero-proof"><div><span className="proof-icons"><ShieldCheck/><CheckCircle2/><Star/></span><p><b>Transparent and accountable</b><small>Digital records for every repair milestone</small></p></div></div>
    </div>
    <div className="hero-art">
     <div className="hero-art-badge"><span><Clock3/></span><div><b>Live repair tracking</b><small>Updates at every stage</small></div></div>
     <div className="hero-device-stage"><DeviceArtwork category="Mobile" brand="Apple" model="iPhone Pro" className="hero-phone-art"/><DeviceArtwork category="Laptop" brand="Samsung" model="Galaxy Book" className="hero-laptop-art"/></div>
     <div className="card hero-process-card"><strong>Device <i/> Brand <i/> Model <i/> Repair <i/> Price</strong><p className="smalltext">A guided booking journey in minutes.</p></div>
    </div>
   </div>
  </section>

  <section className="shell section public-services architecture-scene" id="services">
   <ArchitectureBackdrop/>
   <div className="public-section-head"><div><div className="eyebrow">Repair services</div><h2 className="section-title">What can we fix for you today?</h2><p className="muted">Choose a device category to view available brands, models, repairs and estimates.</p></div></div>
   <div className="grid3 repair-category-home">{services.map(([title,detail])=><Link className="card" key={title} href={`/book?category=${encodeURIComponent(title)}`}><div className="service-art"><DeviceArtwork category={title}/></div><div><h3>{title}</h3><p className="muted">{detail}</p><span>Choose this device <ArrowRight/></span></div></Link>)}</div>
  </section>
 </main>
}
