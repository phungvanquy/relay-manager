import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { NextRequest } from "next/server";
import { db } from "./db";
import { nodes } from "./db/schema";
import { eq } from "drizzle-orm";
import crypto from "crypto";

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "admin";
const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "relay-manager-secret-change-me"
);
const COOKIE_NAME = "relay-session";

export function hashApiKey(raw: string): string {
  return crypto.createHash("sha256").update(raw).digest("hex");
}

export function generateApiKey(): string {
  return crypto.randomBytes(32).toString("hex");
}

export function generateToken(): string {
  return crypto.randomBytes(24).toString("base64url");
}

export async function createSession(): Promise<string> {
  const token = await new SignJWT({ role: "admin" })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("7d")
    .sign(JWT_SECRET);
  return token;
}

export async function verifySession(
  cookieStore: Awaited<ReturnType<typeof cookies>>
): Promise<boolean> {
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return false;
  try {
    await jwtVerify(token, JWT_SECRET);
    return true;
  } catch {
    return false;
  }
}

export async function verifySessionFromRequest(req: NextRequest): Promise<boolean> {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (!token) return false;
  try {
    await jwtVerify(token, JWT_SECRET);
    return true;
  } catch {
    return false;
  }
}

export function verifyPassword(password: string): boolean {
  return password === ADMIN_PASSWORD;
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

export { COOKIE_NAME };
