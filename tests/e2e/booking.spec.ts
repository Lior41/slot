import { test, expect } from "@playwright/test";
test("client reserves, confirms, moves and cancels a session", async ({ page }) => {
  await page.goto("/demo");
  await page.getByRole("button", { name: /Explore as a client/ }).click();
  await expect(page).toHaveURL(/\/book/);
  await page.locator(".slot-card").first().click();
  await page.getByRole("button", { name: "Reserve my place" }).click();
  await page.getByRole("button", { name: "Confirm demo payment", exact: true }).click();
  await expect(page.getByText("You’re on the list.")).toBeVisible();
  await page.getByRole("link", { name: "View my sessions" }).click();
  await page.getByRole("button", { name: "Reschedule", exact: true }).click();
  const select = page.getByLabel("Choose another time for the same service");
  const value = await select.locator("option").nth(1).getAttribute("value");
  await select.selectOption(value!);
  await page.getByRole("button", { name: "Confirm new time" }).click();
  await expect(select).not.toBeVisible();
  await page.getByRole("button", { name: "Cancel reservation", exact: true }).click();
  await page.getByRole("button", { name: "Yes, cancel", exact: true }).click();
  await expect(page.locator(".badge")).toHaveText("CANCELLED");
  await page.getByRole("button", { name: "Switch to coach" }).click();
  await expect(page.getByRole("heading", { name: "Your studio, in motion." })).toBeVisible();
});
test("demo data is isolated and cross-origin commands are rejected", async ({
  browser,
  baseURL,
}) => {
  const one = await browser.newContext(),
    two = await browser.newContext();
  try {
    for (const context of [one, two])
      expect(
        (
          await context.request.post(`${baseURL}/api/demo`, {
            headers: { Origin: baseURL! },
            data: { role: "CLIENT" },
          })
        ).ok(),
      ).toBe(true);
    const a = await (await one.request.get(`${baseURL}/api/studio`)).json(),
      b = await (await two.request.get(`${baseURL}/api/studio`)).json();
    expect(a.actor.workspaceId).not.toBe(b.actor.workspaceId);
    const forbidden = await two.request.post(`${baseURL}/api/commands`, {
      headers: { Origin: baseURL! },
      data: { action: "reserve", slotId: a.slots[0].id },
    });
    expect(forbidden.status()).toBe(409);
    const csrf = await one.request.post(`${baseURL}/api/commands`, {
      headers: { Origin: "https://unrelated.example" },
      data: { action: "reserve", slotId: a.slots[0].id },
    });
    expect(csrf.status()).toBe(403);
    const role = await one.request.post(`${baseURL}/api/commands`, {
      headers: { Origin: baseURL! },
      data: { action: "cancelSlot", id: a.slots[0].id },
    });
    expect(role.status()).toBe(403);
    const race = await one.request.post(`${baseURL}/api/race`, { headers: { Origin: baseURL! } });
    expect(race.ok()).toBe(true);
    const result = await race.json();
    expect(result.results.filter((r: { success: boolean }) => r.success)).toHaveLength(1);
  } finally {
    await one.close();
    await two.close();
  }
});
