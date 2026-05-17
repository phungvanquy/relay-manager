import { NextRequest, NextResponse } from "next/server";
import { verifySessionFromRequest } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const valid = await verifySessionFromRequest(req);
  return NextResponse.json({ authenticated: valid });
}
