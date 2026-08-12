import { afterEach, describe, expect, it, vi } from "vitest";
import { ContentHubError, getPublishedList } from "./content-hub";

afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });
function configure() {
  vi.stubEnv("CONTENT_HUB_API_URL", "http://127.0.0.1:3000");
  vi.stubEnv("CONTENT_HUB_PUBLISHING_KEY", `ahp_${"a".repeat(43)}`);
  vi.stubEnv("CONTENT_HUB_BRAND_KEY", "virtual-lumi");
}

describe("test store server publishing client", () => {
  it("returns an empty published list without entering a loading state", async () => {
    configure();
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ brand: { key: "virtual-lumi", name: "Virtual Lumi", domain: "lumi.example.com" }, items: [] }), { status: 200 })));
    await expect(getPublishedList()).resolves.toMatchObject({ items: [] });
  });
  it("maps an invalid bearer response to a safe unauthorized error", async () => {
    configure(); vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("{}", { status: 401 })));
    await expect(getPublishedList()).rejects.toMatchObject({ code: "unauthorized", status: 401 } satisfies Partial<ContentHubError>);
  });
  it("maps a disabled connection and a timeout without exposing internals", async () => {
    configure(); vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce(new Response("{}", { status: 403 })));
    await expect(getPublishedList()).rejects.toMatchObject({ code: "forbidden", status: 403 } satisfies Partial<ContentHubError>);
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(Object.assign(new Error("secret internal URL"), { name: "TimeoutError" })));
    await expect(getPublishedList()).rejects.toMatchObject({ code: "timeout", status: 504 } satisfies Partial<ContentHubError>);
  });
});
