'use client'

import {useEffect,useState} from 'react'
import {usePathname} from 'next/navigation'
import BrandLogo from '@/components/BrandLogo'

export default function PageSplash(){
 const pathname=usePathname()
 const [visible,setVisible]=useState(true)

 useEffect(()=>{
  setVisible(true)
  const timeout=window.setTimeout(()=>setVisible(false),1000)
  return ()=>window.clearTimeout(timeout)
 },[pathname])

 return <div className={`page-splash${visible?' is-visible':''}`} aria-hidden={!visible}>
  <BrandLogo className="page-splash-logo brand-logo--adaptive"/>
  <span className="visually-hidden" role="status">{visible?'Loading Fyxnora':''}</span>
 </div>
}
