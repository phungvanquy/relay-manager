#!/bin/bash
set -euo pipefail

DASHBOARD_URL="{{DASHBOARD_URL}}"
BOOTSTRAP_TOKEN="{{BOOTSTRAP_TOKEN}}"

detect_os() {
    case "$(uname -s)" in
        Linux)   echo "linux" ;;
        FreeBSD) echo "freebsd" ;;
        Darwin)  echo "darwin" ;;
        *)       echo "" ;;
    esac
}

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

SUPPORTED_PLATFORMS="
  linux/amd64, linux/arm64, linux/arm
  linux/mips, linux/mipsle, linux/mips64, linux/mips64le
  freebsd/amd64, freebsd/arm64
  darwin/amd64, darwin/arm64"

OS=$(detect_os)
ARCH=$(detect_arch)

if [ -z "$OS" ] || [ -z "$ARCH" ]; then
    echo "Error: Unsupported platform: $(uname -s)/$(uname -m)"
    echo ""
    echo "Supported platforms:"
    echo "$SUPPORTED_PLATFORMS"
    exit 1
fi

BINARY_NAME="relay-agent-${OS}-${ARCH}"
DOWNLOAD_URL="${DASHBOARD_URL}/api/bootstrap/${BOOTSTRAP_TOKEN}/binary/${OS}-${ARCH}"

echo "Detected platform: ${OS}/${ARCH}"
echo "Downloading relay-agent..."

TMPDIR=$(mktemp -d)
trap 'rm -rf "$TMPDIR"' EXIT

curl -fsSL -o "${TMPDIR}/relay-agent" "$DOWNLOAD_URL"
chmod +x "${TMPDIR}/relay-agent"

install -m 755 "${TMPDIR}/relay-agent" /usr/local/bin/relay-agent

mkdir -p /etc/relay-agent

cat > /etc/relay-agent/config.json <<EOF
{
    "dashboard_url": "${DASHBOARD_URL}",
    "bootstrap_token": "${BOOTSTRAP_TOKEN}"
}
EOF

cat > /etc/systemd/system/relay-agent.service <<EOF
[Unit]
Description=Relay Agent
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
ExecStart=/usr/local/bin/relay-agent /etc/relay-agent/config.json
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable relay-agent
systemctl start relay-agent

echo "Relay agent installed and started successfully."
echo "Platform: ${OS}/${ARCH}"
echo "Binary: /usr/local/bin/relay-agent"
echo "Config: /etc/relay-agent/config.json"
