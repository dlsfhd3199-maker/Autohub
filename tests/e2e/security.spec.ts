import { expect, test } from "@playwright/test";

test("security headers and private caching apply to authentication pages", async ({ request }) => {
  const response = await request.get("/login");
  expect(response.headers()["content-security-policy"]).toContain("frame-ancestors 'none'");
  expect(response.headers()["x-content-type-options"]).toBe("nosniff");
  expect(response.headers()["referrer-policy"]).toBe("strict-origin-when-cross-origin");
  expect(response.headers()["permissions-policy"]).toContain("camera=()");
  expect(response.headers()["x-frame-options"]).toBe("DENY");
  expect(response.headers()["cache-control"]).toMatch(/no-store|no-cache/);
});

test("unauthenticated workspace and draft API access are denied safely", async ({ request }) => {
  const workspace = await request.get("/workspace/content", { maxRedirects: 0 });
  expect(workspace.status()).toBeGreaterThanOrEqual(300);
  expect(workspace.status()).toBeLessThan(400);
  expect(workspace.headers().location).toMatch(/^\/login\?next=%2Fworkspace%2Fcontent$/);

  const contentId = "42000000-0000-4000-8000-000000000001";
  const unsupported = await request.patch(`/api/content/${contentId}/draft`, { data: "text", headers: { "content-type": "text/plain" } });
  expect(unsupported.status()).toBe(415);
  const unauthenticated = await request.patch(`/api/content/${contentId}/draft`, { data: {}, headers: { "content-type": "application/json" } });
  expect(unauthenticated.status()).toBe(401);
});
