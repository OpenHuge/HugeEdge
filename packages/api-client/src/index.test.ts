import { afterEach, describe, expect, it, vi } from "vitest";
import {
  type AuthTokens,
  BrowserTokenStore,
  type HugeEdgeApiError,
  HugeEdgeClient,
  type TokenStore,
} from "./index";

describe("BrowserTokenStore", () => {
  it("is constructible for browser token transport", () => {
    expect(new BrowserTokenStore()).toBeTruthy();
  });
});

describe("HugeEdgeClient", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("refreshes once and retries an authenticated request", async () => {
    const store = new MemoryTokenStore({
      accessToken: "expired",
      refreshToken: "refresh",
      expiresIn: 900,
    });
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(jsonResponse({ error: "invalid token" }, 401))
      .mockResolvedValueOnce(
        jsonResponse({
          accessToken: "fresh",
          refreshToken: "rotated",
          expiresIn: 900,
        }),
      )
      .mockResolvedValueOnce(jsonResponse([{ id: "tenant-1" }]));

    const client = new HugeEdgeClient("http://api.test", store);

    await expect(client.tenants()).resolves.toEqual([{ id: "tenant-1" }]);
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(store.getAccessToken()).toBe("fresh");
    expect(store.getRefreshToken()).toBe("rotated");
  });

  it("clears tokens when refresh fails", async () => {
    const store = new MemoryTokenStore({
      accessToken: "expired",
      refreshToken: "refresh",
      expiresIn: 900,
    });
    vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(jsonResponse({ error: "invalid token" }, 401))
      .mockResolvedValueOnce(jsonResponse({ error: "invalid refresh" }, 401));

    const client = new HugeEdgeClient("http://api.test", store);

    await expect(client.me()).rejects.toThrow("invalid refresh");
    expect(store.getAccessToken()).toBeUndefined();
    expect(store.getRefreshToken()).toBeUndefined();
  });

  it("surfaces server error text and status", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      jsonResponse({ error: "tenant slug already exists" }, 409),
    );
    const client = new HugeEdgeClient(
      "http://api.test",
      new MemoryTokenStore({
        accessToken: "access",
        refreshToken: "refresh",
        expiresIn: 900,
      }),
    );

    await expect(
      client.createTenant({ name: "Acme", slug: "acme" }),
    ).rejects.toMatchObject({
      status: 409,
      message: "tenant slug already exists",
    } satisfies Partial<HugeEdgeApiError>);
  });

  it("exposes typed detail and seed read methods", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockImplementation(async () => jsonResponse({ id: "ok" }));
    const client = new HugeEdgeClient(
      "http://api.test",
      new MemoryTokenStore({
        accessToken: "access",
        refreshToken: "refresh",
        expiresIn: 900,
      }),
    );

    await client.tenant("tenant-1");
    await client.node("node-1");
    await client.rollouts("node-1");
    await client.rollout("rollout-1");
    await client.createRollout({
      nodeId: "node-1",
      adapterName: "xray-adapter",
      config: { mode: "baseline" },
    });
    await client.rollbackRollout("rollout-1");
    await client.providers();
    await client.regions();
    await client.accounts();
    await client.createAccount({
      type: "organization",
      name: "Northwind",
      billingEmail: "billing@northwind.example",
    });
    await client.updateAccount({ id: "acc-1", status: "suspended" });
    await client.billingOverview();
    await client.catalogProducts();
    await client.appSubscriptions();
    await client.appSubscription("sub-1");
    await client.appOrders();
    await client.appOrder("ord-1");
    await client.appSubscriptionFeeds();

    expect(fetchMock.mock.calls.map(([input]) => String(input))).toEqual([
      "http://api.test/v1/admin/tenants/tenant-1",
      "http://api.test/v1/admin/nodes/node-1",
      "http://api.test/v1/admin/rollouts?nodeId=node-1",
      "http://api.test/v1/admin/rollouts/rollout-1",
      "http://api.test/v1/admin/rollouts",
      "http://api.test/v1/admin/rollouts/rollout-1/rollback",
      "http://api.test/v1/admin/providers",
      "http://api.test/v1/admin/regions",
      "http://api.test/v1/admin/accounts",
      "http://api.test/v1/admin/accounts",
      "http://api.test/v1/admin/accounts",
      "http://api.test/v1/app/billing/overview",
      "http://api.test/v1/app/catalog/products",
      "http://api.test/v1/app/subscriptions",
      "http://api.test/v1/app/subscriptions/sub-1",
      "http://api.test/v1/app/orders",
      "http://api.test/v1/app/orders/ord-1",
      "http://api.test/v1/app/subscription-feeds",
    ]);
  });
});

class MemoryTokenStore implements TokenStore {
  private tokens?: AuthTokens;

  constructor(tokens?: AuthTokens) {
    this.tokens = tokens;
  }

  getAccessToken() {
    return this.tokens?.accessToken;
  }

  getRefreshToken() {
    return this.tokens?.refreshToken;
  }

  setTokens(tokens: AuthTokens) {
    this.tokens = tokens;
  }

  clear() {
    this.tokens = undefined;
  }
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
