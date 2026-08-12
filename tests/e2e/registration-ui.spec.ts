import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test.describe("가입 신청 UI", () => {
  test("광고주와 마케터 입력 규격 및 오류 연결", async ({ page }) => {
    await page.goto("/register");
    await expect(page.getByLabel("회사명", { exact: true })).toBeVisible();
    await expect(page.getByLabel("자사몰 URL", { exact: true })).toBeVisible();
    await expect(page.getByLabel("비밀번호", { exact: true })).toHaveAttribute("type", "password");
    await page.getByRole("button", { name: "비밀번호 표시" }).click();
    await expect(page.getByLabel("비밀번호", { exact: true })).toHaveAttribute("type", "text");
    await expect(page.getByLabel("비밀번호 확인", { exact: true })).toHaveAttribute("type", "password");

    await page.getByRole("tab", { name: "마케터" }).click();
    await expect(page.getByLabel("가입 코드", { exact: true })).toHaveAttribute("type", "password");
    await page.getByRole("button", { name: "마케터 가입 신청" }).click();
    await expect(page.getByLabel("소속 센터 또는 대행사", { exact: true })).toHaveAttribute("aria-invalid", "true");
    await expect(page.getByText("소속 센터 또는 대행사를 2자 이상 입력해 주세요.")).toBeVisible();
    await expect(page.getByLabel("가입 코드", { exact: true })).toHaveAttribute("aria-describedby", /joinCode-error/);
  });

  test("360px에서 가로 넘침이 없고 접근성 검사를 통과한다 @a11y", async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 800 });
    await page.goto("/register");
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBe(0);
    await page.getByRole("tab", { name: "마케터" }).click();
    await expect(page.getByLabel("입사일(선택)", { exact: true })).toBeVisible();
    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations).toEqual([]);
  });

  test("키보드 탭 순서가 역할 탭에서 폼 필드와 제출 버튼으로 이어진다", async ({ page }) => {
    await page.goto("/register");
    await page.getByRole("tab", { name: "광고주" }).focus();
    await page.keyboard.press("Tab");
    await expect(page.getByRole("tab", { name: "마케터" })).toBeFocused();
    await page.keyboard.press("Tab");
    await expect(page.getByLabel("회사명", { exact: true })).toBeFocused();
  });
});
