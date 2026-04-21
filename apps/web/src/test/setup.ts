import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach, beforeEach, vi } from "vitest";
import { queryClient } from "../lib/query-client";
import { resetSessionState } from "../lib/session";

const suppressedErrors = [
  "In HTML, <html> cannot be a child of <div>.",
  "In HTML, <html> cannot be a child of <html>.",
  "This will cause a hydration error.",
];

beforeEach(() => {
  queryClient.clear();
  window.localStorage.clear();
  const consoleError = console.error;
  vi.spyOn(console, "error").mockImplementation((message, ...args) => {
    if (
      typeof message === "string" &&
      suppressedErrors.some((entry) => message.includes(entry))
    ) {
      return;
    }
    consoleError(message, ...args);
  });
  vi.stubGlobal("scrollTo", vi.fn());
  vi.stubGlobal(
    "matchMedia",
    vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  );
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  );
});

afterEach(() => {
  cleanup();
  resetSessionState();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});
