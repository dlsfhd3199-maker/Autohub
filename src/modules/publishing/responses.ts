import { createHash } from "node:crypto";
import { NextResponse } from "next/server";

const cacheControl = "private, max-age=0, must-revalidate";

export function errorResponse(status: 400 | 401 | 403 | 404 | 500, code: "UNAUTHORIZED" | "CONNECTION_DISABLED" | "NOT_FOUND" | "INVALID_REQUEST" | "INTERNAL_ERROR", message: string) {
  return NextResponse.json({ error: { code, message } }, { status, headers: { "Cache-Control": "no-store", "WWW-Authenticate": status === 401 ? 'Bearer realm="AEO Content Hub test publishing"' : "" } });
}

export function publishedResponse(request: Request, payload: unknown, lastModified: string) {
  const etag = `"${createHash("sha256").update(JSON.stringify(payload)).digest("base64url")}"`;
  const headers = { "Cache-Control": cacheControl, ETag: etag, "Last-Modified": new Date(lastModified).toUTCString(), Vary: "Authorization" };
  if (request.headers.get("if-none-match") === etag) return new NextResponse(null, { status: 304, headers });
  return NextResponse.json(payload, { headers });
}
