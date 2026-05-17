import { NextRequest, NextResponse } from "next/server";
import { verifySessionFromRequest } from "@/lib/auth";
import { updateRule, removeRule } from "@/lib/sync/rule-mutations";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; rid: string }> }
) {
  if (!(await verifySessionFromRequest(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { rid } = await params;
  const body = await req.json();

  try {
    const rule = await updateRule(rid, {
      name: body.name,
      sourcePort: body.source_port ?? body.sourcePort,
      destinationIp: body.destination_ip ?? body.destinationIp,
      destinationPort: body.destination_port ?? body.destinationPort,
      protocol: body.protocol,
      note: body.note,
    });
    return NextResponse.json(rule);
  } catch (e: unknown) {
    if (e instanceof Error) {
      return NextResponse.json({ error: e.message }, { status: 400 });
    }
    throw e;
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; rid: string }> }
) {
  if (!(await verifySessionFromRequest(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { rid } = await params;

  try {
    await removeRule(rid);
    return NextResponse.json({ success: true });
  } catch (e: unknown) {
    if (e instanceof Error) {
      return NextResponse.json({ error: e.message }, { status: 400 });
    }
    throw e;
  }
}
