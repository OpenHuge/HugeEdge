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
  agentVersion: z.string(),
  runtimeVersion: z.string(),
  healthStatus: z.string(),
  healthScore: z.number(),
  currentConfigVersion: z.number().optional(),
  desiredConfigVersion: z.number().optional(),
  lastApplyStatus: z.string().optional(),
  lastApplyMessage: z.string().optional(),
  lastApplyAt: z.string().optional(),
  lastHeartbeatAt: z.string().optional(),
  createdAt: z.string(),
});

export const rolloutSchema = z.object({
  id: z.string(),
  tenantId: z.string(),
  nodeId: z.string(),
  nodeName: z.string(),
  bundleVersion: z.number(),
  config: z.record(z.string(), z.unknown()).optional(),
  hash: z.string(),
  adapterName: z.literal("xray-adapter"),
  status: z.string(),
  note: z.string(),
  createdBy: z.string().optional(),
  rollbackOfRolloutId: z.string().optional(),
  createdAt: z.string(),
  completedAt: z.string().optional(),
  lastApplyStatus: z.string().optional(),
  lastApplyMessage: z.string().optional(),
  healthStatus: z.string().optional(),
  healthScore: z.number().optional(),
  agentVersion: z.string().optional(),
  runtimeVersion: z.string().optional(),
});
