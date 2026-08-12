import { expect, test } from "@playwright/test";
import { e2eAccounts } from "./global-setup";

const brandId = "32000000-0000-4000-8000-000000000001";

async function login(page: import("@playwright/test").Page, account: { email: string; password: string }) {
  await page.goto("/login");
  await page.locator('input[name="email"]').fill(account.email);
  await page.locator('input[name="password"]').fill(account.password);
  await page.locator('button[type="submit"]').click();
  await expect(page).toHaveURL(/\/workspace/);
}

test("administrator sees provider and connector registries without secrets", async ({ page }) => {
  await login(page, e2eAccounts.admin);
  await page.goto("/workspace/ai-settings");
  await expect(page.getByRole("heading", { name: "AI 공급자 설정" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Deterministic fake provider" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "OpenAI" })).toBeVisible();
  await expect(page.getByText("차단", { exact: true })).toHaveCount(2);

  await page.goto(`/workspace/brands/${brandId}/integrations`);
  await expect(page.getByText(/카페24 연결 준비 중 · 실제 쇼핑몰 미연결 상태/)).toBeVisible();
  await expect(page.getByRole("button", { name: "블로그 게시판 커넥터 설치 전" })).toBeDisabled();
  await expect(page.getByRole("button", { name: "Cafe24 커넥터 설치 전" })).toBeDisabled();
  await expect(page.locator("body")).not.toContainText(/bearer|credential_reference|authorization/i);
});

test("AE cannot access administrator system-provider settings", async ({ page }) => {
  await login(page, e2eAccounts.ae);
  await page.goto("/workspace/ai-settings");
  await expect(page.getByRole("heading", { name: "시스템 AI 공급자 설정 권한이 없습니다" })).toBeVisible();
  await expect(page.locator("body")).not.toContainText(/bearer|credential_reference|authorization/i);
});
