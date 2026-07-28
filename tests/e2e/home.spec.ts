import { expect, test } from "@playwright/test";
import { e2eAccounts } from "./global-setup";

async function login(page: import("@playwright/test").Page, account: { email: string; password: string }) {
  await page.goto("/login");
  await page.getByLabel("이메일").fill(account.email);
  await page.getByLabel("비밀번호").fill(account.password);
  await page.getByRole("button", { name: "로그인" }).click();
  await expect(page).toHaveURL(/\/workspace\/brands/);
}

test.describe.serial("checkpoint 3 role workflows", () => {
  test("admin creates and updates a virtual brand", async ({ page }) => {
    await login(page, e2eAccounts.admin);
    await page.getByText("+ 새 브랜드").click();
    const suffix = Date.now();
    const brandName = `Virtual Paw ${suffix}`;
    await page.getByLabel("브랜드명").fill(brandName);
    await page.getByLabel("브랜드 키").fill(`virtual-paw-${suffix}`);
    await page.getByLabel("가상 도메인").fill(`paw-${suffix}.example.com`);
    await page.getByLabel("광고주 조직").selectOption({ label: "Virtual Advertiser" });
    await page.getByRole("button", { name: "브랜드 생성" }).click();
    await expect(page.getByText(brandName, { exact: true })).toBeVisible();
    await page.getByText(brandName, { exact: true }).locator("..").getByRole("link", { name: "상세 보기" }).click();
    await page.getByLabel("브랜드명").fill(`${brandName} Updated`);
    await page.getByRole("button", { name: "수정 저장" }).click();
    await expect(page.getByText("브랜드 정보를 수정했습니다.")).toBeVisible();
  });

  test("admin assigns an AE and AE sees only assigned brands", async ({ page }) => {
    await login(page, e2eAccounts.admin);
    await page.goto("/workspace/people?brandId=32000000-0000-4000-8000-000000000001");
    await page.getByLabel("담당자").selectOption({ label: "담당자 A · AE" });
    await page.getByRole("button", { name: "배정", exact: true }).click();
    await expect(page.getByRole("cell", { name: "담당자 A" })).toBeVisible();
    await page.getByRole("button", { name: "로그아웃" }).click();
    await login(page, e2eAccounts.ae);
    await expect(page.getByText("Virtual Lumi")).toBeVisible();
    await expect(page.getByText("Virtual Bridge")).toHaveCount(0);
    await page.goto("/workspace/brands/32000000-0000-4000-8000-000000000002");
    await expect(page.getByRole("heading", { name: "권한 없음" })).toBeVisible();
    await expect(page.getByText("Virtual Bridge")).toHaveCount(0);
  });

  test("advertiser has a read-only brand and content view", async ({ page }) => {
    await login(page, e2eAccounts.advertiser);
    await page.getByRole("link", { name: "상세 보기" }).click();
    await expect(page.getByText("읽기 전용 권한입니다.")).toBeVisible();
    await expect(page.getByRole("button", { name: "수정 저장" })).toHaveCount(0);
  });

  test("content search and status filter stay brand scoped", async ({ page }) => {
    await login(page, e2eAccounts.advertiser);
    await page.goto("/workspace/content");
    await page.getByPlaceholder("제목 또는 키워드 검색").fill("Search Guide");
    await page.getByLabel("상태").selectOption("draft");
    await page.getByRole("button", { name: "검색" }).click();
    await expect(page.getByText("Virtual Lumi Search Guide")).toBeVisible();
    await expect(page.getByText("Virtual Bridge Private Guide")).toHaveCount(0);
  });

  test("studio autosaves blocks, creates versions, and detects tab conflicts", async ({ page, context }) => {
    await login(page, e2eAccounts.admin);
    await page.goto("/workspace/content");
    await page.getByText("+ 새 콘텐츠").click();
    const slug = `virtual-studio-${Date.now()}`;
    const createForm = page.locator(".create-panel form");
    await createForm.locator('select[name="brandId"]').selectOption({ label: "Virtual Lumi" });
    await createForm.locator('input[name="title"]').fill("Virtual Studio E2E Guide");
    await createForm.locator('input[name="slug"]').fill(slug);
    await createForm.locator('input[name="primaryKeyword"]').fill("virtual studio keyword");
    await createForm.getByRole("button", { name: "콘텐츠 생성" }).click();
    await expect(page).toHaveURL(/\/studio$/);
    const firstSave = page.waitForResponse((response) => response.url().includes("/draft") && response.request().method() === "PATCH");
    await page.getByRole("button", { name: "FAQ" }).click();
    await page.getByLabel("FAQ 항목").fill("가상 질문 | 가상 답변");
    await page.getByLabel("일반 문단 내용").fill("자동 저장된 가상 문단");
    await page.getByRole("button", { name: "위로 이동" }).last().click();
    await expect(page.getByText("저장 대기")).toBeVisible();
    const firstSaveResponse = await firstSave;
    expect(firstSaveResponse.status(), await firstSaveResponse.text()).toBe(200);
    await expect(page.getByText("저장 완료")).toBeVisible({ timeout: 9000 });
    await page.reload();
    await expect(page.getByLabel("FAQ 항목")).toHaveValue("가상 질문 | 가상 답변");
    await page.getByLabel("변경 요약").fill("가상 첫 버전");
    await page.getByRole("button", { name: "새 버전 생성" }).click();
    await expect(page.getByText("v1 · draft")).toBeVisible();
    await expect(page.getByText(/추가 \d+ · 삭제 \d+ · 변경 \d+/)).toBeVisible();

    const second = await context.newPage();
    await second.goto(page.url());
    const tabSave = page.waitForResponse((response) => response.url().includes("/draft") && response.request().method() === "PATCH");
    await page.getByLabel("제목", { exact: true }).fill("Virtual Studio First Tab");
    await expect(page.getByText("저장 대기")).toBeVisible();
    const tabSaveResponse = await tabSave;
    expect(tabSaveResponse.status(), await tabSaveResponse.text()).toBe(200);
    await expect(page.getByText("저장 완료")).toBeVisible({ timeout: 9000 });
    await second.getByLabel("제목", { exact: true }).fill("Virtual Studio Second Tab");
    await expect(second.getByText("충돌 발생")).toBeVisible({ timeout: 9000 });
    await expect(second.getByRole("button", { name: "최신본 다시 불러오기" })).toBeVisible();
    await expect(second.getByRole("button", { name: "내 편집본 유지" })).toBeVisible();
    await second.close();
  });

  test("advertiser studio is read only and mobile editor remains usable", async ({ page }) => {
    await login(page, e2eAccounts.advertiser);
    await page.goto("/workspace/content/42000000-0000-4000-8000-000000000001/studio");
    await expect(page.getByText("광고주는 콘텐츠와 버전 이력을 읽을 수 있지만 편집할 수 없습니다.")).toBeVisible();
    await expect(page.getByRole("button", { name: "새 버전 생성" })).toHaveCount(0);
    await page.getByRole("button", { name: "로그아웃" }).click();
    await page.setViewportSize({ width: 390, height: 844 });
    await login(page, e2eAccounts.ae);
    await page.goto("/workspace/content/42000000-0000-4000-8000-000000000001/studio");
    await expect(page.getByLabel("일반 문단 내용")).toBeVisible();
  });
});
