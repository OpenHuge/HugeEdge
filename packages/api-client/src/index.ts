import { z } from "zod";

export type AuthTokens = {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
};

export type Actor = {
  id: string;
  email: string;
  tenantId: string;
  roleIds: string[];
  sessionId: string;
};

export type Tenant = {
  id: string;
  name: string;
  slug: string;
  status: string;
  createdAt: string;
};

export type Node = {
  id: string;
  tenantId: string;
  name: string;
  status: string;
  adapterName: "xray-adapter";
  agentVersion: string;
  runtimeVersion: string;
  healthStatus: string;
  healthScore: number;
  currentConfigVersion?: number;
  desiredConfigVersion?: number;
  lastApplyStatus?: string;
  lastApplyMessage?: string;
  lastApplyAt?: string;
  lastHeartbeatAt?: string;
  createdAt: string;
};

export type Rollout = {
  id: string;
  tenantId: string;
  nodeId: string;
  nodeName: string;
  bundleVersion: number;
  config?: Record<string, unknown>;
  hash: string;
  adapterName: "xray-adapter";
  status: string;
  note: string;
  createdBy?: string;
  rollbackOfRolloutId?: string;
  createdAt: string;
  completedAt?: string;
  lastApplyStatus?: string;
  lastApplyMessage?: string;
  healthStatus?: string;
  healthScore?: number;
  agentVersion?: string;
  runtimeVersion?: string;
};

export type AuditLog = {
  id: string;
  action: string;
  actorId: string;
  tenantId?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
};

export type Capability = {
  name: string;
  version: string;
  source: string;
};

export type BootstrapToken = {
  token: string;
  expiresAt: string;
};

export type Provider = {
  id: string;
  name: string;
  slug: string;
};

export type Region = {
  id: string;
  providerId: string;
  name: string;
  code: string;
};

export class HugeEdgeApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "HugeEdgeApiError";
  }
}

const tokenSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string(),
  expiresIn: z.number(),
});

export type TokenStore = {
  getAccessToken(): string | undefined;
  getRefreshToken(): string | undefined;
  setTokens(tokens: AuthTokens): void;
  clear(): void;
};

export class BrowserTokenStore implements TokenStore {
  getAccessToken() {
    return (
      globalThis.localStorage?.getItem("hugeedge.accessToken") ?? undefined
    );
  }

  getRefreshToken() {
    return (
      globalThis.localStorage?.getItem("hugeedge.refreshToken") ?? undefined
    );
  }

  setTokens(tokens: AuthTokens) {
    globalThis.localStorage?.setItem(
      "hugeedge.accessToken",
      tokens.accessToken,
    );
    globalThis.localStorage?.setItem(
      "hugeedge.refreshToken",
      tokens.refreshToken,
    );
  }

  clear() {
    globalThis.localStorage?.removeItem("hugeedge.accessToken");
    globalThis.localStorage?.removeItem("hugeedge.refreshToken");
  }
}

export class HugeEdgeClient {
  constructor(
    private readonly baseUrl: string,
    private readonly tokenStore?: TokenStore,
  ) {}

  async login(email: string, password: string) {
    const tokens = tokenSchema.parse(
      await this.request("/v1/auth/login", {
        method: "POST",
        body: { email, password },
        auth: false,
      }),
    );
    this.tokenStore?.setTokens(tokens);
    return tokens;
  }

  async refresh() {
    const refreshToken = this.tokenStore?.getRefreshToken();
    if (!refreshToken) {
      this.tokenStore?.clear();
      throw new Error("missing refresh token");
    }
    try {
      const tokens = tokenSchema.parse(
        await this.request("/v1/auth/refresh", {
          method: "POST",
          body: { refreshToken },
          auth: false,
        }),
      );
      this.tokenStore?.setTokens(tokens);
      return tokens;
    } catch (error) {
      this.tokenStore?.clear();
      throw error;
    }
  }

  async logout() {
    await this.request("/v1/auth/logout", { method: "POST" });
    this.tokenStore?.clear();
  }

  me() {
    return this.request<Actor>("/v1/app/me");
  }

  tenants() {
    return this.request<Tenant[]>("/v1/admin/tenants");
  }

  tenant(id: string) {
    return this.request<Tenant>(`/v1/admin/tenants/${id}`);
  }

  createTenant(input: { name: string; slug: string }) {
    return this.request<Tenant>("/v1/admin/tenants", {
      method: "POST",
      body: input,
    });
  }

  nodes() {
    return this.request<Node[]>("/v1/admin/nodes");
  }

  node(id: string) {
    return this.request<Node>(`/v1/admin/nodes/${id}`);
  }

  auditLogs() {
    return this.request<AuditLog[]>("/v1/admin/audit-logs");
  }

  capabilities() {
    return this.request<Capability[]>("/v1/admin/capabilities");
  }

  providers() {
    return this.request<Provider[]>("/v1/admin/providers");
  }

  regions() {
    return this.request<Region[]>("/v1/admin/regions");
  }

  createBootstrapToken() {
    return this.request<BootstrapToken>("/v1/admin/nodes/bootstrap-tokens", {
      method: "POST",
    });
  }

  rollouts(nodeId?: string) {
    const query = nodeId
      ? `?${new URLSearchParams({ nodeId }).toString()}`
      : "";
    return this.request<Rollout[]>(`/v1/admin/rollouts${query}`);
  }

  rollout(id: string) {
    return this.request<Rollout>(`/v1/admin/rollouts/${id}`);
  }

  createRollout(input: {
    nodeId: string;
    adapterName: "xray-adapter";
    config: Record<string, unknown>;
    note?: string;
  }) {
    return this.request<Rollout>("/v1/admin/rollouts", {
      method: "POST",
      body: input,
    });
  }

  rollbackRollout(id: string) {
    return this.request<Rollout>(`/v1/admin/rollouts/${id}/rollback`, {
      method: "POST",
    });
  }

  private async request<T = unknown>(
    path: string,
    options: {
      method?: string;
      body?: unknown;
      auth?: boolean;
      retry?: boolean;
    } = {},
  ): Promise<T> {
    const headers = new Headers({ Accept: "application/json" });
    if (options.body !== undefined) {
      headers.set("Content-Type", "application/json");
    }
    if (options.auth !== false) {
      const token = this.tokenStore?.getAccessToken();
      if (token) {
        headers.set("Authorization", `Bearer ${token}`);
      }
    }
    const response = await fetch(`${this.baseUrl}${path}`, {
      method: options.method ?? "GET",
      headers,
      body:
        options.body === undefined ? undefined : JSON.stringify(options.body),
    });
    if (
      response.status === 401 &&
      options.retry !== false &&
      options.auth !== false
    ) {
      try {
        await this.refresh();
        return this.request<T>(path, { ...options, retry: false });
      } catch (error) {
        this.tokenStore?.clear();
        throw error;
      }
    }
    if (!response.ok) {
      throw new HugeEdgeApiError(response.status, await errorMessage(response));
    }
    if (response.status === 204) {
      return undefined as T;
    }
    return (await response.json()) as T;
  }
}

async function errorMessage(response: Response) {
  try {
    const body = (await response.json()) as { error?: unknown };
    if (typeof body.error === "string" && body.error !== "") {
      return body.error;
    }
  } catch {
    // Fall back to the status text below.
  }
  return `HugeEdge API request failed: ${response.status}`;
}
