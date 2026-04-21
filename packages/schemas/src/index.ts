import { z } from "zod";

export const jwtClaimsSchema = z.object({
  sub: z.string(),
  tenant_id: z.string(),
  role_ids: z.array(z.string()),
  session_id: z.string(),
  token_type: z.enum(["access", "refresh"]),
  exp: z.number(),
});

export const tenantSchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
  status: z.string(),
  createdAt: z.string(),
});

export const nodeSchema = z.object({
  id: z.string(),
  tenantId: z.string(),
  name: z.string(),
  status: z.string(),
  adapterName: z.literal("xray-adapter"),
  lastHeartbeatAt: z.string().optional(),
  createdAt: z.string(),
});
