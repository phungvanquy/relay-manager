## Why

The agent currently only builds for linux/amd64 and linux/arm64. Relay nodes may run on various architectures (e.g., MIPS routers, FreeBSD servers, ARM v6 devices). A proper multi-architecture build pipeline ensures the bootstrap flow works on any target platform without manual cross-compilation.

## What Changes

- Expand the Makefile to build for all common OS/architecture combinations (linux, freebsd, darwin × amd64, arm64, arm, mips variants)
- Add version/commit metadata injection via ldflags at build time
- Add a build script or Makefile target that produces all binaries in a single command
- Update the bootstrap flow to detect platform and download the correct binary
- Add compressed archives for distribution (tar.gz)

## Capabilities

### New Capabilities
- `multi-arch-build`: Cross-compilation build system that produces agent binaries for all supported OS/architecture combinations with version metadata embedded

### Modified Capabilities

## Impact

- `agent/Makefile`: Major rewrite to support matrix builds and ldflags
- `scripts/bootstrap.sh`: Must detect OS/arch and fetch the correct binary
- `dashboard/src/api/`: Bootstrap endpoint may need to serve platform-specific binaries or redirect to the correct one
- Build artifacts: Will produce ~10+ binaries per release instead of 2
