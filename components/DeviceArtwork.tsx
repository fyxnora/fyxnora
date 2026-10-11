'use client'

const brandDomains:Record<string,string>={
 acer:'acer.com',
 apple:'apple.com',
 asus:'asus.com',
 dell:'dell.com',
 google:'google.com',
 'google pixel':'google.com',
 huawei:'huawei.com',
 hp:'hp.com',
 lenovo:'lenovo.com',
 microsoft:'microsoft.com',
 motorola:'motorola.com',
 nothing:'nothing.tech',
 oneplus:'oneplus.com',
 oppo:'oppo.com',
 poco:'po.co',
 realme:'realme.com',
 redmi:'mi.com',
 samsung:'samsung.com',
 vivo:'vivo.com',
 xiaomi:'mi.com'
}

const brandColors:Record<string,[string,string]>={
 apple:['#29364a','#a9d9ef'],
 samsung:['#17243a','#9cc9f5'],
 'google pixel':['#314254','#b7e4d7'],
 google:['#314254','#b7e4d7'],
 oneplus:['#501f26','#f0b4a4'],
 nothing:['#20252b','#b8e5ee'],
 poco:['#302820','#f2c77c'],
 redmi:['#443024','#f2bf81'],
 xiaomi:['#443024','#f2bf81'],
 oppo:['#17483f','#a8e0ca'],
 vivo:['#223650','#b9d5f5'],
 realme:['#3d3927','#e8d47d'],
 motorola:['#26334a','#b6d4e9']
}

const categoryKinds:Record<string,'phone'|'tablet'|'laptop'|'watch'|'earbuds'|'desktop'>={
 mobile:'phone',
 tablet:'tablet',
 laptop:'laptop',
 'smart watch':'watch',
 airpods:'earbuds',
 desktop:'desktop'
}

export function getBrandLogoUrl(brand:string){
 const domain=brandDomains[brand.trim().toLowerCase()]
 return domain?`https://www.google.com/s2/favicons?domain=${domain}&sz=128`:null
}

export default function DeviceArtwork({category,brand='',model='',imageUrl,className=''}:{category:string;brand?:string;model?:string;imageUrl?:string|null;className?:string}){
 const kind=categoryKinds[category.toLowerCase()]||'phone'
 const logo=brand?getBrandLogoUrl(brand):null
 const normalizedBrand=brand.toLowerCase()
 const cameraStyle=normalizedBrand.includes('apple')?'apple':normalizedBrand.includes('samsung')?'samsung':normalizedBrand.includes('pixel')||normalizedBrand==='google'?'pixel':normalizedBrand.includes('oneplus')?'oneplus':normalizedBrand.includes('nothing')?'nothing':'standard'
 const [shellColor,screenColor]=brandColors[normalizedBrand]||['#28374b','#a9d9ef']
 const artwork={
  phone:<>
   <g className={`art-rear art-rear--${cameraStyle}`}>
    <rect className="art-shell" x="112" y="25" width="55" height="120" rx="13"/>
    {cameraStyle==='apple'?<><rect className="camera-island" x="119" y="32" width="33" height={model.toLowerCase().includes('pro')?34:30} rx="9"/><circle className="art-lens" cx="128" cy="42" r="5"/><circle className="art-lens" cx="143" cy="42" r="5"/>{model.toLowerCase().includes('pro')&&<circle className="art-lens" cx="128" cy="56" r="5"/>}<circle className="art-flash" cx="144" cy="57" r="2.2"/></>:cameraStyle==='samsung'?<><circle className="art-lens" cx="124" cy="40" r="5"/><circle className="art-lens" cx="124" cy="54" r="5"/><circle className="art-lens" cx="124" cy="68" r="5"/><circle className="art-flash" cx="139" cy="68" r="2.5"/></>:cameraStyle==='pixel'?<><rect className="camera-island camera-island--bar" x="116" y="39" width="47" height="19" rx="9"/><circle className="art-lens" cx="128" cy="48.5" r="5"/><circle className="art-lens" cx="151" cy="48.5" r="5"/></>:cameraStyle==='oneplus'?<><circle className="camera-island" cx="134" cy="51" r="20"/><circle className="art-lens" cx="127" cy="45" r="5"/><circle className="art-lens" cx="141" cy="45" r="5"/><circle className="art-lens" cx="127" cy="58" r="5"/><circle className="art-flash" cx="141" cy="58" r="2.5"/></>:cameraStyle==='nothing'?<><circle className="art-nothing-ring" cx="130" cy="50" r="17"/><circle className="art-lens" cx="130" cy="50" r="7"/><circle className="art-nothing-dot" cx="152" cy="39" r="2"/><circle className="art-nothing-dot" cx="152" cy="61" r="2"/></>:<><rect className="camera-island" x="119" y="32" width="19" height="40" rx="9"/><circle className="art-lens" cx="128.5" cy="42" r="5"/><circle className="art-lens" cx="128.5" cy="58" r="5"/></>}
    <circle className="art-rear-logo" cx="139" cy="103" r="5"/>
   </g>
   <g className="art-front"><rect className="art-shell" x="56" y="14" width="64" height="142" rx="15"/><rect className="art-screen" x="61" y="25" width="54" height="118" rx="10"/><path className="art-glint" d="M69 29h18l-20 74V45z"/><rect className="art-camera" x="80" y="19" width="16" height="2.5" rx="1.2"/><circle className="art-camera" cx="72" cy="20.5" r="1.5"/></g>
  </>,
  tablet:<><rect className="art-shell" x="44" y="18" width="112" height="138" rx="13"/><rect className="art-screen" x="50" y="25" width="100" height="124" rx="8"/><path className="art-glint" d="M59 30h41L62 133V46z"/><circle className="art-camera" cx="100" cy="21.5" r="1.4"/></>,
  laptop:<><path className="art-shell" d="M67 20h66a8 8 0 0 1 8 8v88H59V28a8 8 0 0 1 8-8Z"/><rect className="art-screen" x="66" y="28" width="68" height="78" rx="3"/><path className="art-glint" d="M72 33h24L73 94z"/><path className="art-shell" d="M49 117h102l13 15H36l13-15Z"/><path className="art-detail" d="M82 120h36l3 4H79z"/></>,
  watch:<><path className="art-band" d="M77 7h46l-7 44H84zM84 119h32l7 44H77z"/><rect className="art-shell" x="61" y="43" width="78" height="84" rx="23"/><rect className="art-screen" x="68" y="50" width="64" height="70" rx="18"/><circle className="art-detail" cx="119" cy="85" r="5"/><path className="art-glint" d="M75 55h26L75 99z"/></>,
  earbuds:<><path className="art-shell" d="M66 100V51a17 17 0 1 1 34 0v38H88V52a5 5 0 1 0-10 0v48z"/><path className="art-shell" d="M134 100V51a17 17 0 1 0-34 0v38h12V52a5 5 0 1 1 10 0v48z"/><rect className="art-shell" x="53" y="96" width="94" height="57" rx="21"/><path className="art-detail" d="M69 104h62v39H69z"/><path className="art-glint" d="M74 107h25l-20 29h-5z"/><circle className="art-camera" cx="100" cy="100" r="2"/></>,
  desktop:<><rect className="art-shell" x="35" y="15" width="130" height="100" rx="9"/><rect className="art-screen" x="42" y="22" width="116" height="86" rx="4"/><path className="art-glint" d="M50 28h47L49 89z"/><path className="art-shell" d="M94 116h12v24H94zM77 140h46v8H77z"/><rect className="art-detail" x="61" y="151" width="78" height="6" rx="3"/></>
 }

 return <span className={`device-artwork device-artwork--${kind} ${className}`} style={{'--device-shell':shellColor,'--device-screen':screenColor} as React.CSSProperties} aria-hidden="true">
  <svg viewBox="0 0 200 170" focusable="false">{artwork[kind]}</svg>
  {imageUrl&&<img className="device-product-photo" src={imageUrl} alt="" loading="lazy" onError={event=>{event.currentTarget.style.display='none'}}/>}
  {brand&&<span className="device-brand-mark" title={brand} aria-label={`${brand} logo`}><b>{brand.slice(0,1).toUpperCase()}</b>{logo&&<img src={logo} alt="" loading="lazy" onLoad={event=>{const fallback=event.currentTarget.previousElementSibling;if(fallback instanceof HTMLElement)fallback.hidden=true}} onError={event=>{event.currentTarget.style.display='none'}}/>}</span>}
 </span>
}
