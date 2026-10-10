import './globals.css'
import Link from 'next/link'
import Image from 'next/image'
export const metadata={title:'Fyxnora | Repair made effortless',description:'Book doorstep mobile and laptop repairs. Track pickup, approve quotations and follow every repair update with Fyxnora.'}
export default function Layout({children}:{children:React.ReactNode}){return <html lang="en"><body><header style={{background:'white',borderBottom:'1px solid #e8edf3'}}><nav className="shell nav"><Link className="brand" href="/"><Image src="/fyxnora-logo.png" alt="Fyxnora" width={250} height={150} priority style={{objectFit:'contain',height:'auto'}}/></Link><div className="navlinks"><Link className="hide-mobile" href="/#how">How it works</Link><Link className="hide-mobile" href="/#services">Services</Link><Link href="/login">Sign in</Link><Link className="button small" href="/book">Book a repair →</Link></div></nav></header>{children}</body></html>}
