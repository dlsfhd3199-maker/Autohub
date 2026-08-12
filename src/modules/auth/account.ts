import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type AccountStatus = "pending" | "approved" | "rejected" | "suspended" | "withdrawn";
export async function getCurrentAccountStatus() {
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  if (!claims?.claims?.sub) redirect("/login");
  const { data, error } = await supabase.from("user_account_statuses").select("status,safe_reason,reviewed_at").eq("user_id", claims.claims.sub).maybeSingle();
  if (error) throw new Error("계정 상태를 확인하지 못했습니다.");
  return { userId: claims.claims.sub, status: (data?.status ?? "pending") as AccountStatus, safeReason: data?.safe_reason ?? null, reviewedAt: data?.reviewed_at ?? null };
}
