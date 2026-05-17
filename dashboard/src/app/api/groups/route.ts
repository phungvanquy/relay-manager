import { NextRequest, NextResponse } from "next/server";
import { verifySessionFromRequest } from "@/lib/auth";
import { db } from "@/lib/db";
import { groups, rules, nodes } from "@/lib/db/schema";
import { eq, count } from "drizzle-orm";
import { nanoid } from "nanoid";

export async function GET(req: NextRequest) {
  if (!(await verifySessionFromRequest(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const allGroups = await db.query.groups.findMany({
    orderBy: (g, { desc }) => [desc(g.createdAt)],
  });

  const result = await Promise.all(
    allGroups.map(async (g) => {
      const ruleCount = await db
        .select({ count: count() })
        .from(rules)
        .where(eq(rules.groupId, g.id));
      const nodeCount = await db
        .select({ count: count() })
        .from(nodes)
        .where(eq(nodes.groupId, g.id));
      return {
        ...g,
        ruleCount: ruleCount[0].count,
        nodeCount: nodeCount[0].count,
      };
    })
  );

  return NextResponse.json(result);
}

export async function POST(req: NextRequest) {
  if (!(await verifySessionFromRequest(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { name } = body;

  if (!name || typeof name !== "string" || name.trim().length === 0) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  const now = Date.now();
  const group = {
    id: nanoid(),
    name: name.trim(),
    configVersion: 0,
    createdAt: now,
    updatedAt: now,
  };

  try {
    db.insert(groups).values(group).run();
  } catch (e: unknown) {
    if (e instanceof Error && e.message.includes("UNIQUE")) {
      return NextResponse.json(
        { error: "Group name already exists" },
        { status: 409 }
      );
    }
    throw e;
  }

  return NextResponse.json(group, { status: 201 });
}
