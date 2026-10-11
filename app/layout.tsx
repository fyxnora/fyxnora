import './globals.css'
import './booking.css'
import './responsive.css'
import SiteHeader from '@/components/SiteHeader'
export const metadata={title:'Fyxnora | Repair made effortless',description:'Book doorstep mobile and laptop repairs. Track pickup, approve quotations and follow every repair update with Fyxnora.'}
export default function Layout({children}:{children:React.ReactNode}){return <html lang="en"><body><SiteHeader/>{children}</body></html>}
