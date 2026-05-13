import { z } from "zod";

export const jwtClaimsSchema = z.object({
  sub: z.string(),
  account_id: z.string(),
  account_role_ids: z.array(z.string()),
  billing_scope: z.string(),
  tenant_id: z.string(),
  role_ids: z.array(z.string()),
  session_id: z.string(),
  token_type: z.enum(["access", "refresh"]),
  exp: z.number(),
});

export const accountSchema = z.object({
  id: z.string(),
  type: z.enum(["individual", "organization", "reseller"]),
  name: z.string(),
  slug: z.string(),
  status: z.string(),
  billingEmail: z.string(),
  defaultTenantId: z.string().optional(),
  createdAt: z.string(),
});

export const walletSummarySchema = z.object({
  currency: z.string(),
  balanceMinor: z.number(),
});

export const catalogPriceVersionSchema = z.object({
  id: z.string(),
  currency: z.string(),
  unitAmountMinor: z.number(),
  entitlementTemplate: z.record(z.string(), z.unknown()),
});

export const catalogSkuSchema = z.object({
  id: z.string(),
  code: z.string(),
  name: z.string(),
  kind: z.string(),
  billingInterval: z.string().optional(),
  isActive: z.boolean(),
  currentPrice: catalogPriceVersionSchema.optional(),
});

export const catalogProductSchema = z.object({
  id: z.string(),
  code: z.string(),
  name: z.string(),
  description: z.string(),
  isFeatured: z.boolean(),
  skus: z.array(catalogSkuSchema),
});

export const subscriptionSchema = z.object({
  id: z.string(),
  accountId: z.string(),
  tenantId: z.string().optional(),
  productCode: z.string(),
  productName: z.string(),
  skuId: z.string(),
  skuCode: z.string(),
  status: z.string(),
  currentPeriodStart: z.string(),
  currentPeriodEnd: z.string(),
  autoRenew: z.boolean(),
  feedCount: z.number(),
  entitlementTemplate: z.record(z.string(), z.unknown()).optional(),
});

export const orderSchema = z.object({
  id: z.string(),
  accountId: z.string(),
  subscriptionId: z.string().optional(),
  status: z.string(),
  currency: z.string(),
  subtotalMinor: z.number(),
  payableMinor: z.number(),
  createdAt: z.string(),
});

export const subscriptionFeedSchema = z.object({
  id: z.string(),
  subscriptionId: z.string(),
  accountId: z.string(),
  tenantId: z.string().optional(),
  label: z.string(),
  status: z.string(),
  planName: z.string(),
  primary: z.boolean(),
  token: z.string(),
  accessUrl: z.string().optional(),
  etag: z.string(),
  notice: z.string(),
  lastUsedAt: z.string().optional(),
  expiresAt: z.string().optional(),
  createdAt: z.string(),
});

export const billingOverviewSchema = z.object({
  account: accountSchema,
  wallet: walletSummarySchema,
  activeSubscription: subscriptionSchema.optional(),
  recentOrders: z.array(orderSchema),
  activeFeedCount: z.number(),
  availableProductCount: z.number(),
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
