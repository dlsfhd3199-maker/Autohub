import { NextResponse } from "next/server";
import { requireContentEditor, saveDraftSchema } from "@/modules/content-studio/server";

export async function PATCH(request: Request, { params }: { params: Promise<{ contentId: string }> }) {
  try {
    const { contentId } = await params;
    const input = saveDraftSchema.parse(await request.json());
    const { supabase } = await requireContentEditor(contentId);
    const { data, error } = await supabase.rpc("save_content_draft", { target_content_id: contentId, expected_revision: input.revision, content_title: input.title, keyword: input.primaryKeyword, document: input.document });
    if (error) return NextResponse.json({ ok: false, message: "저장 권한이 없거나 요청이 유효하지 않습니다." }, { status: error.code === "42501" ? 403 : 400 });
    if (data?.conflict) return NextResponse.json(data, { status: 409 });
    return NextResponse.json(data);
  } catch { return NextResponse.json({ ok: false, message: "저장 요청을 검증하지 못했습니다." }, { status: 400 }); }
}
