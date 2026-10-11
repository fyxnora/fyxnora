'use client'
import {useEffect,useState} from 'react'
import {usePathname} from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import {LayoutDashboard,LogOut} from 'lucide-react'
import {supabase} from '@/lib/client'

const internal=['/admin','/technician','/partner','/regional']
export default function SiteHeader(){
 const pathname=usePathname(),[authenticated,setAuthenticated]=useState<boolean|null>(null)
 useEffect(()=>{let mounted=true;supabase().auth.getSession().then(({data})=>{if(mounted)setAuthenticated(Boolean(data.session))});const {data}=supabase().auth.onAuthStateChange((_event,session)=>setAuthenticated(Boolean(session)));return()=>{mounted=false;data.subscription.unsubscribe()}},[])
 if(internal.some(path=>pathname.startsWith(path)))return null
 async function signOut(){await supabase().auth.signOut();setAuthenticated(false);window.location.href='/'}
 return <header className="public-header"><nav className="shell nav"><Link className="brand" href="/"><Image src="/fyxnora-logo.png" alt="Fyxnora" width={250} height={150} priority style={{objectFit:'contain',height:'auto'}}/></Link><div className="navlinks"><Link className="hide-mobile" href="/#how">How it works</Link><Link className="hide-mobile" href="/#services">Services</Link><Link href="/business">For Business</Link>{authenticated===false&&<Link href="/login">Sign in</Link>}{authenticated===true&&<><Link className="header-dashboard-link" href="/dashboard"><LayoutDashboard/> Dashboard</Link><button className="header-signout" onClick={()=>void signOut()}><LogOut/> Sign out</button></>}<Link className="button small" href="/book">Book a repair →</Link></div></nav></header>
}
