import { NextRequest, NextResponse } from "next/server";
import { hashApiKey } from "@/lib/auth";
import { db } from "@/lib/db";
import { bootstrapTokens, nodes } from "@/lib/db/schema";
import { eq, and, isNull } from "drizzle-orm";

export async function GET(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token: rawToken } = await params;
  const tokenHash = hashApiKey(rawToken);
  const now = Date.now();

  const tokenRecord = await db.query.bootstrapTokens.findFirst({
    where: and(eq(bootstrapTokens.tokenHash, tokenHash), isNull(bootstrapTokens.usedAt)),
  });

  if (!tokenRecord || tokenRecord.expiresAt < now) {
    return new NextResponse("echo 'Error: Invalid or expired bootstrap token'; exit 1", {
      status: 403,
      headers: { "Content-Type": "text/x-shellscript" },
    });
  }

  const node = await db.query.nodes.findFirst({
    where: eq(nodes.id, tokenRecord.nodeId),
  });

  const baseUrl =
    process.env.DASHBOARD_URL || `http://${req.headers.get("host") || "localhost:3000"}`;
  const dashboardUrl = baseUrl.replace(/\/$/, "");
  const wsUrl = dashboardUrl.replace(/^http/, "ws") + "/ws/agent";

  const script = `#!/bin/bash
set -e

echo "=== Relay Agent Bootstrap ==="
echo "Dashboard: ${dashboardUrl}"
echo "Node: ${node?.name || tokenRecord.nodeId}"
echo ""

# Detect OS
detect_os() {
  case "$(uname -s)" in
    Linux)   echo "linux" ;;
    FreeBSD) echo "freebsd" ;;
    Darwin)  echo "darwin" ;;
    *)       echo "" ;;
  esac
}

# Detect architecture
detect_arch() {
  case "$(uname -m)" in
    x86_64|amd64)       echo "amd64" ;;
    aarch64|arm64)      echo "arm64" ;;
    armv7l|armv6l)      echo "arm" ;;
    mips)               echo "mips" ;;
    mipsel)             echo "mipsle" ;;
    mips64)             echo "mips64" ;;
    mips64el)           echo "mips64le" ;;
    *)                  echo "" ;;
  esac
}

OS=$(detect_os)
ARCH=$(detect_arch)

if [ -z "$OS" ] || [ -z "$ARCH" ]; then
  echo "Error: Unsupported platform: $(uname -s)/$(uname -m)"
  echo ""
  echo "Supported platforms:"
  echo "  linux:   amd64, arm64, arm, mips, mipsle, mips64, mips64le"
  echo "  freebsd: amd64, arm64"
  echo "  darwin:  amd64, arm64"
  exit 1
fi

BINARY="relay-agent-\${OS}-\${ARCH}"

echo "Detected platform: \${OS}/\${ARCH}"
echo "Downloading agent binary..."

# Download binary
curl -sfL "${dashboardUrl}/api/releases/$BINARY" -o /usr/local/bin/relay-agent
chmod +x /usr/local/bin/relay-agent

# Create config directory
mkdir -p /etc/relay-agent

# Write initial config with bootstrap token
cat > /etc/relay-agent/config.json <<AGENTCFG
{
  "dashboard_url": "${wsUrl}",
  "bootstrap_token": "${rawToken}",
  "state_file": "/etc/relay-agent/state.json",
  "log_level": "info"
}
AGENTCFG

# Initialize empty state
if [ ! -f /etc/relay-agent/state.json ]; then
  echo '{"config_version":0,"applied_rules":[]}' > /etc/relay-agent/state.json
fi

# Install systemd service
cat > /etc/systemd/system/relay-agent.service <<SYSTEMD
[Unit]
Description=Relay Manager Agent
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
ExecStart=/usr/local/bin/relay-agent
Restart=always
RestartSec=5
LimitNOFILE=65535

[Install]
WantedBy=multi-user.target
SYSTEMD

# Enable and start
systemctl daemon-reload
systemctl enable relay-agent
systemctl restart relay-agent

echo ""
echo "=== Bootstrap Complete ==="
echo "Agent installed and started."
echo "Check status: systemctl status relay-agent"
echo "View logs: journalctl -u relay-agent -f"
`;

  return new NextResponse(script, {
    headers: { "Content-Type": "text/x-shellscript" },
  });
}
