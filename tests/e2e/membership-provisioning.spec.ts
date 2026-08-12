import { expect, test } from "@playwright/test";
import { e2eAccounts } from "./global-setup";

test.use({ trace: "off" });

async function login(page: import("@playwright/test").Page, email: string, password: string) {
  await page.goto("/login");
  await page.getByLabel("이메일").fill(email);
  await page.getByLabel("비밀번호").fill(password);
  await page.getByRole("button", { name: "로그인" }).click();
}

test.describe.serial("마케터 가입과 광고주 내부 계정", () => {
  test("마케터 공개 가입은 가입 코드로 조직을 결정하고 승인 대기시킨다", async ({ page }) => {
    const joinCode = process.env.E2E_JOIN_CODE;
    expect(joinCode).toBeTruthy();
    const email = `marketer-application-${Date.now()}@example.com`;
    await page.goto("/register");
    await page.getByLabel("이름", { exact: true }).fill("가상 신청자");
    await page.getByLabel("이메일", { exact: true }).fill(email);
    await page.getByLabel("비밀번호", { exact: true }).fill("Virtual-Marketer-42!");
    await page.getByLabel("비밀번호 확인", { exact: true }).fill("Virtual-Marketer-42!");
    await page.getByLabel("가입 코드", { exact: true }).fill(joinCode!);
    await page.getByLabel("개인정보 수집 동의").check();
    await page.getByRole("button", { name: "마케터 가입 신청" }).click();
    await expect(page).toHaveURL(/account-status\?status=pending/);
    await expect(page.getByRole("heading", { name: "승인 검토 중입니다" })).toBeVisible();
    await page.goto("/workspace");
    await expect(page).toHaveURL(/account-status\?status=pending/);
  });

  test("배정 마케터가 광고주를 만들고 최초 비밀번호 변경을 강제한다", async ({ page }) => {
    const email = `advertiser-provisioned-${Date.now()}@example.com`;
    await login(page, e2eAccounts.ae.email, e2eAccounts.ae.password);
    await page.waitForURL(/\/workspace/);
    await page.goto("/workspace/people?brandId=32000000-0000-4000-8000-000000000001");
    await page.getByLabel("광고주 담당자명").fill("가상 광고주 담당자");
    await page.getByLabel("이메일", { exact: true }).fill(email);
    await page.getByRole("button", { name: "광고주 계정 생성" }).click();
    const credentialPanel = page.locator(".one-time-credentials");
    await expect(credentialPanel).toBeVisible();
    const temporaryPassword = await credentialPanel.locator("code").nth(1).textContent();
    expect(temporaryPassword).toBeTruthy();
    await page.reload();
    await expect(page.locator(".one-time-credentials")).toHaveCount(0);
    await page.getByRole("button", { name: "로그아웃" }).click();
    await login(page, email, temporaryPassword!);
    await expect(page).toHaveURL(/\/change-password/);
    await page.goto("/workspace");
    await expect(page).toHaveURL(/\/change-password/);
    await page.getByLabel("새 비밀번호", { exact: true }).fill("Virtual-Changed-42!");
    await page.getByLabel("새 비밀번호 확인", { exact: true }).fill("Virtual-Changed-42!");
    await page.getByRole("button", { name: "비밀번호 변경" }).click();
    await expect(page).toHaveURL(/\/workspace/);
    await page.goto("/workspace/content");
    await expect(page.getByText("새 콘텐츠", { exact: true })).toHaveCount(0);
    await page.goto("/workspace/ai-settings");
    await expect(page.getByRole("heading", { name: "시스템 AI 공급자 설정 권한이 없습니다" })).toBeVisible();
  });

  test("관리자만 비활성 광고주를 재활성화하고 새 비밀번호 변경을 강제한다", async ({ browser }) => {
    test.setTimeout(150_000);
    const suffix = Date.now();
    const email = `advertiser-reactivation-${suffix}@example.com`;
    const displayName = `Virtual 복구 담당자 ${suffix}`;
    const initialPassword = "Virtual-Initial-Changed-42!";
    const finalPassword = "Virtual-Reactivated-Changed-42!";

    const marketerContext = await browser.newContext();
    const marketerPage = await marketerContext.newPage();
    await login(marketerPage, e2eAccounts.ae.email, e2eAccounts.ae.password);
    await marketerPage.waitForURL(/\/workspace/);
    await marketerPage.goto("/workspace/people?brandId=32000000-0000-4000-8000-000000000001");
    await marketerPage.getByLabel("광고주 담당자명").fill(displayName);
    await marketerPage.getByLabel("이메일", { exact: true }).fill(email);
    await marketerPage.getByRole("button", { name: "광고주 계정 생성" }).click();
    const issued = marketerPage.locator(".one-time-credentials");
    await expect(issued).toBeVisible();
    const firstTemporaryPassword = await issued.locator("code").nth(1).textContent();
    expect(firstTemporaryPassword).toBeTruthy();
    await marketerPage.reload();
    await expect(marketerPage.locator(".one-time-credentials")).toHaveCount(0);
    await expect(marketerPage.getByRole("button", { name: "계정 재활성화" })).toHaveCount(0);

    const advertiserContext = await browser.newContext();
    const advertiserPage = await advertiserContext.newPage();
    await login(advertiserPage, email, firstTemporaryPassword!);
    await expect(advertiserPage).toHaveURL(/\/change-password/);
    await advertiserPage.getByLabel("새 비밀번호", { exact: true }).fill(initialPassword);
    await advertiserPage.getByLabel("새 비밀번호 확인", { exact: true }).fill(initialPassword);
    await advertiserPage.getByRole("button", { name: "비밀번호 변경" }).click();
    await expect(advertiserPage).toHaveURL(/\/workspace/);

    const adminContext = await browser.newContext();
    const adminPage = await adminContext.newPage();
    await login(adminPage, e2eAccounts.admin.email, e2eAccounts.admin.password);
    await adminPage.waitForURL(/\/workspace/);
    await adminPage.goto("/workspace/people?brandId=32000000-0000-4000-8000-000000000001");
    const accountRow = adminPage.locator(".assignment-list li").filter({ hasText: displayName });
    await accountRow.getByRole("button", { name: "계정 비활성화" }).click();
    await expect(accountRow).toContainText("비활성");

    await advertiserPage.goto("/workspace");
    await expect(advertiserPage).toHaveURL(/account-status\?status=suspended/);
    const suspendedRow = adminPage.locator(".assignment-list li").filter({ hasText: displayName });
    await suspendedRow.getByRole("button", { name: "계정 재활성화" }).click();
    await expect(adminPage.getByRole("dialog", { name: "광고주 계정 재활성화" })).toBeVisible();
    await adminPage.getByRole("button", { name: "재활성화 및 임시 비밀번호 발급" }).click();
    const recoveryCredentials = adminPage.getByRole("dialog").locator(".one-time-credentials");
    await expect(recoveryCredentials).toBeVisible();
    const newTemporaryPassword = await recoveryCredentials.locator("code").nth(1).textContent();
    expect(newTemporaryPassword).toBeTruthy();
    expect(newTemporaryPassword).not.toBe(firstTemporaryPassword);
    await adminPage.reload();
    await expect(adminPage.locator(".one-time-credentials")).toHaveCount(0);

    await advertiserContext.close();
    const oldPasswordContext = await browser.newContext();
    const oldPasswordPage = await oldPasswordContext.newPage();
    await login(oldPasswordPage, email, initialPassword);
    await expect(oldPasswordPage).toHaveURL(/login\?error=invalid/);
    await oldPasswordContext.close();

    const recoveredContext = await browser.newContext();
    const recoveredPage = await recoveredContext.newPage();
    await login(recoveredPage, email, newTemporaryPassword!);
    await expect(recoveredPage).toHaveURL(/\/change-password/);
    await recoveredPage.goto("/workspace");
    await expect(recoveredPage).toHaveURL(/\/change-password/);
    await recoveredPage.getByLabel("새 비밀번호", { exact: true }).fill(finalPassword);
    await recoveredPage.getByLabel("새 비밀번호 확인", { exact: true }).fill(finalPassword);
    await recoveredPage.getByRole("button", { name: "비밀번호 변경" }).click();
    await expect(recoveredPage).toHaveURL(/\/workspace/);
    await recoveredPage.goto("/workspace/content");
    await expect(recoveredPage.getByText("새 콘텐츠", { exact: true })).toHaveCount(0);
    await recoveredPage.goto("/workspace/ai-settings");
    await expect(recoveredPage.getByRole("heading", { name: "시스템 AI 공급자 설정 권한이 없습니다" })).toBeVisible();

    await marketerContext.close();
    await adminContext.close();
    await recoveredContext.close();
  });
});
