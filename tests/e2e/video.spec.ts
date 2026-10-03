import { expect, test } from "@playwright/test";
import { expectAudibleNarration } from "./media-audio";

for (const language of ["English", "Français"]) {
  test(`walkthrough actually plays, pauses and restarts in ${language}`, async ({ page }) => {
    await page.goto("/demo-video");
    await page.getByRole("button", { name: new RegExp(language) }).click();
    await page.getByRole("button", { name: "Play video", exact: true }).click();
    const video = page.locator("video");
    await expect
      .poll(() => video.evaluate((v: HTMLVideoElement) => v.currentTime), { timeout: 15000 })
      .toBeGreaterThan(0.5);
    await expectAudibleNarration(video);
    await page.getByRole("button", { name: "Mute narration", exact: true }).click();
    await expect.poll(() => video.evaluate((v: HTMLVideoElement) => v.muted)).toBe(true);
    await page.getByRole("button", { name: "Unmute narration", exact: true }).click();
    await expect.poll(() => video.evaluate((v: HTMLVideoElement) => v.muted)).toBe(false);
    await page.getByRole("button", { name: "Pause video", exact: true }).click();
    await expect.poll(() => video.evaluate((v: HTMLVideoElement) => v.paused)).toBe(true);
    await page.getByRole("button", { name: "Restart video", exact: true }).click();
    await expect.poll(() => video.evaluate((v: HTMLVideoElement) => v.currentTime)).toBe(0);
    const transcript = await page
      .getByRole("link", { name: "Read the transcript" })
      .getAttribute("href");
    const response = await page.request.get(transcript!);
    expect(response.ok()).toBe(true);
    expect((await response.text()).length).toBeGreaterThan(100);
  });
}

test("failed media gives a retry and readable fallback", async ({ page }) => {
  await page.route("**/demo/*.mp4*", (route) => route.abort());
  await page.goto("/demo-video");
  await page.getByRole("button", { name: "Play video", exact: true }).click();
  await expect(page.getByRole("status")).toContainText(/could not/);
  await expect(page.getByRole("button", { name: "Retry video" })).toBeVisible();
  await page.getByRole("link", { name: "Read the transcript" }).click();
  await expect(page.locator("body")).not.toBeEmpty();
});
