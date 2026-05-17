## Context

The relay-agent is a Go binary that runs on relay nodes to manage iptables forwarding rules. Currently the Makefile only produces linux/amd64 and linux/arm64 binaries. The bootstrap flow (`curl | bash`) needs to detect the target platform and download the correct binary. Go's built-in cross-compilation makes this straightforward — no external toolchains needed.

## Goals / Non-Goals

**Goals:**
- Single Makefile target that produces binaries for all supported platforms
- Version and commit metadata embedded in each binary via ldflags
- Compressed archives (tar.gz) for distribution
- Bootstrap script auto-detects OS/arch and fetches the correct binary
- Clear naming convention for binary artifacts

**Non-Goals:**
- CI/CD pipeline setup (GitHub Actions, etc.) — that's a separate concern
- Package manager distribution (apt, yum, brew)
- Auto-update mechanism in the agent
- Windows support (iptables doesn't exist on Windows)
- Docker image builds

## Decisions

### Build matrix: Linux + FreeBSD, common architectures

**Targets:**
| OS | Architectures |
|----|--------------|
| linux | amd64, arm64, arm (v7), mips, mipsle, mips64, mips64le |
| freebsd | amd64, arm64 |
| darwin | amd64, arm64 |

**Rationale:** Linux covers the vast majority of relay nodes (VPS, bare metal, routers). FreeBSD is common in network appliances. Darwin is useful for local development/testing. MIPS variants cover consumer routers (OpenWrt). Windows is excluded since iptables is Linux-only (and the agent's core function is iptables management — darwin/freebsd builds are for development and testing the non-iptables parts).

**Alternative considered:** Only linux targets. Rejected because darwin builds help developers test locally and FreeBSD has legitimate use in network infrastructure.

### Version injection via ldflags

Inject `version`, `commit`, and `buildDate` into a `version` package at build time:
```
-ldflags "-X relay-agent/internal/version.Version=$(VERSION) -X relay-agent/internal/version.Commit=$(COMMIT) -X relay-agent/internal/version.BuildDate=$(DATE)"
```

**Rationale:** Standard Go pattern. Allows `relay-agent --version` to report exact build info for debugging. No runtime dependencies.

### Naming convention: `relay-agent-{os}-{arch}`

Binary: `relay-agent-linux-amd64`
Archive: `relay-agent-linux-amd64.tar.gz`

**Rationale:** Matches Go's `GOOS`/`GOARCH` naming directly. No translation needed in bootstrap script — just `$(uname -s | tr A-Z a-z)-$(uname -m mapped to GOARCH)`.

### Bootstrap platform detection

The bootstrap script maps `uname -s` and `uname -m` to Go's GOOS/GOARCH:
- `uname -s`: Linux→linux, FreeBSD→freebsd, Darwin→darwin
- `uname -m`: x86_64→amd64, aarch64→arm64, armv7l→arm, mips→mips, etc.

Then fetches `${DASHBOARD_URL}/api/bootstrap/binary/${os}-${arch}`.

**Alternative considered:** Single fat binary with embedded platform detection. Rejected — Go doesn't support fat binaries and this would be non-standard.

## Risks / Trade-offs

- **Binary size × target count**: ~10MB per binary × 11 targets = ~110MB total build output. Acceptable for a build artifact directory, but should not be committed to git. → Mitigation: `.gitignore` the `bin/` directory (already done).
- **MIPS softfloat**: Some MIPS devices need `GOMIPS=softfloat`. → Mitigation: Default to softfloat for mips/mipsle targets since relay-agent does no floating point work.
- **darwin/freebsd builds won't run iptables**: These platforms lack iptables. → Mitigation: Agent already needs graceful handling when iptables is unavailable (for testing). Document that darwin/freebsd builds are for development only.
- **Arch detection edge cases**: Some ARM systems report `armv6l` vs `armv7l`. → Mitigation: Bootstrap script maps both to `arm` (GOARM=7 is backward compatible with v6 for our use case, but we'll build with GOARM=6 for maximum compatibility).
