import { z } from "zod";

const publicEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.url().startsWith("https://"),
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
