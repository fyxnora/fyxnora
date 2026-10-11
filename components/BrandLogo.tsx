import Image from 'next/image'

export default function BrandLogo({className=''}:{className?:string}){
 return <div className={`brand-logo ${className}`} role="img" aria-label="Fyxnora">
  <Image src="/fyxnora-brand-day.png" alt="" width={827} height={209} sizes="(max-width: 575px) 125px, 175px" className="brand-logo-day"/>
  <Image src="/fyxnora-brand-night.png" alt="" aria-hidden="true" width={827} height={209} sizes="(max-width: 575px) 125px, 175px" className="brand-logo-night"/>
  <Image src="/fyxnora-mark.png" alt="" aria-hidden="true" width={206} height={209} className="brand-logo-mark"/>
 </div>
}
