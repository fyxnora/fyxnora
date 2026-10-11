'use client'

import {useEffect,useState} from 'react'
import {usePathname} from 'next/navigation'

export default function PageSplash(){
 const pathname=usePathname()
 const [visible,setVisible]=useState(true)

 useEffect(()=>{
  setVisible(true)
  const timeout=window.setTimeout(()=>setVisible(false),1000)
  return ()=>window.clearTimeout(timeout)
 },[pathname])

 return <div className={`page-splash${visible?' is-visible':''}`} aria-hidden={!visible}>
  <img src="/fyxnora-logo-transparent.png" alt="" className="page-splash-logo"/>
  <span className="visually-hidden" role="status">{visible?'Loading Fyxnora':''}</span>
 </div>
}
