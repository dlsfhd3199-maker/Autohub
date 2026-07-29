import { expect, test } from "@playwright/test";
import { e2eAccounts } from "./global-setup";

async function login(page: import("@playwright/test").Page, account: { email: string; password: string }) {
  await page.goto("/login");
  await page.getByLabel("이메일").fill(account.email);
  await page.getByLabel("비밀번호").fill(account.password);
  await page.getByRole("button", { name: "로그인" }).click();
  await expect(page).toHaveURL(/\/workspace/);
}

test("administrator publishes an immutable version through a brand-scoped bearer API", async ({ page, request }) => {
  await login(page, e2eAccounts.admin);
  await page.goto("/workspace/brands/32000000-0000-4000-8000-000000000001");
  await page.getByRole("button", { name: "연결 키 생성" }).click();
  const rawKey = await page.locator(".one-time-key code").textContent();
  expect(rawKey).toMatch(/^ahp_[A-Za-z0-9_-]{43}$/);

  await page.goto("/workspace/content/42000000-0000-4000-8000-000000000001/studio");
  const versionForm = page.locator(".version-form");
  await versionForm.getByLabel("변경 요약").fill("가상 테스트 발행 버전");
  await versionForm.getByRole("button", { name: "새 버전 생성" }).click();
  await expect(page.getByText("v1", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "선택 버전 테스트 발행" }).click();
  await expect(page.getByText(/선택한 불변 버전을 테스트 발행했습니다/)).toBeVisible();

  const list = await request.get("/api/publishing/v1/brands/virtual-lumi/contents", { headers: { authorization: `Bearer ${rawKey}` } });
  expect(list.status()).toBe(200);
  expect(list.headers().etag).toBeTruthy();
  expect(list.headers()["last-modified"]).toBeTruthy();
  const body = await list.json();
  expect(body.items).toHaveLength(1);
  expect(body.items[0]).toMatchObject({ slug: "virtual-lumi-search-guide", status: "test_published", versionNo: 1 });
  expect(JSON.stringify(body)).not.toContain("노출 금지 초안");

  const detail = await request.get("/api/publishing/v1/brands/virtual-lumi/contents/virtual-lumi-search-guide", { headers: { authorization: `Bearer ${rawKey}` } });
  expect(detail.status()).toBe(200);
  const notModified = await request.get("/api/publishing/v1/brands/virtual-lumi/contents/virtual-lumi-search-guide", { headers: { authorization: `Bearer ${rawKey}`, "if-none-match": detail.headers().etag } });
  expect(notModified.status()).toBe(304);
  expect((await request.get("/api/publishing/v1/brands/virtual-bridge/contents", { headers: { authorization: `Bearer ${rawKey}` } })).status()).toBe(401);
  expect((await request.get("/api/publishing/v1/brands/virtual-lumi/contents", { headers: { authorization: "Bearer ahp_AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA" } })).status()).toBe(401);
});

test("AE cannot see the test-publish control", async ({ page }) => {
  await login(page, e2eAccounts.admin);
  await page.goto("/workspace/people?brandId=32000000-0000-4000-8000-000000000001");
  const unassigned = page.getByLabel("미배정 구성원");
  if (await unassigned.locator('option', { hasText: "담당자 A · AE" }).count()) {
    await unassigned.selectOption({ label: "담당자 A · AE" });
    await page.getByRole("button", { name: "브랜드에 배정" }).click();
  }
  await page.getByRole("button", { name: "로그아웃" }).click();
  await login(page, e2eAccounts.ae);
  await page.goto("/workspace/content/42000000-0000-4000-8000-000000000001/studio");
  await expect(page.getByRole("heading", { name: "Virtual Lumi Search Guide" })).toBeVisible();
  await expect(page.getByText(/AE는 콘텐츠 생성·편집·버전 생성까지 가능/)).toBeVisible();
  await expect(page.getByRole("heading", { name: "테스트 발행" })).toHaveCount(0);
});
