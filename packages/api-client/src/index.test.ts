import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  BrowserTokenStore,
  HugeEdgeApiError,
  HugeEdgeClient,
} from "./index";

function jsonResponse(status: number, body?: unknown) {
  return Promise.resolve(
    new Response(body === undefined ? null : JSON.stringify(body), {
      status,
      headers: { "Content-Type": "application/json" },
    }),
  );
}

beforeEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();

  const storage = new Map<string, string>();
  vi.stubGlobal("localStorage", {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => {
      storage.set(key, value);
    },
    removeItem: (key: string) => {
      storage.delete(key);
    },
    clear: () => {
      storage.clear();
    },
  });
});

describe("HugeEdgeClient", () => {
  it("stores tokens on login", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() =>
        jsonResponse(200, {
          accessToken: "access-token",
          refreshToken: "refresh-token",
          expiresIn: 900,
        }),
      ),
    );

    const store = new BrowserTokenStore();
    const client = new HugeEdgeClient("http://localhost:8080", store);

    await client.login("admin@hugeedge.local", "hugeedge");

    expect(store.getAccessToken()).toBe("access-token");
    expect(store.getRefreshToken()).toBe("refresh-token");
  });

  it("refreshes and retries once on 401", async () => {
    const fetchMock = vi
      .fn()
      .mockImplementationOnce(() =>
        jsonResponse(401, { error: "invalid token" }),
      )
      .mockImplementationOnce(() =>
        jsonResponse(200, {
          accessToken: "next-access-token",
          refreshToken: "next-refresh-token",
          expiresIn: 900,
        }),
      )
      .mockImplementationOnce(() =>
        jsonResponse(200, [
          {
            id: "tenant-1",
            name: "Default Tenant",
            slug: "default",
            status: "active",
            createdAt: "2026-04-21T00:00:00Z",
          },
        ]),
      );

    vi.stubGlobal("fetch", fetchMock);

    const store = new BrowserTokenStore();
    store.setTokens({
      accessToken: "expired-access-token",
      refreshToken: "refresh-token",
      expiresIn: 900,
    });

    const client = new HugeEdgeClient("http://localhost:8080", store);
    const tenants = await client.tenants();

    expect(tenants).toHaveLength(1);
    expect(store.getAccessToken()).toBe("next-access-token");
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it("clears stored tokens when refresh fails", async () => {
    const fetchMock = vi
      .fn()
      .mockImplementationOnce(() =>
        jsonResponse(401, { error: "invalid token" }),
      )
      .mockImplementationOnce(() =>
        jsonResponse(401, { error: "invalid refresh token" }),
      );

    vi.stubGlobal("fetch", fetchMock);

    const store = new BrowserTokenStore();
    store.setTokens({
      accessToken: "expired-access-token",
      refreshToken: "expired-refresh-token",
      expiresIn: 900,
    });

    const client = new HugeEdgeClient("http://localhost:8080", store);

    await expect(client.tenants()).rejects.toBeInstanceOf(HugeEdgeApiError);
    expect(store.getAccessToken()).toBeUndefined();
    expect(store.getRefreshToken()).toBeUndefined();
  });

  it("clears local tokens on logout even after a 401", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() => jsonResponse(401, { error: "invalid token" })),
    );

    const store = new BrowserTokenStore();
    store.setTokens({
      accessToken: "access-token",
      refreshToken: "refresh-token",
      expiresIn: 900,
    });

    const client = new HugeEdgeClient("http://localhost:8080", store);
    await client.logout();

    expect(store.getAccessToken()).toBeUndefined();
    expect(store.getRefreshToken()).toBeUndefined();
  });

  it("surfaces server error text and status", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() =>
        jsonResponse(409, { error: "tenant slug already exists" }),
      ),
    );

    const client = new HugeEdgeClient(
      "http://localhost:8080",
      new BrowserTokenStore(),
    );

    await expect(
      client.createTenant({ name: "Acme", slug: "acme" }),
    ).rejects.toMatchObject({
      status: 409,
      message: "tenant slug already exists",
    } satisfies Partial<HugeEdgeApiError>);
  });

  it("exposes typed detail and seed read methods", async () => {
    const fetchMock = vi.fn((input: RequestInfo | URL) => {
      const url = String(input);

      if (url.endsWith("/v1/admin/tenants/tenant-1")) {
        return jsonResponse(200, {
          id: "tenant-1",
          name: "Default Tenant",
          slug: "default",
          status: "active",
          createdAt: "2026-04-21T00:00:00Z",
        });
      }

      if (url.endsWith("/v1/admin/nodes/node-1")) {
        return jsonResponse(200, {
          id: "node-1",
          tenantId: "tenant-1",
          name: "bootstrap-node",
          status: "ready",
          adapterName: "xray-adapter",
          lastHeartbeatAt: "2026-04-21T00:00:00Z",
          createdAt: "2026-04-21T00:00:00Z",
        });
      }

      if (url.endsWith("/v1/admin/providers")) {
        return jsonResponse(200, [
          { id: "provider-1", name: "AWS", slug: "aws" },
        ]);
      }

      if (url.endsWith("/v1/admin/regions")) {
        return jsonResponse(200, [
          {
            id: "region-1",
            providerId: "provider-1",
            name: "us-east-1",
            code: "us-east-1",
          },
        ]);
      }

      return jsonResponse(404, { error: "not found" });
    });

    vi.stubGlobal("fetch", fetchMock);

    const client = new HugeEdgeClient(
      "http://localhost:8080",
      new BrowserTokenStore(),
    );

    await expect(client.tenant("tenant-1")).resolves.toMatchObject({
      id: "tenant-1",
    });
    await expect(client.node("node-1")).resolves.toMatchObject({
      id: "node-1",
      lastHeartbeatAt: "2026-04-21T00:00:00Z",
    });
    await expect(client.providers()).resolves.toHaveLength(1);
    await expect(client.regions()).resolves.toHaveLength(1);
  });
});
