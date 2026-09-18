import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  const unauthorized = await requireSession(req);
  if (unauthorized) return unauthorized;

  const url = new URL(req.url);
  const requestedLimit = Number.parseInt(url.searchParams.get("limit") || "50", 10);
  const requestedOffset = Number.parseInt(url.searchParams.get("offset") || "0", 10);
  const limit = Number.isFinite(requestedLimit) ? Math.max(1, Math.min(requestedLimit, 100)) : 50;
  const offset = Number.isFinite(requestedOffset) ? Math.max(0, requestedOffset) : 0;

  const logs = await db.query.auditLogs.findMany({
    orderBy: (l, { desc }) => [desc(l.createdAt)],
    limit,
    offset,
  });

  return NextResponse.json(logs);
}
