import { describe, expect, it } from "vitest";
import {
  buildListSearch,
  compareValues,
  includesQuery,
  normalizeListSearch,
} from "../lib/list-state";

describe("list-state helpers", () => {
  it("normalizes missing values with defaults", () => {
    expect(
      normalizeListSearch(
        { q: "edge" },
        { sort: "name", dir: "asc" },
      ),
    ).toEqual({
      q: "edge",
      status: "all",
      sort: "name",
      dir: "asc",
    });
  });

  it("builds url search state without empty values", () => {
    expect(
      buildListSearch({
        q: "",
        status: "all",
        sort: "createdAt",
        dir: "desc",
      }),
    ).toEqual({
      q: undefined,
      status: undefined,
      sort: "createdAt",
      dir: "desc",
    });
  });

  it("matches query values case-insensitively and trims whitespace", () => {
    expect(includesQuery(["Default Tenant", "tenant-1"], "  tenant ")).toBe(
      true,
    );
    expect(includesQuery(["Default Tenant"], "missing")).toBe(false);
    expect(includesQuery(["Default Tenant"], "   ")).toBe(true);
  });

  it("compares numeric values in both directions", () => {
    expect(compareValues(2, 10, "asc")).toBeLessThan(0);
    expect(compareValues(2, 10, "desc")).toBeGreaterThan(0);
  });

  it("compares string values with undefined fallbacks", () => {
    expect(compareValues(undefined, "beta", "asc")).toBeLessThan(0);
    expect(compareValues("zeta", "beta", "asc")).toBeGreaterThan(0);
  });
});
