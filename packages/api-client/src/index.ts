import { z } from "zod";

const authTokensSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string(),
  expiresIn: z.number(),
});

const actorSchema = z.object({
  id: z.string(),
  email: z.string(),
  tenantId: z.string(),
  roleIds: z.array(z.string()),
  sessionId: z.string(),
});

const tenantSchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
  status: z.string(),
  createdAt: z.string(),
});

const nodeSchema = z.object({
  id: z.string(),
  tenantId: z.string(),
  name: z.string(),
  status: z.string(),
  adapterName: z.string(),
  lastHeartbeatAt: z.string().optional(),
  createdAt: z.string(),
});

const auditLogSchema = z.object({
  id: z.string(),
  action: z.string(),
  actorId: z.string(),
  tenantId: z.string().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
  createdAt: z.string(),
});

const capabilitySchema = z.object({
  name: z.string(),
  version: z.string(),
  source: z.string(),
});

const providerSchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
});

const regionSchema = z.object({
  id: z.string(),
  providerId: z.string(),
  name: z.string(),
  code: z.string(),
});

const bootstrapTokenSchema = z.object({
  token: z.string(),
  expiresAt: z.string(),
});

const apiErrorResponseSchema = z.object({
  error: z.string().optional(),
});

export type AuthTokens = z.infer<typeof authTokensSchema>;
export type Actor = z.infer<typeof actorSchema>;
export type Tenant = z.infer<typeof tenantSchema>;
export type Node = z.infer<typeof nodeSchema>;
export type AuditLog = z.infer<typeof auditLogSchema>;
export type Capability = z.infer<typeof capabilitySchema>;
export type Provider = z.infer<typeof providerSchema>;
export type Region = z.infer<typeof regionSchema>;
export type BootstrapToken = z.infer<typeof bootstrapTokenSchema>;

export type TokenStore = {
  getAccessToken(): string | undefined;
  getRefreshToken(): string | undefined;
  setTokens(tokens: AuthTokens): void;
  clear(): void;
};

export type RequestOptions = {
  method?: string;
  body?: unknown;
  auth?: boolean;
  retry?: boolean;
  signal?: AbortSignal;
};

export class HugeEdgeApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly body?: unknown,
  ) {
    super(message);
    this.name = "HugeEdgeApiError";
  }

  static async fromResponse(response: Response) {
    const text = await response.text();
    let body: unknown = undefined;

    if (text) {
      try {
        body = JSON.parse(text);
      } catch {
        body = text;
      }
    }

    const parsed = apiErrorResponseSchema.safeParse(body);
    const message =
      parsed.success && parsed.data.error
        ? parsed.data.error
        : `HugeEdge API request failed with status ${response.status}`;

    return new HugeEdgeApiError(message, response.status, body);
  }
}

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

  async login(email: string, password: string, signal?: AbortSignal) {
    const tokens = authTokensSchema.parse(
      await this.request("/v1/auth/login", {
        method: "POST",
        body: { email, password },
        auth: false,
        signal,
      }),
    );
    this.tokenStore?.setTokens(tokens);
    return tokens;
  }

  async refresh(signal?: AbortSignal) {
    const refreshToken = this.tokenStore?.getRefreshToken();
    if (!refreshToken) {
      this.tokenStore?.clear();
      throw new HugeEdgeApiError("missing refresh token", 401);
    }

    try {
      const tokens = authTokensSchema.parse(
        await this.request("/v1/auth/refresh", {
          method: "POST",
          body: { refreshToken },
          auth: false,
          retry: false,
          signal,
        }),
      );
      this.tokenStore?.setTokens(tokens);
      return tokens;
    } catch (error) {
      this.tokenStore?.clear();
      throw error;
    }
  }

  async logout(signal?: AbortSignal) {
    try {
      await this.request("/v1/auth/logout", {
        method: "POST",
        retry: false,
        signal,
      });
    } catch (error) {
      if (!(error instanceof HugeEdgeApiError) || error.status !== 401) {
        throw error;
      }
    } finally {
      this.tokenStore?.clear();
    }
  }

  me(signal?: AbortSignal) {
    return this.request("/v1/app/me", { signal }).then((data) =>
      actorSchema.parse(data),
    );
  }

  tenants(signal?: AbortSignal) {
    return this.request("/v1/admin/tenants", { signal }).then((data) =>
      z.array(tenantSchema).parse(data),
    );
  }

  tenant(tenantId: string, signal?: AbortSignal) {
    return this.request(`/v1/admin/tenants/${tenantId}`, { signal }).then(
      (data) => tenantSchema.parse(data),
    );
  }

  createTenant(input: { name: string; slug: string }, signal?: AbortSignal) {
    return this.request("/v1/admin/tenants", {
      method: "POST",
      body: input,
      signal,
    }).then((data) => tenantSchema.parse(data));
  }

  nodes(signal?: AbortSignal) {
    return this.request("/v1/admin/nodes", { signal }).then((data) =>
      z.array(nodeSchema).parse(data),
    );
  }

  node(nodeId: string, signal?: AbortSignal) {
    return this.request(`/v1/admin/nodes/${nodeId}`, { signal }).then((data) =>
      nodeSchema.parse(data),
    );
  }

  auditLogs(signal?: AbortSignal) {
    return this.request("/v1/admin/audit-logs", { signal }).then((data) =>
      z.array(auditLogSchema).parse(data),
    );
  }

  capabilities(signal?: AbortSignal) {
    return this.request("/v1/admin/capabilities", { signal }).then((data) =>
      z.array(capabilitySchema).parse(data),
    );
  }

  providers(signal?: AbortSignal) {
    return this.request("/v1/admin/providers", { signal }).then((data) =>
      z.array(providerSchema).parse(data),
    );
  }

  regions(signal?: AbortSignal) {
    return this.request("/v1/admin/regions", { signal }).then((data) =>
      z.array(regionSchema).parse(data),
    );
  }

  createBootstrapToken(signal?: AbortSignal) {
    return this.request("/v1/admin/nodes/bootstrap-tokens", {
      method: "POST",
      signal,
    }).then((data) => bootstrapTokenSchema.parse(data));
  }

  private async request<T = unknown>(
    path: string,
    options: RequestOptions = {},
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
      signal: options.signal,
    });

    if (
      response.status === 401 &&
      options.retry !== false &&
      options.auth !== false
    ) {
      try {
        await this.refresh(options.signal);
        return this.request<T>(path, { ...options, retry: false });
      } catch (refreshError) {
        this.tokenStore?.clear();
        throw refreshError;
      }
    }

    if (!response.ok) {
      throw await HugeEdgeApiError.fromResponse(response);
    }

    if (response.status === 204) {
      return undefined as T;
    }

    return (await response.json()) as T;
  }
}
