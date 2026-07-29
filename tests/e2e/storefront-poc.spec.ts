import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { e2eAccounts } from "./global-setup";

async function login(page: import("@playwright/test").Page) {
  await page.goto("http://127.0.0.1:3000/login");
  await page.getByLabel("이메일").fill(e2eAccounts.admin.email);
  await page.getByLabel("비밀번호").fill(e2eAccounts.admin.password);
  await page.getByRole("button", { name: "로그인" }).click();
  await expect(page).toHaveURL(/\/workspace/);
}

test("test storefront renders published immutable versions and never exposes later drafts", async ({ page, request }) => {
  test.setTimeout(90_000);
  await login(page);
  const runId = Date.now().toString(36);
  const title = `Virtual Lumi Store Guide ${runId}`;
  const slug = `virtual-lumi-store-guide-${runId}`;
  await page.goto("http://127.0.0.1:3000/workspace/content");
  await page.getByText("새 콘텐츠", { exact: true }).click();
  const createForm = page.locator(".content-create-form");
  await createForm.getByLabel("브랜드").selectOption("32000000-0000-4000-8000-000000000001");
  await createForm.getByLabel("콘텐츠 제목").fill(title);
  await createForm.getByLabel("URL 슬러그").fill(slug);
  await createForm.getByLabel("핵심 키워드").fill("virtual search");
  await createForm.getByRole("button", { name: "콘텐츠 생성" }).click();
  await expect(page).toHaveURL(/\/workspace\/content\/[0-9a-f-]+\/studio/, { timeout: 15_000 });
  const studioUrl = page.url();
  await page.getByRole("button", { name: "일반 문단" }).click();
  await page.getByLabel("일반 문단 내용").last().fill("Virtual saved studio paragraph");
  await page.getByRole("button", { name: "FAQ" }).click();
  await page.getByLabel("FAQ 항목").last().fill("가상 질문은 무엇인가요? | 등록된 공식 근거로 확인하는 가상 답변입니다.");
  await page.getByRole("button", { name: "출처 목록" }).click();
  await page.getByLabel("출처 목록").last().fill("가상 공식 자료 | https://example.com/virtual-source");
  await page.getByRole("button", { name: "CTA" }).click();
  await page.getByLabel("CTA 내용").last().fill("가상 상품 정보를 확인해 보세요.");
  await page.getByLabel("CTA 레이블").last().fill("가상 상품 보기");
  await page.getByLabel("CTA URL").last().fill("https://example.com/virtual-product");
  await expect(page.getByText("저장 대기", { exact: true })).toBeVisible();
  await expect(page.getByText("저장 완료", { exact: true })).toBeVisible({ timeout: 8_000 });

  await page.getByLabel("변경 요약").fill("자사몰 첫 테스트 발행");
  await page.getByRole("button", { name: "새 버전 생성" }).click();
  await expect(page.getByText("v1", { exact: true })).toBeVisible({ timeout: 10_000 });
  await page.getByLabel("발행할 버전").selectOption({ label: "v1 · 자사몰 첫 테스트 발행" });
  await page.getByRole("button", { name: "선택 버전 테스트 발행" }).click();
  await expect(page.getByText(/선택한 불변 버전을 테스트 발행했습니다/)).toBeVisible();

  const publishingKey = process.env.E2E_PUBLISHING_KEY;
  if (!publishingKey) throw new Error("Ephemeral E2E publishing key is missing");
  const hubList = await request.get("http://127.0.0.1:3000/api/publishing/v1/brands/virtual-lumi/contents", {
    headers: { authorization: `Bearer ${publishingKey}` },
  });
  expect(hubList.status()).toBe(200);
  const storeDependency = await request.get("http://127.0.0.1:3100/api/health?dependency=content-hub");
  expect({ status: storeDependency.status(), body: await storeDependency.json() }).toEqual({
    status: 200,
    body: { ok: true, dependency: "content-hub" },
  });

  await page.goto("http://127.0.0.1:3100/blog");
  await expect(page.getByRole("heading", { name: "Virtual Lumi 콘텐츠" })).toBeVisible();
  await page.getByRole("link", { name: title }).click();
  await expect(page.getByText("가상 질문은 무엇인가요?")).toBeVisible();
  await expect(page.getByRole("link", { name: "가상 상품 보기" })).toBeVisible();
  const html = await (await request.get(`http://127.0.0.1:3100/blog/${slug}`)).text();
  expect(html).toContain('"@type":"Article"');
  expect(html).toContain('"@type":"BreadcrumbList"');
  expect(html).toContain('"@type":"FAQPage"');
  expect(html).toContain('rel="canonical"');

  await page.goto(studioUrl);
  await page.getByLabel("일반 문단 내용").first().fill("두 번째 불변 버전에 반영된 가상 문장입니다.");
  await expect(page.getByText("저장 대기", { exact: true })).toBeVisible();
  await expect(page.getByText("저장 완료", { exact: true })).toBeVisible({ timeout: 8_000 });
  await page.getByLabel("변경 요약").fill("두 번째 테스트 발행 버전");
  await page.getByRole("button", { name: "새 버전 생성" }).click();
  await expect(page.getByText("v2", { exact: true })).toBeVisible({ timeout: 10_000 });
  await page.goto(studioUrl);
  await page.getByLabel("발행할 버전").selectOption({ label: "v2 · 두 번째 테스트 발행 버전" });
  const republishButton = page.getByRole("button", { name: "선택 버전 테스트 발행" });
  await republishButton.click();
  await expect(page.getByRole("button", { name: "테스트 발행 중…" })).toBeVisible();
  await expect(republishButton).toBeEnabled();
  await expect(page.getByText(/선택한 불변 버전을 테스트 발행했습니다/)).toBeVisible();
  await page.goto(`http://127.0.0.1:3100/blog/${slug}`);
  await expect(page.getByText("두 번째 불변 버전에 반영된 가상 문장입니다.")).toBeVisible();

  await page.goto(studioUrl);
  await page.getByLabel("일반 문단 내용").first().fill("아직 발행되지 않은 working draft 비공개 문장입니다.");
  await expect(page.getByText("저장 대기", { exact: true })).toBeVisible();
  await expect(page.getByText("저장 완료", { exact: true })).toBeVisible({ timeout: 8_000 });
  await page.goto(`http://127.0.0.1:3100/blog/${slug}`);
  await expect(page.getByText("아직 발행되지 않은 working draft 비공개 문장입니다.")).toHaveCount(0);
  await expect(page.getByText("두 번째 불변 버전에 반영된 가상 문장입니다.")).toBeVisible();

  await page.setViewportSize({ width: 360, height: 800 });
  await expect(page.locator("body")).toHaveJSProperty("scrollWidth", 360);
  expect((await request.get("http://127.0.0.1:3100/sitemap.xml")).status()).toBe(200);
  expect((await request.get("http://127.0.0.1:3100/robots.txt")).status()).toBe(200);
});

test("@a11y test storefront list and mobile detail have no serious axe violations", async ({ page }) => {
  await page.goto("http://127.0.0.1:3100/blog");
  let results = await new AxeBuilder({ page }).analyze();
  expect(results.violations.filter((violation) => ["serious", "critical"].includes(violation.impact ?? ""))).toEqual([]);
  await page.setViewportSize({ width: 360, height: 800 });
  await page.goto("http://127.0.0.1:3100/blog/virtual-lumi-search-guide");
  results = await new AxeBuilder({ page }).analyze();
  expect(results.violations.filter((violation) => ["serious", "critical"].includes(violation.impact ?? ""))).toEqual([]);
});

test("storefront is complete SSR with JavaScript disabled and keeps bearer credentials server-only", async ({ browser, request }) => {
  const response = await request.get("http://127.0.0.1:3100/blog");
  const html = await response.text();
  expect(response.status()).toBe(200);
  expect(html).toContain("Virtual Lumi");
  expect(html).not.toContain("Switched to client rendering");
  expect(html).not.toContain("CONTENT_HUB_PUBLISHING_KEY");
  expect(html).not.toContain("Authorization: Bearer");
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto("http://127.0.0.1:3100/blog");
  const firstLink = page.locator(".content-card h2 a").first();
  await expect(firstLink).toHaveAttribute("href", /\/blog\//);
  const href = await firstLink.getAttribute("href");
  expect(href).toBeTruthy();
  const detailResponse = await request.get(`http://127.0.0.1:3100${href}`);
  const detailHtml = await detailResponse.text();
  expect(detailResponse.status()).toBe(200);
  expect(detailHtml).toContain("<article");
  expect(detailHtml).toContain('application/ld+json');
  expect(detailHtml).toContain('"@type":"Article"');
  expect(detailHtml).toContain('"@type":"BreadcrumbList"');
  await context.close();
});
