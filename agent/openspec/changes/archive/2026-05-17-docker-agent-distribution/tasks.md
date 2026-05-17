## 1. Releases API Update

- [x] 1.1 Replace hardcoded `ALLOWED_FILES` array with dynamic filesystem scan using regex validation (`/^relay-agent-[a-z]+-[a-z0-9]+$/`)
- [x] 1.2 Return 404 for filenames that don't match the pattern or don't exist on disk

## 2. Bootstrap Script Enhancement

- [x] 2.1 Expand architecture detection in the bootstrap route to support ARM (armv7l, armv6l), MIPS (mips, mipsel, mips64, mips64el), and FreeBSD
- [x] 2.2 Add unsupported platform error message with list of valid targets
- [x] 2.3 Add OS detection for FreeBSD and Darwin in addition to Linux

## 3. Root Makefile

- [x] 3.1 Create a root `Makefile` with `agent` target that runs `make build-all` in `agent/` and copies binaries to `releases/`
- [x] 3.2 Add `docker` target that builds the Docker image using `docker build`
- [x] 3.3 Add `all` target that runs `agent` then `docker` in sequence
- [x] 3.4 Add `clean` target that removes `releases/` binaries and agent `bin/`

## 4. Verification

- [x] 4.1 Run `make agent` from project root and verify all binaries appear in `releases/`
- [x] 4.2 Build Docker image and verify `/app/releases/` contains all platform binaries
- [x] 4.3 Verify the releases API serves a binary and rejects invalid filenames
