export const roles=['customer','technician','partner','regional','admin'] as const
export type Role=typeof roles[number]
export const steps=['BOOKED','ASSIGNED','VISIT_SCHEDULED','PICKUP_VERIFIED','IN_TRANSIT','RECEIVED_AT_CENTRE','DIAGNOSIS','QUOTE_SENT','CUSTOMER_APPROVED','REPAIRING','QUALITY_CHECK','READY_FOR_DELIVERY','OUT_FOR_DELIVERY','DELIVERED','CLOSED'] as const
export const statuses=[...steps,'QUOTE_REJECTED','RETURN_WITHOUT_REPAIR','PARTS_DELAYED','CUSTOMER_UNREACHABLE','DISPUTED','LOST_OR_DAMAGED','WARRANTY_REOPENED'] as const
export const pretty=(s:string)=>s.replaceAll('_',' ').toLowerCase().replace(/\b\w/g,c=>c.toUpperCase())
export const money=(n:number)=>'₹'+Number(n||0).toLocaleString('en-IN',{maximumFractionDigits:2})
export const sections:{role:Role;href:string;label:string;detail:string}[]=[{role:'customer',href:'/dashboard',label:'Customer portal',detail:'My repair requests, estimates & tracking'},{role:'technician',href:'/technician',label:'Technician portal',detail:'Field pickup, handover and delivery'},{role:'partner',href:'/partner',label:'Service centre portal',detail:'Diagnoses, quotation & repairs'},{role:'regional',href:'/regional',label:'Regional operations',detail:'Partners, zones and service activity'},{role:'admin',href:'/admin',label:'Super admin',detail:'All orders, assignment & control'}]
