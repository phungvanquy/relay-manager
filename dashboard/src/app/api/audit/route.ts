import { NextRequest, NextResponse } from "next/server";
import { verifySessionFromRequest } from "@/lib/auth";
import { db } from "@/lib/db";
import { auditLogs } from "@/lib/db/schema";

export async function GET(req: NextRequest) {
  if (!(await verifySessionFromRequest(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const limit = parseInt(url.searchParams.get("limit") || "50", 10);
  const offset = parseInt(url.searchParams.get("offset") || "0", 10);

  const logs = await db.query.auditLogs.findMany({
    orderBy: (l, { desc }) => [desc(l.createdAt)],
    limit: Math.min(limit, 100),
    offset,
  });

  return NextResponse.json(logs);
}
