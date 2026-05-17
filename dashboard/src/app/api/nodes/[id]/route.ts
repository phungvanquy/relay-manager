import { NextRequest, NextResponse } from "next/server";
import { verifySessionFromRequest, generateToken, hashApiKey } from "@/lib/auth";
import { db } from "@/lib/db";
import { nodes, bootstrapTokens } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

  return NextResponse.json({
    id: node.id,
    name: node.name,
    ip: node.ip,
    groupId: node.groupId,
    status: node.status,
    lastHeartbeat: node.lastHeartbeat,
    configVersion: node.configVersion,
    createdAt: node.createdAt,
  });
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await verifySessionFromRequest(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json();

  const existing = await db.query.nodes.findFirst({
    where: eq(nodes.id, id),
  });
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const updates: Record<string, unknown> = { updatedAt: Date.now() };
  if (body.name) updates.name = body.name.trim();
  if (body.groupId !== undefined) updates.groupId = body.groupId || null;

  db.update(nodes).set(updates).where(eq(nodes.id, id)).run();

  const updated = await db.query.nodes.findFirst({
    where: eq(nodes.id, id),
  });
  return NextResponse.json(updated);
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await verifySessionFromRequest(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const existing = await db.query.nodes.findFirst({
    where: eq(nodes.id, id),
  });
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  db.delete(nodes).where(eq(nodes.id, id)).run();
  return NextResponse.json({ success: true });
}
