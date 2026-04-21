import { describe, expect, it } from "vitest";
import { BrowserTokenStore } from "./index";

describe("BrowserTokenStore", () => {
  it("is constructible for browser token transport", () => {
    expect(new BrowserTokenStore()).toBeTruthy();
  });
});
