import { HugeEdgeApiError, type Actor } from "@hugeedge/api-client";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { api, tokenStore } from "../lib/api";
import { queryClient } from "../lib/query-client";
import {
  ensureActor,
  loginWithPassword,
  logoutSession,
  queryKeys,
  resetSessionState,
  seedActor,
} from "../lib/session";

const actor: Actor = {
  id: "user-1",
  email: "admin@hugeedge.local",
  tenantId: "tenant-1",
  roleIds: ["owner"],
  sessionId: "session-1",
};

beforeEach(() => {
  vi.restoreAllMocks();
  queryClient.clear();
  window.localStorage.clear();
});

describe("session helpers", () => {
  it("resets tokens and cached queries", () => {
    tokenStore.setTokens({
      accessToken: "access-token",
      refreshToken: "refresh-token",
      expiresIn: 900,
    });
    seedActor(actor);

    resetSessionState();

    expect(tokenStore.getAccessToken()).toBeUndefined();
    expect(queryClient.getQueryData(queryKeys.actor)).toBeUndefined();
  });

  it("returns null without querying when there is no access token", async () => {
    const ensureQueryData = vi.spyOn(queryClient, "ensureQueryData");

    await expect(ensureActor()).resolves.toBeNull();
    expect(ensureQueryData).not.toHaveBeenCalled();
  });

  it("returns the actor when the current session is valid", async () => {
    tokenStore.setTokens({
      accessToken: "access-token",
      refreshToken: "refresh-token",
      expiresIn: 900,
    });
    vi.spyOn(queryClient, "ensureQueryData").mockResolvedValue(actor);

    await expect(ensureActor()).resolves.toEqual(actor);
  });

  it("clears session state on auth errors while resolving to null", async () => {
    tokenStore.setTokens({
      accessToken: "access-token",
      refreshToken: "refresh-token",
      expiresIn: 900,
    });
    seedActor(actor);
    vi.spyOn(queryClient, "ensureQueryData").mockRejectedValue(
      new HugeEdgeApiError("unauthorized", 401),
    );

    await expect(ensureActor()).resolves.toBeNull();
    expect(tokenStore.getAccessToken()).toBeUndefined();
    expect(queryClient.getQueryData(queryKeys.actor)).toBeUndefined();
  });

  it("rethrows non-auth errors from actor bootstrap", async () => {
    tokenStore.setTokens({
      accessToken: "access-token",
      refreshToken: "refresh-token",
      expiresIn: 900,
    });
    const error = new Error("boom");
    vi.spyOn(queryClient, "ensureQueryData").mockRejectedValue(error);

    await expect(ensureActor()).rejects.toThrow("boom");
    expect(tokenStore.getAccessToken()).toBe("access-token");
  });

  it("logs in and hydrates the actor query", async () => {
    vi.spyOn(api, "login").mockResolvedValue({
      accessToken: "access-token",
      refreshToken: "refresh-token",
      expiresIn: 900,
    });
    const fetchQuery = vi.spyOn(queryClient, "fetchQuery").mockResolvedValue(actor);

    await expect(
      loginWithPassword("admin@hugeedge.local", "hugeedge"),
    ).resolves.toEqual(actor);
    expect(api.login).toHaveBeenCalledWith("admin@hugeedge.local", "hugeedge");
    expect(fetchQuery).toHaveBeenCalledTimes(1);
  });

  it("logs out and clears local session state", async () => {
    tokenStore.setTokens({
      accessToken: "access-token",
      refreshToken: "refresh-token",
      expiresIn: 900,
    });
    seedActor(actor);
    vi.spyOn(api, "logout").mockResolvedValue(undefined);

    await logoutSession();

    expect(api.logout).toHaveBeenCalledTimes(1);
    expect(tokenStore.getAccessToken()).toBeUndefined();
    expect(queryClient.getQueryData(queryKeys.actor)).toBeUndefined();
  });
});
