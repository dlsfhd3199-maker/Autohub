export function normalizeBrandKey(value: string) {
  return value.trim().toLowerCase().replace(/[\s_]+/g, "-").replace(/[^a-z0-9-]/g, "").replace(/-+/g, "-").replace(/^-|-$/g, "").slice(0, 63);
}

export function normalizeDomain(value: string) {
  const stripped = value.trim().toLowerCase().replace(/^https?:\/\//, "").split(/[/?#]/)[0] ?? "";
  return stripped.replace(/\.+$/, "");
}

export function normalizePublishingPath(value: string) {
  const clean = value.trim().toLowerCase().replace(/\\/g, "/").replace(/\s+/g, "-").replace(/\/+/g, "/");
  return clean ? (clean.startsWith("/") ? clean : `/${clean}`) : "/";
}
