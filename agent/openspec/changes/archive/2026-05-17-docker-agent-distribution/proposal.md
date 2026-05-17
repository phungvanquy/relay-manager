## Why

The Docker image and releases API currently only bundle linux/amd64 and linux/arm64 agent binaries. With the multi-arch build system now producing 11 platform binaries, the Docker image and distribution pipeline need to include all of them so agents on any supported platform can bootstrap via the dashboard.

## What Changes

- Update the Dockerfile to copy all multi-arch binaries from `releases/` into the image
- Expand the releases API `ALLOWED_FILES` list to serve all supported platform binaries
- Update the bootstrap script in the bootstrap API route to detect additional architectures (ARM, MIPS, FreeBSD)
- Add a Makefile target at the project root to build agent binaries and copy them to `releases/`
- Update the Docker build process to first build all agent binaries, then build the Docker image with them included

## Capabilities

### New Capabilities
- `docker-binary-distribution`: Docker image packaging and API serving of all multi-arch agent binaries through the dashboard

### Modified Capabilities

## Impact

- `dashboard/Dockerfile`: No structural change, but `releases/` will contain more binaries (~55MB total)
- `dashboard/src/app/api/releases/[filename]/route.ts`: Expanded allowed files list
- `dashboard/src/app/api/bootstrap/[token]/route.ts`: Enhanced architecture detection in bootstrap script
- `releases/`: Will contain all 11 platform binaries instead of 2
- `Makefile` (project root): New target to orchestrate agent build + Docker build
- Docker image size: Will increase by ~45MB due to additional binaries
