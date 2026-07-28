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
    await page.getByLabel("브랜드명").fill("Virtual Paw");
    await page.getByLabel("브랜드 키").fill("virtual-paw-e2e");
    await page.getByLabel("가상 도메인").fill("paw-e2e.example.com");
    await page.getByLabel("광고주 조직").selectOption({ label: "Virtual Advertiser" });
    await page.getByRole("button", { name: "브랜드 생성" }).click();
    await expect(page.getByText("Virtual Paw")).toBeVisible();
    await page.getByText("Virtual Paw").locator("..").getByRole("link", { name: "상세 보기" }).click();
    await page.getByLabel("브랜드명").fill("Virtual Paw Updated");
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
});
