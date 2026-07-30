import { describe, expect, it, vi } from "vitest";
import { publishingConnectorRegistry } from "./registry";
import type { PublishDocument } from "@/modules/publish-document/schema";

const document = { title: "Virtual 안내", slug: "virtual-guide", description: "가상 설명", bodyHtml: "<p>안전한 가상 본문</p>", faq: [], sources: [], cta: null, relatedProducts: [], publishedAt: "2026-07-30T00:00:00.000Z", modifiedAt: "2026-07-30T00:00:00.000Z", canonical: "https://example.com/blog/virtual-guide", articleJsonLd: {}, breadcrumbJsonLd: {}, faqJsonLd: null, contentId: "42000000-0000-4000-8000-000000000001", versionId: "52000000-0000-4000-8000-000000000001", contentHash: "a".repeat(64) } satisfies PublishDocument;
const request = { document, target: "blog", idempotencyKey: "62000000-0000-4000-8000-000000000001" };

describe("publishing connector contract", () => {
  it.each(Object.values(publishingConnectorRegistry))("$id safely rejects disabled connections", async (connector) => { expect((await connector.publish({ status: "disabled" }, request)).ok).toBe(false); });
  it("local-test-store executes the local contract", async () => { const result = await publishingConnectorRegistry["local-test-store"].publish({ status: "connected", defaultTarget: "blog" }, request); expect(result).toMatchObject({ ok: true, code: "PUBLISHED", contentHash: document.contentHash }); });
  it("html-export returns only the allowlisted generated HTML", async () => { const result = await publishingConnectorRegistry["html-export"].publish({ status: "connected" }, request); expect(result).toMatchObject({ ok: true, code: "EXPORTED", html: document.bodyHtml }); });
  it("Cafe24 remains not installed and performs zero fetch calls", async () => { const fetch = vi.spyOn(globalThis, "fetch"); const connector = publishingConnectorRegistry.cafe24; expect(await connector.verifyConnection({ status: "not_configured" })).toMatchObject({ status: "not_installed", safeCode: "CONNECTOR_NOT_INSTALLED" }); expect(await connector.publish({ status: "connected" }, request)).toMatchObject({ ok: false, code: "CONNECTOR_NOT_INSTALLED" }); expect(fetch).not.toHaveBeenCalled(); fetch.mockRestore(); });
  it("custom-api exposes a contract without pretending to be connected", async () => { expect(await publishingConnectorRegistry["custom-api"].publish({ status: "connected" }, request)).toMatchObject({ ok: false, code: "NOT_CONFIGURED" }); });
});
