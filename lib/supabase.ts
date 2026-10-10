import { createClient } from '@supabase/supabase-js'
export function publicClient() {
 const url=process.env.NEXT_PUBLIC_SUPABASE_URL, key=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
 if(!url||!key) throw new Error('Configure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY')
 return createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}})
}
export function adminClient() {
 const url=process.env.NEXT_PUBLIC_SUPABASE_URL, key=process.env.SUPABASE_SERVICE_ROLE_KEY
 if(!url||!key) throw new Error('Missing Supabase admin server configuration')
 return createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}})
}
