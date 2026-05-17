import { NextRequest, NextResponse } from "next/server";
import { hashApiKey } from "@/lib/auth";
import { db } from "@/lib/db";
import { bootstrapTokens, nodes } from "@/lib/db/schema";
import { eq, and, isNull } from "drizzle-orm";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token: rawToken } = await params;
  const tokenHash = hashApiKey(rawToken);
  const now = Date.now();

  const tokenRecord = await db.query.bootstrapTokens.findFirst({
    where: and(
      eq(bootstrapTokens.tokenHash, tokenHash),
      isNull(bootstrapTokens.usedAt)
    ),
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

  const baseUrl = process.env.DASHBOARD_URL || `http://${req.headers.get("host") || "localhost:3000"}`;
  const dashboardUrl = baseUrl.replace(/\/$/, "");
  const wsUrl = dashboardUrl.replace(/^http/, "ws") + "/ws/agent";

  const script = `#!/bin/bash
set -e

echo "=== Relay Agent Bootstrap ==="
echo "Dashboard: ${dashboardUrl}"
echo "Node: ${node?.name || tokenRecord.nodeId}"
echo ""

# Detect architecture
ARCH=$(uname -m)
case $ARCH in
  x86_64) BINARY="relay-agent-linux-amd64" ;;
  aarch64) BINARY="relay-agent-linux-arm64" ;;
  *) echo "Error: Unsupported architecture: $ARCH"; exit 1 ;;
esac

echo "Detected architecture: $ARCH"
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
