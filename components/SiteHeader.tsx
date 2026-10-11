'use client'
import {usePathname} from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
const internal=['/admin','/technician','/partner','/regional']
export default function SiteHeader(){const pathname=usePathname();if(internal.some(path=>pathname.startsWith(path)))return null;return <header style={{background:'white',borderBottom:'1px solid #e8edf3'}}><nav className="shell nav"><Link className="brand" href="/"><Image src="/fyxnora-logo.png" alt="Fyxnora" width={250} height={150} priority style={{objectFit:'contain',height:'auto'}}/></Link><div className="navlinks"><Link className="hide-mobile" href="/#how">How it works</Link><Link className="hide-mobile" href="/#services">Services</Link><Link href="/business">For Business</Link><Link href="/login">Sign in</Link><Link className="button small" href="/book">Book a repair →</Link></div></nav></header>}
