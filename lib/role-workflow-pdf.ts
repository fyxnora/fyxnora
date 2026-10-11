import {PDFDocument,PDFFont,StandardFonts,rgb} from 'pdf-lib'

type PdfPage=ReturnType<PDFDocument['addPage']>
type PdfFont=PDFFont

const navy=rgb(0.08,0.16,0.29)
const blue=rgb(0.02,0.48,0.84)
const teal=rgb(0.02,0.69,0.61)
const ink=rgb(0.12,0.19,0.29)
const muted=rgb(0.39,0.46,0.55)
const pale=rgb(0.94,0.97,0.99)
const white=rgb(1,1,1)
const pageWidth=612
const pageHeight=792

function wrap(text:string,font:PdfFont,size:number,width:number){
 const lines:string[]=[]
 let line=''
 for(const word of text.split(/\s+/)){
  const candidate=line?`${line} ${word}`:word
  if(font.widthOfTextAtSize(candidate,size)>width&&line){
   lines.push(line)
   line=word
  }else line=candidate
 }
 if(line)lines.push(line)
 return lines
}

function drawWrapped(page:PdfPage,text:string,x:number,y:number,width:number,font:PdfFont,size=11,color=ink,lineGap=5){
 const lines=wrap(text,font,size,width)
 for(const line of lines){
  page.drawText(line,{x,y,size,font,color})
  y-=size+lineGap
 }
 return y
}

function makePage(document:PDFDocument,title:string,section:string,pageNumber:number,bold:PdfFont,regular:PdfFont){
 const page=document.addPage([pageWidth,pageHeight])
 page.drawRectangle({x:0,y:pageHeight-78,width:pageWidth,height:78,color:navy})
 page.drawRectangle({x:0,y:pageHeight-82,width:pageWidth,height:4,color:teal})
 page.drawText('FYXNORA  /  SERVICE OPERATIONS',{x:42,y:pageHeight-28,size:9,font:bold,color:rgb(.64,.83,.98)})
 page.drawText(title,{x:42,y:pageHeight-57,size:21,font:bold,color:white})
 page.drawText(section.toUpperCase(),{x:42,y:pageHeight-106,size:9,font:bold,color:blue})
 page.drawLine({start:{x:42,y:34},end:{x:pageWidth-42,y:34},thickness:0.6,color:rgb(.84,.88,.92)})
 page.drawText('Fyxnora role workflow guide',{x:42,y:19,size:8,font:regular,color:muted})
 page.drawText(String(pageNumber),{x:pageWidth-50,y:19,size:8,font:regular,color:muted})
 return page
}

function drawCard(page:PdfPage,top:number,title:string,details:string[],bold:PdfFont,regular:PdfFont,accent=blue){
 const x=42
 const width=pageWidth-84
 const height=54+details.length*39
 const y=top-height
 page.drawRectangle({x,y,width,height,color:pale,borderColor:rgb(.87,.91,.95),borderWidth:0.8})
 page.drawRectangle({x,y,width:5,height,color:accent})
 page.drawText(title,{x:x+18,y:top-25,size:13,font:bold,color:navy})
 let cursor=top-47
 for(const detail of details){
  page.drawCircle({x:x+22,y:cursor+3,size:2.4,color:accent})
  cursor=drawWrapped(page,detail,x+32,cursor,width-52,regular,10,ink,3)-7
 }
 return y-15
}

export async function createRoleWorkflowPdf(){
 const document=await PDFDocument.create()
 document.setTitle('Fyxnora role workflow guide')
 document.setAuthor('Fyxnora')
 document.setSubject('Customer, technician, service partner, regional and administrator workflows')
 document.setKeywords(['Fyxnora','repair workflow','roles','operations'])
 const regular=await document.embedFont(StandardFonts.Helvetica)
 const bold=await document.embedFont(StandardFonts.HelveticaBold)

 let page=makePage(document,'Repair journey at a glance','Customer-to-delivery workflow',1,bold,regular)
 let y=pageHeight-137
 y=drawWrapped(page,'One repair request moves through five accountable roles. Customers stay in control of approval, while each handoff is recorded in the booking timeline.',42,y,pageWidth-84,regular,12,ink,6)-21
 const stages=[
  ['01','BOOK','Customer verifies email, selects device and repair, then submits pickup details.'],
  ['02','ASSIGN','Admin or regional operations assigns a verified centre and an active technician.'],
  ['03','COLLECT','Technician schedules the visit, verifies custody and records transit.'],
  ['04','DIAGNOSE & QUOTE','Service centre receives the device, diagnoses it and sends the quotation.'],
  ['05','APPROVE & REPAIR','Customer accepts or rejects the quote; repair starts only after approval.'],
  ['06','QUALITY & RETURN','Service centre passes quality checks; technician returns the device; customer closes the order.']
 ]
 const stageWidth=pageWidth-84
 const stageHeight=49
 for(let i=0;i<stages.length;i++){
  const stage=stages[i]
  page.drawRectangle({x:42,y:y-stageHeight,width:stageWidth,height:stageHeight,color:i%2===0?pale:white,borderColor:rgb(.87,.91,.95),borderWidth:.6})
  page.drawCircle({x:63,y:y-24,size:12,color:i===stages.length-1?teal:blue})
  page.drawText(stage[0],{x:55.8,y:y-27.5,size:7,font:bold,color:white})
  page.drawText(stage[1],{x:86,y:y-18,size:9,font:bold,color:navy})
  drawWrapped(page,stage[2],86,y-33,stageWidth-56,regular,8.5,muted,2)
  y-=stageHeight+7
 }
 y-=6
 page.drawText('Status path',{x:42,y,size:10,font:bold,color:navy})
 y-=19
 drawWrapped(page,'BOOKED -> ASSIGNED -> VISIT_SCHEDULED -> PICKUP_VERIFIED -> IN_TRANSIT -> RECEIVED_AT_CENTRE -> DIAGNOSIS -> QUOTE_SENT -> CUSTOMER_APPROVED -> REPAIRING -> QUALITY_CHECK -> READY_FOR_DELIVERY -> OUT_FOR_DELIVERY -> DELIVERED -> CLOSED',42,y,pageWidth-84,bold,8.5,blue,4)
 drawWrapped(page,'Branches: a rejected quote returns the device without repair; a parts delay can pause repair before work resumes.',42,y-45,pageWidth-84,regular,8.5,muted,4)

 page=makePage(document,'Role responsibilities','Access and operational ownership',2,bold,regular)
 y=pageHeight-132
 y=drawCard(page,y,'Customer',['Verifies email with a one-time code before the account is created.','Creates repair requests, tracks every milestone, and approves or rejects the quote.','Receives booking and progress messages at the account email.'],bold,regular,teal)
 y=drawCard(page,y,'Field technician',['Works only on jobs assigned to their profile.','Schedules pickup, records custody verification and transit, then handles the return delivery.'],bold,regular,blue)
 drawCard(page,y,'Service partner',['Receives devices at the linked verified service centre.','Records diagnosis and sends the quote. Repairs start only after approval; service centre then completes quality control.','May assign technicians linked to its centre.'],bold,regular,teal)

 page=makePage(document,'Regional and admin control','Assignments and escalation',3,bold,regular)
 y=pageHeight-132
 y=drawCard(page,y,'Regional operations',['Monitors work in the assigned region and coordinates local partner and technician assignments.','Cannot assign users outside the region or change national administrator roles.'],bold,regular,blue)
 y=drawCard(page,y,'Super administrator',['Invites and manages all user roles, including customers; links operations users to valid regions or verified centres.','Assigns work, manages workflow, business enquiries, catalogue/pricing and email settings.'],bold,regular,teal)
 drawCard(page,y,'Assignment safeguards',['Technicians and service partners must be active and linked to a verified service centre.','Repair starts only after customer approval. Status changes cannot silently overwrite concurrent updates.'],bold,regular,blue)

 page=makePage(document,'Email and security','Administrator setup checklist',4,bold,regular)
 y=pageHeight-137
 y=drawCard(page,y,'Configure delivery',['In Admin -> SMTP settings, choose Gmail, Zoho Mail or Other / Custom. Enter the provider host, port, TLS option, username, app password, sender address and reply-to.','Save the settings, then send a test email before enabling registrations. SMTP credentials are encrypted on the server and never returned to the browser.'],bold,regular,blue)
 y=drawCard(page,y,'Set notification recipients',['Add operations addresses as comma-separated internal recipients. New accounts, bookings, business enquiries and booking progress messages include these recipients.','Add optional comma-separated CC addresses to copy routine service emails. OTP codes, invitation links and password-reset links are intentionally never copied.'],bold,regular,teal)
 y=drawCard(page,y,'Protect account access',['The six-digit email code expires after 10 minutes, allows up to five guesses, and can only be resent after the cooldown.','Admin invitations and password resets use one-time links; the recipient chooses their own password.','Only active administrators may change roles. The final active admin cannot disable or demote itself or another final administrator.'],bold,regular,blue)
 drawCard(page,y,'Operational handoffs',['The technician records pickup and delivery verification references in the order timeline.','The customer receives each booking milestone at their registered email.'],bold,regular,teal)

 return document.save()
}
