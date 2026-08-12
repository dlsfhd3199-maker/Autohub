import { expect, test } from "@playwright/test";
import { e2eAccounts } from "./global-setup";

async function login(page: import("@playwright/test").Page, account: { email: string; password: string }) {
  await page.goto("/login");
  await page.getByLabel("이메일").fill(account.email);
  await page.getByLabel("비밀번호").fill(account.password);
  await page.getByRole("button", { name: "로그인" }).click();
  await page.waitForURL(/\/workspace(?:\/brands)?$/);
  if (!page.url().endsWith("/workspace/brands")) await page.goto("/workspace/brands");
  await expect(page.getByRole("heading", { name: "브랜드 운영 현황" })).toBeVisible();
}

test.describe.serial("phase one role and UI workflows", () => {
  test("admin gets normalized brand fields, duplicate feedback and creation success", async ({ page }) => {
    await login(page, e2eAccounts.admin);
    await page.getByRole("button", { name: "새 브랜드 추가" }).click();
    const suffix = Date.now();
    await page.getByLabel("브랜드명").fill(`Virtual_UX ${suffix}`);
    await expect(page.locator('input[name="brandKey"]')).toHaveValue(`virtual-ux-${suffix}`);
    await page.getByLabel("연결 도메인", { exact: false }).fill("https://lumi.example.com/path/");
    await page.getByLabel("연결 도메인", { exact: false }).blur();
    await expect(page.getByLabel("연결 도메인", { exact: false })).toHaveValue("lumi.example.com");
    await page.getByLabel("기본 발행 경로").fill("guides");
    await page.getByLabel("기본 발행 경로").blur();
    await expect(page.getByLabel("기본 발행 경로")).toHaveValue("/guides");
    await page.getByLabel("광고주 조직").selectOption({ label: "Virtual Advertiser" });
    await page.getByRole("button", { name: "브랜드 생성" }).click();
    await expect(page.getByText("이미 등록된 연결 도메인입니다.")).toBeVisible();
    await page.getByLabel("연결 도메인", { exact: false }).fill(`ux-${suffix}.example.com`);
    await page.getByLabel("광고주 조직").selectOption({ label: "Virtual Advertiser" });
    await page.getByRole("button", { name: "브랜드 생성" }).click();
    await expect(page.getByRole("status").getByText("브랜드를 생성했습니다.")).toBeVisible();
    await page.getByRole("button", { name: "닫기" }).click();
    await expect(page.getByRole("heading", { name: `Virtual_UX ${suffix}` })).toBeVisible();
  });

  test("admin assigns an AE and AE sees only assigned brands", async ({ page }) => {
    await login(page, e2eAccounts.admin);
    await page.goto("/workspace/people?brandId=32000000-0000-4000-8000-000000000001");
    const directory = page.locator(".directory-panel");
    const aeDirectoryRow = directory.getByRole("listitem").filter({ hasText: "담당자 A" });
    await expect(aeDirectoryRow.locator("strong")).toContainText("담당자 A");
    await expect(aeDirectoryRow.getByLabel("역할: 마케터")).toBeVisible();
    await expect(aeDirectoryRow.getByLabel(/배정 상태: 현재 브랜드 (미배정|배정됨)/)).toBeVisible();
    const assignSelect = page.getByLabel("미배정 구성원");
    if (await assignSelect.count()) {
      const option = assignSelect.locator("option", { hasText: "담당자 A · AE" });
      if (await option.count()) {
        await assignSelect.selectOption({ label: "담당자 A · AE" });
        await page.getByRole("button", { name: "브랜드에 배정" }).click();
        await expect(page.getByText("담당자를 브랜드에 배정했습니다.")).toBeVisible();
      }
    }
    await page.getByRole("button", { name: "로그아웃" }).click();
    await login(page, e2eAccounts.ae);
    await expect(page.getByText("Virtual Lumi")).toBeVisible();
    await expect(page.getByText("Virtual Bridge")).toHaveCount(0);
    await page.goto("/workspace/brands/32000000-0000-4000-8000-000000000002");
    await expect(page.getByRole("heading", { name: "접근 권한이 없습니다" })).toBeVisible();
  });

  test("advertiser has read-only management and studio views", async ({ page }) => {
    await login(page, e2eAccounts.advertiser);
    await page.getByRole("link", { name: "브랜드 상세 보기" }).click();
    await expect(page.getByText("읽기 전용 화면입니다.")).toBeVisible();
    await expect(page.getByRole("button", { name: "변경사항 저장" })).toHaveCount(0);
    await page.goto("/workspace/content/42000000-0000-4000-8000-000000000001/studio");
    await expect(page.getByText("읽기 전용", { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "새 버전 생성" })).toHaveCount(0);
  });

  test("content search, Korean status and filter reset stay brand scoped", async ({ page }) => {
    await login(page, e2eAccounts.advertiser);
    await page.goto("/workspace/content");
    await page.getByPlaceholder("콘텐츠 검색").fill("Search Guide");
    await page.getByLabel("상태").selectOption("draft");
    await page.getByRole("button", { name: "필터 적용" }).click();
    await expect(page.getByText("Virtual Lumi Search Guide")).toBeVisible();
    await expect(page.getByLabel("콘텐츠 목록").getByText("초안", { exact: true })).toBeVisible();
    await expect(page.getByText("Virtual Bridge Private Guide")).toHaveCount(0);
    await page.getByRole("link", { name: "필터 초기화" }).click();
    await expect(page).toHaveURL(/\/workspace\/content$/);
  });

  test("studio autosaves blocks, creates versions, and detects tab conflicts", async ({ page, context }) => {
    test.setTimeout(90_000);
    await login(page, e2eAccounts.admin);
    await page.goto("/workspace/content");
    await page.getByText("새 콘텐츠", { exact: true }).click();
    const slug = `virtual-studio-${Date.now()}`;
    const createForm = page.locator(".content-create-form");
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
    expect((await firstSave).status()).toBe(200);
    await expect(page.getByText("저장 완료")).toBeVisible({ timeout: 9000 });
    await page.reload();
    await expect(page.getByLabel("FAQ 항목")).toHaveValue("가상 질문 | 가상 답변");
    await page.getByLabel("변경 요약").fill("가상 첫 버전");
    await page.getByRole("button", { name: "새 버전 생성" }).click();
    await expect(page.getByText("v1", { exact: true })).toBeVisible();
    await expect(page.getByText(/추가 \d+ · 삭제 \d+ · 변경 \d+/)).toBeVisible();
    const second = await context.newPage();
    await second.goto(page.url());
    const tabSave = page.waitForResponse((response) => response.url().includes("/draft") && response.request().method() === "PATCH");
    await page.getByLabel("제목", { exact: true }).fill("Virtual Studio First Tab");
    expect((await tabSave).status()).toBe(200);
    await expect(page.getByText("저장 완료")).toBeVisible({ timeout: 9000 });
    await second.getByLabel("제목", { exact: true }).fill("Virtual Studio Second Tab");
    await expect(second.getByText("충돌 발생")).toBeVisible({ timeout: 9000 });
    await expect(second.getByRole("button", { name: "최신본 다시 불러오기" })).toBeVisible();
    await second.close();
  });

  test("mobile 360 workspace menu and studio remain usable", async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 800 });
    await login(page, e2eAccounts.ae);
    await expect(page.getByRole("button", { name: "메뉴 열기" })).toBeVisible();
    await page.getByRole("button", { name: "메뉴 열기" }).click();
    await expect(page.getByRole("navigation", { name: "주요 메뉴" })).toBeVisible();
    await page.goto("/workspace/content/42000000-0000-4000-8000-000000000001/studio");
    await expect(page.getByLabel("일반 문단 내용")).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
  });
});
