import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requireContentEditor, saveDraftSchema } from "@/modules/content-studio/server";

const MAX_REQUEST_BYTES = 550_000;

export async function PATCH(request: Request, { params }: { params: Promise<{ contentId: string }> }) {
  const headers = { "Cache-Control": "private, no-store, max-age=0" };
  try {
    const contentType = request.headers.get("content-type")?.toLowerCase() ?? "";
    if (!contentType.startsWith("application/json")) return NextResponse.json({ ok: false, message: "JSON 요청만 허용됩니다." }, { status: 415, headers });
    const requestOrigin = request.headers.get("origin");
    const requestHost = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
    if (requestOrigin && (!requestHost || new URL(requestOrigin).host !== requestHost)) return NextResponse.json({ ok: false, message: "교차 출처 요청은 허용되지 않습니다." }, { status: 403, headers });
    if (request.headers.get("sec-fetch-site") === "cross-site") return NextResponse.json({ ok: false, message: "교차 사이트 요청은 허용되지 않습니다." }, { status: 403, headers });
    const declaredLength = Number(request.headers.get("content-length") ?? 0);
    if (declaredLength > MAX_REQUEST_BYTES) return NextResponse.json({ ok: false, message: "요청 본문이 너무 큽니다." }, { status: 413, headers });
    const { contentId: rawContentId } = await params;
    const contentId = z.string().uuid().parse(rawContentId);
    const sessionClient = await createClient();
    const { data: claims } = await sessionClient.auth.getClaims();
    if (!claims?.claims?.sub) return NextResponse.json({ ok: false, message: "로그인이 필요합니다." }, { status: 401, headers });
    const body = await request.text();
    if (new TextEncoder().encode(body).byteLength > MAX_REQUEST_BYTES) return NextResponse.json({ ok: false, message: "요청 본문이 너무 큽니다." }, { status: 413, headers });
    const input = saveDraftSchema.parse(JSON.parse(body));
    const { supabase } = await requireContentEditor(contentId);
    const { data, error } = await supabase.rpc("save_content_draft", { target_content_id: contentId, expected_revision: input.revision, content_title: input.title, keyword: input.primaryKeyword, document: input.document });
    if (error) return NextResponse.json({ ok: false, message: "저장 권한이 없거나 요청이 유효하지 않습니다." }, { status: error.code === "42501" ? 403 : 400, headers });
    if (data?.conflict) return NextResponse.json(data, { status: 409, headers });
    return NextResponse.json(data, { headers });
  } catch { return NextResponse.json({ ok: false, message: "저장 요청을 검증하지 못했습니다." }, { status: 400, headers }); }
}
