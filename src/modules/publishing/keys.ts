import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

const KEY_PREFIX = "ahp_";
const KEY_PATTERN = /^ahp_[A-Za-z0-9_-]{43}$/;

export function createPublishingKey() {
  return `${KEY_PREFIX}${randomBytes(32).toString("base64url")}`;
}

export function isPublishingKey(value: string) {
  return KEY_PATTERN.test(value);
}

export function hashPublishingKey(value: string) {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

export function hashesEqual(left: string, right: string) {
  if (!/^[a-f0-9]{64}$/.test(left) || !/^[a-f0-9]{64}$/.test(right)) return false;
  return timingSafeEqual(Buffer.from(left, "hex"), Buffer.from(right, "hex"));
}
