import { NextRequest, NextResponse } from "next/server";
import { verifySessionFromRequest, generateToken, hashApiKey } from "@/lib/auth";
import { db } from "@/lib/db";
import { nodes, bootstrapTokens } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await verifySessionFromRequest(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const node = await db.query.nodes.findFirst({
    where: eq(nodes.id, id),
  });
  if (!node) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const now = Date.now();
  const rawToken = generateToken();

  db.insert(bootstrapTokens)
    .values({
      id: nanoid(),
      nodeId: id,
      tokenHash: hashApiKey(rawToken),
      expiresAt: now + 10 * 60 * 1000,
      usedAt: null,
    })
    .run();

  const baseUrl =
    process.env.DASHBOARD_URL || `http://${req.headers.get("host") || "localhost:3000"}`;

  return NextResponse.json({
    bootstrapToken: rawToken,
    bootstrapCommand: `curl -sL ${baseUrl}/api/bootstrap/${rawToken} | bash`,
    expiresAt: now + 10 * 60 * 1000,
  });
}
