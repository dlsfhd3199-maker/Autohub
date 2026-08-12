"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";

const credentialsSchema = z.object({
  email: z.email(),
  password: z.string().min(8).max(200),
});

export async function signIn(formData: FormData) {
  const parsed = credentialsSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) redirect("/login?error=invalid");

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);

  if (error) redirect("/login?error=invalid");
  const { data: account } = await supabase.from("user_account_statuses").select("status,password_change_required").eq("user_id", (await supabase.auth.getClaims()).data?.claims?.sub ?? "").maybeSingle();
  if (account?.status !== "approved") redirect(`/account-status?status=${account?.status ?? "pending"}`);
  if (account.password_change_required) redirect("/change-password");
  redirect("/workspace");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
