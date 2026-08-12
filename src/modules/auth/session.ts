import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

export async function requireAuthenticatedUser() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();

  if (error || !data?.claims?.sub) redirect("/login");

  const { data: account, error: accountError } = await supabase.from("user_account_statuses").select("status,password_change_required").eq("user_id", data.claims.sub).maybeSingle();
  if (accountError || account?.status !== "approved") redirect(`/account-status?status=${account?.status ?? "pending"}`);
  if (account.password_change_required) redirect("/change-password");
  return {
    userId: data.claims.sub,
    supabase,
  };
}
