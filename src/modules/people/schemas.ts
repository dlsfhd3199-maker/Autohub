import { z } from "zod";

export const assignmentInputSchema = z.object({
  organizationId: z.string().uuid(),
  brandId: z.string().uuid(),
  userId: z.string().uuid(),
  role: z.enum(["ae", "advertiser"]),
});
