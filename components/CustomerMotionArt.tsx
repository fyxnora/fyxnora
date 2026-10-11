'use client'

import {usePathname} from 'next/navigation'

const internalPaths=['/admin','/technician','/partner','/regional','/dashboard']

export default function CustomerMotionArt(){
 const pathname=usePathname()
 if(internalPaths.some(path=>pathname.startsWith(path)))return null

 return <div className="customer-motion-art" aria-hidden="true">
  <svg viewBox="0 0 260 250" role="presentation">
   <circle className="motion-orbit" cx="130" cy="125" r="92"/>
   <circle className="motion-orbit motion-orbit--inner" cx="130" cy="125" r="66"/>
   <g className="motion-device">
    <rect x="91" y="45" width="78" height="146" rx="19"/>
    <rect className="motion-screen" x="98" y="55" width="64" height="124" rx="13"/>
    <rect className="motion-camera" x="120" y="49" width="20" height="3" rx="1.5"/>
    <circle className="motion-check" cx="169" cy="175" r="24"/>
    <path className="motion-checkmark" d="m158 175 7 7 15-16"/>
   </g>
   <circle className="motion-spark motion-spark--one" cx="52" cy="86" r="5"/>
   <circle className="motion-spark motion-spark--two" cx="204" cy="75" r="4"/>
   <circle className="motion-spark motion-spark--three" cx="70" cy="190" r="3"/>
  </svg>
 </div>
}
