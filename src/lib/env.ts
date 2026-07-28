import { z } from "zod";

const secureOrLocalUrl = z.url().refine((value) => {
  const url = new URL(value);
  return url.protocol === "https:" || (url.protocol === "http:" && ["localhost", "127.0.0.1", "::1"].includes(url.hostname));
}, "HTTPS 또는 로컬 루프백 URL만 허용됩니다.");

const publicEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: secureOrLocalUrl,
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z
    .string()
    .min(1)
    .startsWith("sb_publishable_"),
  NEXT_PUBLIC_APP_URL: z.url(),
});

const serverEnvSchema = publicEnvSchema.extend({
  DATABASE_URL: z.url().startsWith("postgresql://"),
  TEST_DATABASE_URL: z.url().startsWith("postgresql://").optional(),
});

export type PublicEnv = z.infer<typeof publicEnvSchema>;
export type ServerEnv = z.infer<typeof serverEnvSchema>;

export function parsePublicEnv(input: Record<string, string | undefined>) {
  return publicEnvSchema.parse(input);
}

export function parseServerEnv(input: Record<string, string | undefined>) {
  return serverEnvSchema.parse(input);
}

export function getPublicEnv() {
  return parsePublicEnv({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  });
}
