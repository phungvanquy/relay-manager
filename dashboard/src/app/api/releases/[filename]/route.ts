import { NextRequest, NextResponse } from "next/server";
import { readFileSync, existsSync } from "fs";
import { join } from "path";

const VALID_BINARY_PATTERN = /^relay-agent-[a-z]+-[a-z0-9]+(?:\.sha256)?$/;

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ filename: string }> }
) {
  const { filename } = await params;

  if (!VALID_BINARY_PATTERN.test(filename)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const searchPaths = [
    join(process.cwd(), "releases", filename),
    join(process.cwd(), "..", "releases", filename),
  ];

  let filePath: string | null = null;
  for (const p of searchPaths) {
    if (existsSync(/* turbopackIgnore: true */ p)) {
      filePath = p;
      break;
    }
  }

  if (!filePath) {
    return NextResponse.json(
      { error: "Binary not found. Build the agent first: cd agent && make build-all" },
      { status: 404 }
    );
  }

  const data = readFileSync(/* turbopackIgnore: true */ filePath);

  return new NextResponse(data, {
    headers: {
      "Content-Type": filename.endsWith(".sha256") ? "text/plain" : "application/octet-stream",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Content-Length": data.length.toString(),
    },
  });
}
