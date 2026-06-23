import { expect, test } from "@playwright/test";

test("debugging workspace loads and blocks unauthenticated runs", async ({ page }) => {
  await page.route("**/api/leaderboard**", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ data: { entries: [] } })
    })
  );

  await page.goto("/");
  await page.getByRole("link", { name: "Play" }).click();

  await expect(page.getByRole("button", { name: "Run Tests" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Run Tests" })).toBeDisabled();
  await expect(page.locator("#editor-host")).toBeVisible();
  await expect(page.locator("#visible-tests")).toBeVisible();
  await expect(page.locator("#hidden-tests")).toBeVisible();
  await expect(page.locator("#console-output")).toContainText("No run yet");

  await page.getByRole("button", { name: "Start Run" }).click();
  await expect(page.locator("#toast-zone")).toContainText("Sign in to start a server-scored run.");
});
