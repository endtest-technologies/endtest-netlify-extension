import * as z from "zod";

export const SiteConfigSchema = z.object({
  appId: z.string().trim().min(1, "Endtest App ID is required"),
  appCode: z.string().trim().optional(),
  apiRequest: z.string().trim().min(1, "Endtest API request is required"),
  numberOfLoops: z.number().int().min(1).max(120),
});

export type SiteConfig = z.output<typeof SiteConfigSchema>;
