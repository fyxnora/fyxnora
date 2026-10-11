'use client'
import {usePortal} from './Portal'
import AdminDashboard from './AdminDashboard'
import OperationsDashboard from './OperationsDashboard'
import {Role} from '@/lib/constants'

const settings:Record<Exclude<Role,'customer'>,{title:string;description:string;actions:Record<string,string[]>}>={
 admin:{title:'Super Admin',description:'Manage national work orders, users and assignments.',actions:{BOOKED:['assign_region','assign_partner','assign_technician'],ASSIGNED:['assign_partner','assign_technician','schedule_visit'],VISIT_SCHEDULED:['assign_partner','assign_technician','verify_pickup'],PICKUP_VERIFIED:['mark_in_transit','receive_centre'],IN_TRANSIT:['receive_centre'],RECEIVED_AT_CENTRE:['diagnosis_done'],DIAGNOSIS:['submit_quote'],CUSTOMER_APPROVED:['start_repair'],REPAIRING:['finish_repair','mark_parts_delayed'],PARTS_DELAYED:['resume_repair'],QUALITY_CHECK:['quality_approved'],READY_FOR_DELIVERY:['out_for_delivery'],OUT_FOR_DELIVERY:['complete_delivery'],DELIVERED:['close_order'],QUOTE_REJECTED:['mark_return']}},
 partner:{title:'Service Centre',description:'Diagnose, quote, repair and quality-check assigned devices.',actions:{ASSIGNED:['assign_technician'],VISIT_SCHEDULED:['assign_technician'],IN_TRANSIT:['receive_centre'],PICKUP_VERIFIED:['receive_centre'],RECEIVED_AT_CENTRE:['diagnosis_done'],DIAGNOSIS:['submit_quote'],CUSTOMER_APPROVED:['start_repair'],REPAIRING:['finish_repair','mark_parts_delayed'],PARTS_DELAYED:['resume_repair'],QUALITY_CHECK:['quality_approved'],QUOTE_REJECTED:['mark_return']}},
 technician:{title:'Field Technician',description:'Your doorstep visits, verified pickup and delivery assignments.',actions:{ASSIGNED:['schedule_visit'],VISIT_SCHEDULED:['verify_pickup'],PICKUP_VERIFIED:['mark_in_transit'],READY_FOR_DELIVERY:['out_for_delivery'],OUT_FOR_DELIVERY:['complete_delivery']}},
 regional:{title:'Regional Operations',description:'Oversee local partners, assignments and work-order service levels.',actions:{BOOKED:['assign_partner','assign_technician'],ASSIGNED:['assign_partner','assign_technician','schedule_visit'],VISIT_SCHEDULED:['assign_partner','assign_technician','schedule_visit']}}
}

export default function RolePage({role}:{role:Exclude<Role,'customer'>}){
 const {profile,orders,people,loading,error,reload}=usePortal(role)
 const config=settings[role]
 if(role==='admin')return <>{loading&&<div className="admin-loading">Loading super admin dashboard...</div>}{error&&<div className="alert">{error}</div>}{profile&&<AdminDashboard profile={profile} orders={orders} people={people} reload={reload}/>}</>
 return <>{loading&&<div className="admin-loading">Loading {config.title}...</div>}{error&&<div className="alert">{error}</div>}{profile&&<OperationsDashboard role={role} profile={profile} orders={orders} people={people} actions={config.actions} reload={reload}/>}</>
}
