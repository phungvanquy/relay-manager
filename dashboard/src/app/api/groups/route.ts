import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { groups, rules, nodes } from "@/lib/db/schema";
import { eq, count } from "drizzle-orm";
import { nanoid } from "nanoid";

export async function GET(req: NextRequest) {
  const unauthorized = await requireSession(req);
  if (unauthorized) return unauthorized;

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
  const unauthorized = await requireSession(req);
  if (unauthorized) return unauthorized;

  const body = await req.json();
  const { name } = body;

  if (!name || typeof name !== "string" || name.trim().length === 0 || name.length > 100) {
    return NextResponse.json(
      { error: "Name must be between 1 and 100 characters" },
      { status: 400 }
    );
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
      return NextResponse.json({ error: "Group name already exists" }, { status: 409 });
    }
    throw e;
  }

  return NextResponse.json(group, { status: 201 });
}
