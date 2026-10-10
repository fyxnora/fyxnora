'use client'
import { createClient, SupabaseClient } from '@supabase/supabase-js'
let instance: SupabaseClient | null = null
export function supabase() {
 if(!instance){const url=process.env.NEXT_PUBLIC_SUPABASE_URL, key=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY; if(!url||!key) throw Error('Supabase environment variables missing');instance=createClient(url,key)}
 return instance
}
export async function authedFetch(path:string,body?:unknown,method?:string){
 const {data:{session}}=await supabase().auth.getSession()
 if(!session)throw Error('Please log in again')
 const res=await fetch(path,{method:method||'POST',headers:{'content-type':'application/json',Authorization:`Bearer ${session.access_token}`},...(body!==undefined?{body:JSON.stringify(body)}:{})})
 const json=await res.json();if(!res.ok)throw Error(json.error||'Request failed');return json
}
