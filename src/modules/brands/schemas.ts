import { z } from "zod";

const uuid = z.string().uuid();
export const brandInputSchema = z.object({
  organizationId: uuid,
  advertiserOrganizationId: uuid,
  name: z.string().trim().min(2).max(120),
  brandKey: z.string().trim().regex(/^[a-z0-9][a-z0-9-]{1,62}$/),
  domain: z.string().trim().toLowerCase().regex(/^[a-z0-9.-]+$/),
  publishingPath: z.string().trim().regex(/^\/[a-z0-9/_-]*$/).default("/blog"),
});
export const brandUpdateSchema = brandInputSchema.omit({ advertiserOrganizationId: true, brandKey: true }).extend({ brandId: uuid });
export const brandArchiveSchema = z.object({ organizationId: uuid, brandId: uuid });
