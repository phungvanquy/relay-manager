import crypto from "crypto";

export function hashApiKey(raw: string): string {
  return crypto.createHash("sha256").update(raw).digest("hex");
}

export function generateApiKey(): string {
  return crypto.randomBytes(32).toString("hex");
}
