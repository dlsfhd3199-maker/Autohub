import { expect, test } from "@playwright/test";

test("shows the phase-one foundation page", async ({ page }) => {
  await page.goto("/");

  await expect(
    page.getByRole("heading", { name: "콘텐츠 운영의 기반을 준비했습니다." }),
  ).toBeVisible();
});
