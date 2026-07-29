import { brandKeySchema, publishedSlugSchema } from "@/modules/publishing/contracts";
import { fetchPublishedDetail, parseBearerHeader } from "@/modules/publishing/api";
import { errorResponse, publishedResponse } from "@/modules/publishing/responses";

export async function GET(request: Request, { params }: { params: Promise<{ brandKey: string; slug: string }> }) {
  const bearer = parseBearerHeader(request.headers.get("authorization"));
  if (!bearer) return errorResponse(401, "UNAUTHORIZED", "유효한 테스트 발행 연결이 필요합니다.");
  const values = await params;
  const brandKey = brandKeySchema.safeParse(values.brandKey);
  const slug = publishedSlugSchema.safeParse(values.slug);
  if (!brandKey.success || !slug.success) return errorResponse(400, "INVALID_REQUEST", "요청 경로가 올바르지 않습니다.");
  try {
    const result = await fetchPublishedDetail(brandKey.data, slug.data, bearer);
    if (!result) return errorResponse(401, "UNAUTHORIZED", "유효한 테스트 발행 연결이 필요합니다.");
    if (!result.item) return errorResponse(404, "NOT_FOUND", "테스트 발행 콘텐츠를 찾을 수 없습니다.");
    return publishedResponse(request, result, result.item.updatedAt);
  } catch {
    return errorResponse(500, "INTERNAL_ERROR", "테스트 발행 콘텐츠를 불러오지 못했습니다.");
  }
}
