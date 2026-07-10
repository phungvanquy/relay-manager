import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { rules, groups } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { addRule } from "@/lib/sync/rule-mutations";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const unauthorized = await requireSession(req);
  if (unauthorized) return unauthorized;

  const { id } = await params;
  const groupRules = await db.query.rules.findMany({
    where: eq(rules.groupId, id),
    orderBy: (r, { asc }) => [asc(r.sourcePort)],
  });

  return NextResponse.json(groupRules);
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const unauthorized = await requireSession(req);
  if (unauthorized) return unauthorized;

  const { id } = await params;
  const group = await db.query.groups.findFirst({
    where: eq(groups.id, id),
  });
  if (!group) {
    return NextResponse.json({ error: "Group not found" }, { status: 404 });
  }

  const body = await req.json();

  try {
    const rule = await addRule(id, {
      name: body.name,
      sourcePort: body.source_port ?? body.sourcePort,
      destinationIp: body.destination_ip ?? body.destinationIp,
      destinationPort: body.destination_port ?? body.destinationPort,
      protocol: body.protocol || "both",
      note: body.note,
    });
    return NextResponse.json(rule, { status: 201 });
  } catch (e: unknown) {
    if (e instanceof Error) {
      return NextResponse.json({ error: e.message }, { status: 400 });
    }
    throw e;
  }
}
