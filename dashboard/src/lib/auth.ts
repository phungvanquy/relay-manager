import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { db } from "./db";
import { nodes } from "./db/schema";
import { eq } from "drizzle-orm";
import crypto from "crypto";
import { hashApiKey } from "./credentials";

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? "";
const JWT_SECRET_VALUE = process.env.JWT_SECRET ?? "";
const JWT_SECRET = new TextEncoder().encode(JWT_SECRET_VALUE);
const COOKIE_NAME = "relay-session";

export function generateToken(): string {
  return crypto.randomBytes(24).toString("base64url");
}

export async function createSession(): Promise<string> {
  if (!JWT_SECRET_VALUE) throw new Error("JWT_SECRET is not configured");
  const token = await new SignJWT({ role: "admin" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuer("relay-manager")
    .setAudience("relay-manager-dashboard")
    .setExpirationTime("7d")
    .sign(JWT_SECRET);
  return token;
}

export async function verifySession(
  cookieStore: Awaited<ReturnType<typeof cookies>>
): Promise<boolean> {
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token || !JWT_SECRET_VALUE) return false;
  try {
    await jwtVerify(token, JWT_SECRET, {
      issuer: "relay-manager",
      audience: "relay-manager-dashboard",
      algorithms: ["HS256"],
    });
    return true;
  } catch {
    return false;
  }
}

export async function verifySessionFromRequest(req: NextRequest): Promise<boolean> {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (!token || !JWT_SECRET_VALUE) return false;
  try {
    await jwtVerify(token, JWT_SECRET, {
      issuer: "relay-manager",
      audience: "relay-manager-dashboard",
      algorithms: ["HS256"],
    });
    return true;
  } catch {
    return false;
  }
}

export function verifyPassword(password: string): boolean {
  if (!ADMIN_PASSWORD) return false;
  const a = crypto
    .createHash("sha256")
    .update(String(password ?? ""))
    .digest();
  const b = crypto.createHash("sha256").update(ADMIN_PASSWORD).digest();
  return crypto.timingSafeEqual(a, b);
}

export async function authenticateNode(req: NextRequest): Promise<{ nodeId: string } | null> {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;

  const rawKey = authHeader.slice(7);
  const keyHash = hashApiKey(rawKey);

  const node = await db.query.nodes.findFirst({
    where: eq(nodes.apiKeyHash, keyHash),
  });

  if (!node) return null;
  return { nodeId: node.id };
}

export async function requireSession(req: NextRequest): Promise<NextResponse | null> {
  if (!(await verifySessionFromRequest(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
}

export { COOKIE_NAME };
export { generateApiKey, hashApiKey } from "./credentials";
