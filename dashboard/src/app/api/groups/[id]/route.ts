import { NextRequest, NextResponse } from "next/server";
import { verifySessionFromRequest } from "@/lib/auth";
import { db } from "@/lib/db";
import { groups, rules, nodes } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await verifySessionFromRequest(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const group = await db.query.groups.findFirst({
    where: eq(groups.id, id),
  });

  if (!group) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const groupRules = await db.query.rules.findMany({
    where: eq(rules.groupId, id),
    orderBy: (r, { asc }) => [asc(r.sourcePort)],
  });

  const groupNodes = await db.query.nodes.findMany({
    where: eq(nodes.groupId, id),
    orderBy: (n, { asc }) => [asc(n.name)],
  });

  return NextResponse.json({ ...group, rules: groupRules, nodes: groupNodes });
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await verifySessionFromRequest(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json();
  const { name } = body;

  if (!name || typeof name !== "string" || name.trim().length === 0) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  const existing = await db.query.groups.findFirst({
    where: eq(groups.id, id),
  });
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  try {
    db.update(groups)
      .set({ name: name.trim(), updatedAt: Date.now() })
      .where(eq(groups.id, id))
      .run();
  } catch (e: unknown) {
    if (e instanceof Error && e.message.includes("UNIQUE")) {
      return NextResponse.json({ error: "Group name already exists" }, { status: 409 });
    }
    throw e;
  }

  const updated = await db.query.groups.findFirst({
    where: eq(groups.id, id),
  });
  return NextResponse.json(updated);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await verifySessionFromRequest(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const existing = await db.query.groups.findFirst({
    where: eq(groups.id, id),
  });
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  db.update(nodes).set({ groupId: null }).where(eq(nodes.groupId, id)).run();
  db.delete(groups).where(eq(groups.id, id)).run();

  return NextResponse.json({ success: true });
}
