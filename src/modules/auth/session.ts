import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

export async function requireAuthenticatedUser() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();

  if (error || !data?.claims?.sub) redirect("/login");

  const { data: account, error: accountError } = await supabase.from("user_account_statuses").select("status").eq("user_id", data.claims.sub).maybeSingle();
  if (accountError || account?.status !== "approved") redirect(`/account-status?status=${account?.status ?? "pending"}`);
  return {
    userId: data.claims.sub,
    supabase,
  };
}
