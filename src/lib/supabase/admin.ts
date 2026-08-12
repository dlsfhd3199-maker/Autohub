import "server-only";
import {createClient}from"@supabase/supabase-js";import{getPublicEnv}from"@/lib/env";
export function createAdminClient(){const key=process.env.SUPABASE_ADMIN_API_KEY??process.env.E2E_SUPABASE_SERVICE_ROLE_KEY;if(!key)throw new Error("ACCOUNT_PROVISIONING_NOT_CONFIGURED");const env=getPublicEnv();return createClient(env.NEXT_PUBLIC_SUPABASE_URL,key,{auth:{persistSession:false,autoRefreshToken:false}})}
