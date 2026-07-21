import { expect, test } from "@playwright/test";

test("shows the phase-one foundation page", async ({ page }) => {
  await page.goto("/");

  await expect(
    page.getByRole("heading", { name: "콘텐츠 운영의 기반을 준비했습니다." }),
  ).toBeVisible();
});

test("shows the login form without exposing sample credentials", async ({ page }) => {
  await page.goto("/login");

  await expect(page.getByLabel("이메일")).toBeVisible();
  await expect(page.getByLabel("비밀번호")).toBeVisible();
  await expect(page.getByRole("button", { name: "로그인" })).toBeVisible();
});
