import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { groups, nodes } from "@/lib/db/schema";
import { registry } from "@/lib/ws/registry";
import { eq } from "drizzle-orm";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const unauthorized = await requireSession(req);
  if (unauthorized) return unauthorized;

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
    lastApplyError: node.lastApplyError,
    lastApplyErrorAt: node.lastApplyErrorAt,
    createdAt: node.createdAt,
  });
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const unauthorized = await requireSession(req);
  if (unauthorized) return unauthorized;

  const { id } = await params;
  const body = await req.json();

  const existing = await db.query.nodes.findFirst({
    where: eq(nodes.id, id),
  });
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (
    body.name !== undefined &&
    (typeof body.name !== "string" || body.name.trim().length === 0 || body.name.length > 100)
  ) {
    return NextResponse.json(
      { error: "Name must be between 1 and 100 characters" },
      { status: 400 }
    );
  }
  if (body.groupId !== undefined && body.groupId !== null && typeof body.groupId !== "string") {
    return NextResponse.json({ error: "groupId must be a string or null" }, { status: 400 });
  }

  const updates: Record<string, unknown> = { updatedAt: Date.now() };
  if (body.name !== undefined) updates.name = body.name.trim();
  const requestedGroupId = body.groupId || null;
  const groupChanged = body.groupId !== undefined && requestedGroupId !== existing.groupId;
  if (groupChanged && requestedGroupId) {
    const targetGroup = await db.query.groups.findFirst({
      where: eq(groups.id, requestedGroupId),
    });
    if (!targetGroup) {
      return NextResponse.json({ error: "Group not found" }, { status: 400 });
    }
  }
  if (body.groupId !== undefined) {
    updates.groupId = requestedGroupId;
    if (groupChanged) {
      updates.configVersion = 0;
      updates.status = "offline";
      updates.lastApplyError = null;
      updates.lastApplyErrorAt = null;
    }
  }

  db.update(nodes).set(updates).where(eq(nodes.id, id)).run();

  if (groupChanged) {
    const connection = registry.getByNodeId(id);
    if (connection) {
      registry.unregister(id, connection.ws);
      connection.ws.close(4002, "group changed");
    }
  }

  const updated = await db.query.nodes.findFirst({
    where: eq(nodes.id, id),
  });
  return NextResponse.json(updated);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const unauthorized = await requireSession(req);
  if (unauthorized) return unauthorized;

  const { id } = await params;
  const existing = await db.query.nodes.findFirst({
    where: eq(nodes.id, id),
  });
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const connection = registry.getByNodeId(id);
  if (connection) {
    registry.unregister(id, connection.ws);
    connection.ws.close(4002, "node deleted");
  }
  db.delete(nodes).where(eq(nodes.id, id)).run();
  return NextResponse.json({ success: true });
}
