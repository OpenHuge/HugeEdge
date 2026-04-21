import { expect, test } from "@playwright/test";

test("critical operator flow works end to end", async ({ page }) => {
  await page.goto("/admin/overview");
  await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();

  await page.getByLabel("Email").fill("admin@hugeedge.local");
  await page.getByLabel("Password").fill("hugeedge");
  await page.getByRole("button", { name: "Sign in" }).click();

  await expect(page.getByRole("heading", { name: "Overview" })).toBeVisible();

  await page.getByRole("link", { name: "Tenants" }).click();
  await expect(page.getByRole("heading", { name: "Tenants" })).toBeVisible();
  await expect(page.getByText("Default Tenant")).toBeVisible();

  await page.getByRole("link", { name: "Nodes" }).click();
  await expect(page.getByRole("heading", { name: "Fleet Nodes" })).toBeVisible();
  await page.getByRole("button", { name: "Issue Bootstrap Token" }).click();
  await expect(page.getByText(/Bootstrap token issued/i)).toBeVisible();

  await page.getByRole("link", { name: "Audit" }).click();
  await expect(page.getByRole("heading", { name: "Audit" })).toBeVisible();
  await expect(page.getByText("auth.login")).toBeVisible();

  await page.getByRole("button", { name: "Log out" }).click();
  await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
});
