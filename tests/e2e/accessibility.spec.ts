import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { e2eAccounts } from "./global-setup";

async function login(page: import("@playwright/test").Page, account: { email: string; password: string }) {
  await page.goto("/login");
  await page.getByLabel("이메일").fill(account.email);
  await page.getByLabel("비밀번호").fill(account.password);
  await page.getByRole("button", { name: "로그인" }).click();
  await expect(page).toHaveURL(/\/workspace(?:\/brands)?$/);
}

async function expectNoSeriousViolations(page: import("@playwright/test").Page) {
  const result = await new AxeBuilder({ page }).analyze();
  expect(result.violations.filter((violation) => ["serious", "critical"].includes(violation.impact ?? ""))).toEqual([]);
}

test("@a11y login and administrator workflows have no serious axe violations", async ({ page }) => {
  await page.goto("/login");
  await expectNoSeriousViolations(page);
  await login(page, e2eAccounts.admin);
  for (const path of ["/workspace/brands", "/workspace/people", "/workspace/content", "/workspace/content/42000000-0000-4000-8000-000000000001/studio"]) {
    await page.goto(path);
    await expectNoSeriousViolations(page);
  }
});

test("@a11y advertiser read-only studio and 360px layout remain accessible", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await login(page, e2eAccounts.advertiser);
  await page.goto("/workspace/content/42000000-0000-4000-8000-000000000001/studio");
  await expectNoSeriousViolations(page);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(1);
});
