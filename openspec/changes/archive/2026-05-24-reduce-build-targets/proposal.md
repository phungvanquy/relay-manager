## Why

The agent currently builds for 11 OS/arch combinations (Linux, FreeBSD, macOS across amd64, arm64, arm, mips variants). In practice, relay nodes run on linux/amd64 or linux/arm64 — the two dominant server architectures. Building for all other targets adds CI time and maintenance burden with no real usage.

## What Changes

- **BREAKING**: Remove build targets for linux/arm, linux/mips, linux/mipsle, linux/mips64, linux/mips64le, freebsd/amd64, freebsd/arm64, darwin/amd64, darwin/arm64
- Keep only `linux/amd64` and `linux/arm64` as supported platforms
- Simplify the Makefile `PLATFORMS` list and `build-all` target
- Update `build-linux` target (already only builds these two — no change needed there)

## Capabilities

### New Capabilities

_(none)_

### Modified Capabilities

_(none — this is a build configuration change, no spec-level behavior changes)_

## Impact

- `agent/Makefile`: `PLATFORMS` list reduced from 11 to 2 entries, `build-all` loop simplified
- `Makefile` (root): No change needed (delegates to agent Makefile)
- Release artifacts: Only 2 binaries produced instead of 11
- Users on FreeBSD, macOS, MIPS, or 32-bit ARM will need to build from source
