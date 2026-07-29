import { brandKeySchema } from "@/modules/publishing/contracts";
import { fetchPublishedList, parseBearerHeader } from "@/modules/publishing/api";
import { errorResponse, publishedResponse } from "@/modules/publishing/responses";

export async function GET(request: Request, { params }: { params: Promise<{ brandKey: string }> }) {
  const bearer = parseBearerHeader(request.headers.get("authorization"));
  if (!bearer) return errorResponse(401, "UNAUTHORIZED", "유효한 테스트 발행 연결이 필요합니다.");
  const parsed = brandKeySchema.safeParse((await params).brandKey);
  if (!parsed.success) return errorResponse(400, "INVALID_REQUEST", "브랜드 식별자가 올바르지 않습니다.");
  try {
    const result = await fetchPublishedList(parsed.data, bearer);
    if (!result) return errorResponse(401, "UNAUTHORIZED", "유효한 테스트 발행 연결이 필요합니다.");
    const lastModified = result.items[0]?.updatedAt ?? new Date(0).toISOString();
    return publishedResponse(request, result, lastModified);
  } catch {
    return errorResponse(500, "INTERNAL_ERROR", "테스트 발행 콘텐츠를 불러오지 못했습니다.");
  }
}
