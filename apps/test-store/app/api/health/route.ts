import { NextResponse } from "next/server";
import { ContentHubError, getPublishedList } from "../../../lib/content-hub";

export async function GET(request: Request) {
  if (new URL(request.url).searchParams.get("dependency") === "content-hub") {
    try {
      await getPublishedList();
      return NextResponse.json({ ok: true, dependency: "content-hub" }, { headers: { "Cache-Control": "no-store" } });
    } catch (error) {
      const code = error instanceof ContentHubError ? error.code : "unexpected_response";
      return NextResponse.json({ ok: false, dependency: "content-hub", code }, { status: 503, headers: { "Cache-Control": "no-store" } });
    }
  }
  return NextResponse.json({ ok: true, service: "virtual-test-store" }, { headers: { "Cache-Control": "no-store" } });
}
