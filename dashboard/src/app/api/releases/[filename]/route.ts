import { NextRequest, NextResponse } from "next/server";
import { readFileSync, existsSync } from "fs";
import { join } from "path";

const ALLOWED_FILES = [
  "relay-agent-linux-amd64",
  "relay-agent-linux-arm64",
];

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ filename: string }> }
) {
  const { filename } = await params;

  if (!ALLOWED_FILES.includes(filename)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Look for the binary in several possible locations
  const searchPaths = [
    join(process.cwd(), "releases", filename),        // ./releases/ (dev or bind mount)
    join(process.cwd(), "..", "releases", filename),   // ../releases/ (inside dashboard/)
  ];

  let filePath: string | null = null;
  for (const p of searchPaths) {
    if (existsSync(p)) {
      filePath = p;
      break;
    }
  }

  if (!filePath) {
    return NextResponse.json(
      { error: "Binary not found. Build the agent first: cd agent && make build-linux" },
      { status: 404 }
    );
  }

  const data = readFileSync(filePath);

  return new NextResponse(data, {
    headers: {
      "Content-Type": "application/octet-stream",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Content-Length": data.length.toString(),
    },
  });
}
