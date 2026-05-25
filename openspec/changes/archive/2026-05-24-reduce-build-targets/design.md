## Context

The agent Makefile currently defines 11 build targets across Linux, FreeBSD, and macOS. The `build-all` target iterates all platforms with conditional logic for GOARM and GOMIPS flags. Only linux/amd64 and linux/arm64 are used in production.

## Goals / Non-Goals

**Goals:**
- Reduce `PLATFORMS` to linux/amd64 and linux/arm64 only
- Remove GOARM/GOMIPS conditional logic that's no longer needed
- Keep `build-linux` target unchanged (already builds only these two)

**Non-Goals:**
- Changing the agent code itself
- Modifying the release/archive logic (still produces tar.gz per binary)
- Adding a "build from source" doc for unsupported platforms

## Decisions

**Keep only linux/amd64 and linux/arm64**
- These cover >95% of VPS and cloud server deployments
- Alternative considered: keep darwin targets for local dev — rejected because `build` (no suffix) already handles native builds for the developer's own machine

**Remove GOARM/GOMIPS conditionals from build-all**
- With only amd64 and arm64 targets, no special flags are needed
- Simplifies the loop body

## Risks / Trade-offs

- [Users on other platforms lose prebuilt binaries] → They can still `go build` from source. This is acceptable for a <100 node tool.
- [Future need for MIPS/FreeBSD] → Re-adding a platform is a one-line change to `PLATFORMS`.
