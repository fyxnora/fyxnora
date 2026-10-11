import './globals.css'
import './booking.css'
import './responsive.css'
import './tabler-theme.css'
import SiteHeader from '@/components/SiteHeader'
import PageSplash from '@/components/PageSplash'
import CustomerMotionArt from '@/components/CustomerMotionArt'
import ThemeAccountDock from '@/components/ThemeAccountDock'
import WhatsAppChat from '@/components/WhatsAppChat'
import SiteFooter from '@/components/SiteFooter'
export const metadata={title:'Fyxnora | Repair made effortless',description:'Book doorstep mobile and laptop repairs. Track pickup, approve quotations and follow every repair update with Fyxnora.',icons:{icon:'/favicon.svg',shortcut:'/favicon.svg',apple:'/favicon.svg'}}
export default function Layout({children}:{children:React.ReactNode}){return <html lang="en" data-scroll-behavior="smooth" suppressHydrationWarning><body><SiteHeader/><ThemeAccountDock/><WhatsAppChat/><div className="site-pages"><CustomerMotionArt/><div className="site-page-content">{children}</div></div><SiteFooter/><PageSplash/></body></html>}
