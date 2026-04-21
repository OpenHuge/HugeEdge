import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  RouterProvider,
  createMemoryHistory,
  createRouter,
} from "@tanstack/react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { tokenStore } from "../lib/api";
import { queryClient } from "../lib/query-client";
import { routeTree } from "../routeTree.gen";

type JsonResponseInit = {
  status?: number;
  body?: unknown;
};

function jsonResponse({ status = 200, body }: JsonResponseInit) {
  return Promise.resolve(
    new Response(body === undefined ? null : JSON.stringify(body), {
      status,
      headers: { "Content-Type": "application/json" },
    }),
  );
}

function renderApp(path: string) {
  const router = createRouter({
    routeTree,
    history: createMemoryHistory({ initialEntries: [path] }),
  });

  const view = render(<RouterProvider router={router} />, {
    container: document.documentElement,
    baseElement: document.documentElement,
  });

  return { router, ...view };
}

beforeEach(() => {
  queryClient.clear();
  window.localStorage.clear();
});

describe("web app routes", () => {
  it("redirects unauthenticated admin visits to login", async () => {
    renderApp("/admin/overview");

    expect(await screen.findByRole("heading", { name: "Sign in" })).toBeVisible();
  });

  it("completes the real login flow and lands on overview", async () => {
    const fetchMock = vi.fn((input: RequestInfo | URL) => {
      const url = String(input);

      if (url.endsWith("/v1/auth/login")) {
        return jsonResponse({
          body: {
            accessToken: "access-token",
            refreshToken: "refresh-token",
            expiresIn: 900,
          },
        });
      }

      if (url.endsWith("/v1/app/me")) {
        return jsonResponse({
          body: {
            id: "user-1",
            email: "admin@hugeedge.local",
            tenantId: "tenant-1",
            roleIds: ["owner"],
            sessionId: "session-1",
          },
        });
      }

      if (url.endsWith("/v1/admin/tenants")) {
        return jsonResponse({
          body: [
            {
              id: "tenant-1",
              name: "Default Tenant",
              slug: "default",
              status: "active",
              createdAt: "2026-04-21T00:00:00Z",
            },
          ],
        });
      }

      if (url.endsWith("/v1/admin/nodes")) {
        return jsonResponse({
          body: [
            {
              id: "node-1",
              tenantId: "tenant-1",
              name: "bootstrap-node",
              status: "ready",
              adapterName: "xray-adapter",
              createdAt: "2026-04-21T00:00:00Z",
            },
          ],
        });
      }

      if (url.endsWith("/v1/admin/audit-logs")) {
        return jsonResponse({
          body: [
            {
              id: "audit-1",
              action: "auth.login",
              actorId: "user-1",
              tenantId: "tenant-1",
              createdAt: "2026-04-21T00:00:00Z",
            },
          ],
        });
      }

      return jsonResponse({ status: 404, body: { error: "not found" } });
    });

    vi.stubGlobal("fetch", fetchMock);

    renderApp("/login");

    await userEvent.click(await screen.findByRole("button", { name: "Sign in" }));

    expect(
      await screen.findByRole("heading", { name: "Overview" }),
    ).toBeVisible();
    expect(tokenStore.getAccessToken()).toBe("access-token");
  });

  it("keeps tenant URL state in sync with the filter bar", async () => {
    tokenStore.setTokens({
      accessToken: "access-token",
      refreshToken: "refresh-token",
      expiresIn: 900,
    });

    const fetchMock = vi.fn((input: RequestInfo | URL) => {
      const url = String(input);

      if (url.endsWith("/v1/app/me")) {
        return jsonResponse({
          body: {
            id: "user-1",
            email: "admin@hugeedge.local",
            tenantId: "tenant-1",
            roleIds: ["owner"],
            sessionId: "session-1",
          },
        });
      }

      if (url.endsWith("/v1/admin/tenants")) {
        return jsonResponse({
          body: [
            {
              id: "tenant-1",
              name: "Default Tenant",
              slug: "default",
              status: "active",
              createdAt: "2026-04-21T00:00:00Z",
            },
          ],
        });
      }

      return jsonResponse({ status: 404, body: { error: "not found" } });
    });

    vi.stubGlobal("fetch", fetchMock);

    const app = renderApp("/admin/tenants?q=default&sort=name&dir=asc");

    const searchInput = await screen.findByLabelText("Search");
    expect(searchInput).toHaveValue("default");

    await userEvent.clear(searchInput);
    await userEvent.type(searchInput, "edge");

    await waitFor(() => {
      expect(app.router.state.location.search.q).toBe("edge");
    });
  });

  it("shows bootstrap token success after the node action completes", async () => {
    tokenStore.setTokens({
      accessToken: "access-token",
      refreshToken: "refresh-token",
      expiresIn: 900,
    });

    const fetchMock = vi.fn((input: RequestInfo | URL) => {
      const url = String(input);

      if (url.endsWith("/v1/app/me")) {
        return jsonResponse({
          body: {
            id: "user-1",
            email: "admin@hugeedge.local",
            tenantId: "tenant-1",
            roleIds: ["owner"],
            sessionId: "session-1",
          },
        });
      }

      if (url.endsWith("/v1/admin/nodes")) {
        return jsonResponse({
          body: [
            {
              id: "node-1",
              tenantId: "tenant-1",
              name: "bootstrap-node",
              status: "ready",
              adapterName: "xray-adapter",
              createdAt: "2026-04-21T00:00:00Z",
            },
          ],
        });
      }

      if (url.endsWith("/v1/admin/nodes/bootstrap-tokens")) {
        return jsonResponse({
          status: 201,
          body: {
            token: "bootstrap-token",
            expiresAt: "2026-04-21T01:00:00Z",
          },
        });
      }

      return jsonResponse({ status: 404, body: { error: "not found" } });
    });

    vi.stubGlobal("fetch", fetchMock);

    renderApp("/admin/fleet/nodes");

    await userEvent.click(
      await screen.findByRole("button", { name: "Issue Bootstrap Token" }),
    );

    expect(await screen.findByText(/Bootstrap token issued/i)).toBeVisible();
  });
});
