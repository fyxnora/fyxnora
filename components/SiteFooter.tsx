'use client'
import {usePathname} from 'next/navigation'
import Link from 'next/link'
import {Mail,MapPin,Phone} from 'lucide-react'
import BrandLogo from '@/components/BrandLogo'

const hidden=['/admin','/technician','/partner','/regional']
const groups=[
 ['Company',[['About Us','/about'],['Careers','/company/careers'],['Corporate Information','/company/corporate-information']]],
 ['Help & Support',[['FAQ','/company/faq'],['Contact Us','/contact'],['Warranty Policy','/company/warranty-policy'],['Refund Policy','/company/refund-policy']]],
 ['More Info',[['Terms & Conditions','/company/terms-and-conditions'],['Privacy Policy','/company/privacy-policy'],['Terms of Use','/company/terms-of-use']]]
]
export default function SiteFooter(){const pathname=usePathname();if(hidden.some(path=>pathname.startsWith(path)))return null;return <footer className="site-footer"><div className="shell footer-main"><div className="footer-brand"><BrandLogo className="brand-logo--footer brand-logo--night"/><p>Transparent, trackable device repair—from doorstep pickup to safe delivery.</p><div><a href="mailto:support@fyxnora.com"><Mail/> support@fyxnora.com</a><span><MapPin/> India</span></div></div>{groups.map(([title,links])=><div className="footer-links" key={String(title)}><h3>{String(title)}</h3>{(links as string[][]).map(([label,href])=><Link href={href} key={href}>{label}</Link>)}</div>)}</div><div className="footer-bottom"><div className="shell"><span>© {new Date().getFullYear()} Fyxnora. All rights reserved.</span><span>Developed by <b>FyxNora</b></span></div></div></footer>}
