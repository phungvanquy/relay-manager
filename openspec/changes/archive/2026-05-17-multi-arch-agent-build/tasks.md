## 1. Version Package

- [x] 1.1 Create `agent/internal/version/version.go` with exported `Version`, `Commit`, `BuildDate` variables (defaulting to "dev", "", "")
- [x] 1.2 Add `--version` flag handling in `agent/cmd/relay-agent/main.go` that prints version info and exits

## 2. Makefile Rewrite

- [x] 2.1 Define build matrix variables (PLATFORMS list of os/arch pairs) in the Makefile
- [x] 2.2 Add `VERSION`, `COMMIT`, `BUILD_DATE` variables with git-derived defaults
- [x] 2.3 Add `build-all` target that loops through PLATFORMS and cross-compiles each with ldflags
- [x] 2.4 Add `release` target that creates tar.gz archives for each binary in `bin/`
- [x] 2.5 Set `GOMIPS=softfloat` for mips/mipsle targets and `GOARM=6` for arm targets
- [x] 2.6 Keep existing `build` and `build-linux` targets working (backward compat)

## 3. Bootstrap Script Update

- [x] 3.1 Add OS detection function mapping `uname -s` to GOOS values (Linux, FreeBSD, Darwin)
- [x] 3.2 Add architecture detection function mapping `uname -m` to GOARCH values (x86_64→amd64, aarch64→arm64, armv7l→arm, mips→mips, etc.)
- [x] 3.3 Add unsupported platform error with list of valid targets
- [x] 3.4 Update binary download URL to include detected `{os}-{arch}` suffix

## 4. Verification

- [x] 4.1 Run `make build-all` and verify all target binaries are produced in `bin/`
- [x] 4.2 Verify a built binary reports correct version info with `--version`
- [x] 4.3 Run `make release` and verify tar.gz archives are created with correct contents
