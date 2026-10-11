import {NextResponse} from 'next/server'
import {createRoleWorkflowPdf} from '@/lib/role-workflow-pdf'

export const dynamic='force-dynamic'

export async function GET(){
 try{
  const pdf=await createRoleWorkflowPdf()
  return new NextResponse(Buffer.from(pdf),{
   headers:{
    'Content-Type':'application/pdf',
    'Content-Disposition':'attachment; filename="fyxnora-role-workflow-guide.pdf"',
    'Cache-Control':'private, no-store'
   }
  })
 }catch(error){
  console.error('Unable to generate role workflow PDF',error)
  return NextResponse.json({error:'Unable to generate the role workflow PDF.'},{status:500})
 }
}
