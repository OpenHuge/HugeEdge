import type { Actor } from "@hugeedge/api-client";
import { queryOptions } from "@tanstack/react-query";
import { api, isApiError, tokenStore } from "./api";
import { queryClient } from "./query-client";

export const queryKeys = {
  actor: ["auth", "me"] as const,
  tenants: ["admin", "tenants"] as const,
  tenant: (tenantId: string) => ["admin", "tenants", tenantId] as const,
  nodes: ["admin", "nodes"] as const,
  node: (nodeId: string) => ["admin", "nodes", nodeId] as const,
  audit: ["admin", "audit"] as const,
  capabilities: ["admin", "capabilities"] as const,
  providers: ["admin", "providers"] as const,
  regions: ["admin", "regions"] as const,
} as const;

export const actorQueryOptions = () =>
  queryOptions({
    queryKey: queryKeys.actor,
    queryFn: ({ signal }) => api.me(signal),
  });

export function resetSessionState() {
  tokenStore.clear();
  queryClient.clear();
}

export async function ensureActor() {
  if (!tokenStore.getAccessToken()) {
    return null;
  }

  try {
    return await queryClient.ensureQueryData(actorQueryOptions());
  } catch (error) {
    if (isApiError(error) && (error.status === 401 || error.status === 404)) {
      resetSessionState();
      return null;
    }
    throw error;
  }
}

export async function loginWithPassword(email: string, password: string) {
  await api.login(email, password);
  return queryClient.fetchQuery(actorQueryOptions());
}

export async function logoutSession() {
  await api.logout();
  resetSessionState();
}

export function seedActor(actor: Actor) {
  queryClient.setQueryData(queryKeys.actor, actor);
}
