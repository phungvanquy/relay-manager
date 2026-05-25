## 1. Simplify Build Targets

- [x] 1.1 Reduce PLATFORMS list in agent/Makefile to linux/amd64 and linux/arm64 only
- [x] 1.2 Remove GOARM and GOMIPS conditional logic from build-all target

## 2. Verify

- [x] 2.1 Run `make build-all` in agent/ and confirm only two binaries are produced
