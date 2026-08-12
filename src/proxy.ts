import type { NextRequest } from "next/server";

import { updateSession } from "@/lib/supabase/proxy";

export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: ["/login", "/register", "/forgot-password", "/account-status", "/change-password", "/workspace/:path*", "/api/:path*"],
};
