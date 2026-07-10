import { NextRequest, NextResponse } from "next/server";
import { requireSession, generateToken, hashApiKey } from "@/lib/auth";
import { db } from "@/lib/db";
import { nodes, bootstrapTokens } from "@/lib/db/schema";
import { nanoid } from "nanoid";

const BOOTSTRAP_TOKEN_TTL_MS = 10 * 60 * 1000;

export async function GET(req: NextRequest) {
  const unauthorized = await requireSession(req);
  if (unauthorized) return unauthorized;

  const allNodes = await db.query.nodes.findMany({
    orderBy: (n, { desc }) => [desc(n.createdAt)],
    with: { group: true },
  });

  return NextResponse.json(
    allNodes.map((n) => ({
      id: n.id,
      name: n.name,
      ip: n.ip,
      groupId: n.groupId,
      status: n.status,
      lastHeartbeat: n.lastHeartbeat,
      configVersion: n.configVersion,
      createdAt: n.createdAt,
    }))
  );
}

export async function POST(req: NextRequest) {
  const unauthorized = await requireSession(req);
  if (unauthorized) return unauthorized;

  const body = await req.json();
  const { name, groupId } = body;

  if (!name || typeof name !== "string" || name.trim().length === 0) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  const now = Date.now();
  const nodeId = nanoid();

  const node = {
    id: nodeId,
    name: name.trim(),
    ip: null,
    apiKeyHash: null,
    groupId: groupId || null,
    status: "offline" as const,
    lastHeartbeat: null,
    configVersion: 0,
    createdAt: now,
    updatedAt: now,
  };

  db.insert(nodes).values(node).run();

  const rawToken = generateToken();
  const tokenId = nanoid();
  db.insert(bootstrapTokens)
    .values({
      id: tokenId,
      nodeId,
      tokenHash: hashApiKey(rawToken),
      expiresAt: now + BOOTSTRAP_TOKEN_TTL_MS,
      usedAt: null,
    })
    .run();

  const baseUrl =
    process.env.DASHBOARD_URL || `http://${req.headers.get("host") || "localhost:3000"}`;

  return NextResponse.json(
    {
      node: { id: nodeId, name: node.name, groupId: node.groupId },
      bootstrapToken: rawToken,
      bootstrapCommand: `curl -sL ${baseUrl}/api/bootstrap/${rawToken} | bash`,
    },
    { status: 201 }
  );
}
