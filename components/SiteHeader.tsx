'use client'
import {useEffect,useState} from 'react'
import {usePathname} from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import {LayoutDashboard,LogOut,Menu,X} from 'lucide-react'
import {supabase} from '@/lib/client'

const internal=['/admin','/technician','/partner','/regional']
export default function SiteHeader(){
 const pathname=usePathname(),[authenticated,setAuthenticated]=useState<boolean|null>(null),[open,setOpen]=useState(false)
 useEffect(()=>{setOpen(false)},[pathname])
 useEffect(()=>{let mounted=true;supabase().auth.getSession().then(({data})=>{if(mounted)setAuthenticated(Boolean(data.session))});const {data}=supabase().auth.onAuthStateChange((_event,session)=>setAuthenticated(Boolean(session)));return()=>{mounted=false;data.subscription.unsubscribe()}},[])
 if(internal.some(path=>pathname.startsWith(path)))return null
 async function signOut(){await supabase().auth.signOut();setAuthenticated(false);window.location.href='/'}
 return <header className="public-header"><nav className="shell nav">
  <Link className="brand" href="/"><Image src="/fyxnora-logo-transparent.png" alt="Fyxnora" width={250} height={100} priority style={{objectFit:'contain',height:'auto'}}/></Link>
  <button className="mobile-menu-toggle" aria-label={open?'Close navigation':'Open navigation'} aria-expanded={open} onClick={()=>setOpen(value=>!value)}>{open?<X/>:<Menu/>}</button>
  <div className={`navlinks ${open?'open':''}`}>
   <Link href="/">Home</Link><Link href="/about">About</Link><Link href="/#services">Services</Link><Link href="/business">For Business</Link><Link href="/contact">Contact</Link>
   {authenticated===false&&<Link href="/login">Sign in</Link>}
   {authenticated===true&&<>{pathname!=='/dashboard'&&<Link className="header-dashboard-link" href="/dashboard"><LayoutDashboard/> Dashboard</Link>}<button className="header-signout" onClick={()=>void signOut()}><LogOut/> Sign out</button></>}
   {!pathname.startsWith('/dashboard')&&<Link className="button small" href="/book">Book a repair →</Link>}
  </div>
 </nav></header>
}
