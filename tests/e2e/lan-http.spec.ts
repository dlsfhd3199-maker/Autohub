import path from "node:path";
import { expect, test } from "@playwright/test";
import { e2eAccounts } from "./global-setup";

const lanBaseUrl = process.env.LAN_ACCEPTANCE_URL?.replace(/\/$/, "");

test("LAN HTTP supports block creation, duplication, autosave, restore and versioning", async ({ page }) => {
  test.skip(!lanBaseUrl, "LAN_ACCEPTANCE_URL is required for the manual LAN acceptance run");
  await page.goto(`${lanBaseUrl}/login`);
  await page.getByLabel("이메일").fill(e2eAccounts.admin.email);
  await page.getByLabel("비밀번호").fill(e2eAccounts.admin.password);
  await page.getByRole("button", { name: "로그인" }).click();
  await page.waitForURL(`${lanBaseUrl}/workspace/brands`);
  await page.goto(`${lanBaseUrl}/workspace/content`);

  await page.getByText("새 콘텐츠", { exact: true }).click();
  const suffix = Date.now();
  const createForm = page.locator(".content-create-form");
  await createForm.locator('select[name="brandId"]').selectOption({ label: "Virtual Lumi" });
  await createForm.locator('input[name="title"]').fill(`Virtual LAN UUID Guide ${suffix}`);
  await createForm.locator('input[name="slug"]').fill(`virtual-lan-uuid-${suffix}`);
  await createForm.locator('input[name="primaryKeyword"]').fill("virtual LAN UUID");
  await createForm.getByRole("button", { name: "콘텐츠 생성" }).click();
  await expect(page).toHaveURL(/\/studio$/);
  expect(await page.evaluate(() => typeof crypto.randomUUID)).toBe("undefined");

  await page.getByRole("button", { name: "FAQ", exact: true }).click();
  const faqEditors = page.getByLabel("FAQ 항목");
  await expect(faqEditors).toHaveCount(1);
  const faqBlock = page.locator(".block-editor").filter({ has: faqEditors });
  await faqBlock.getByRole("button", { name: "복제" }).click();
  await expect(faqEditors).toHaveCount(2);
  await faqEditors.nth(0).fill("가상 LAN 질문 | 가상 LAN 답변");

  const saved = page.waitForResponse((response) => response.url().includes("/draft") && response.request().method() === "PATCH");
  expect((await saved).status()).toBe(200);
  await expect(page.getByText("저장 완료")).toBeVisible({ timeout: 9_000 });
  await page.reload();
  await expect(page.getByLabel("FAQ 항목")).toHaveCount(2);
  await expect(page.getByLabel("FAQ 항목").nth(0)).toHaveValue("가상 LAN 질문 | 가상 LAN 답변");

  await page.getByLabel("변경 요약").fill("LAN HTTP UUID 호환성 검증");
  await page.getByRole("button", { name: "새 버전 생성" }).click();
  await expect(page.locator(".version-card")).toHaveCount(1);
  if (process.env.LAN_CAPTURE_DIR) {
    await page.screenshot({ path: path.join(process.env.LAN_CAPTURE_DIR, "08-lan-http-write-flow.png"), fullPage: true });
  }
});
