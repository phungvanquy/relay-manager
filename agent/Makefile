.PHONY: build build-linux build-all release clean

VERSION ?= $(shell git describe --tags --always --dirty 2>/dev/null || echo "dev")
COMMIT  ?= $(shell git rev-parse --short HEAD 2>/dev/null)
BUILD_DATE ?= $(shell date -u '+%Y-%m-%dT%H:%M:%SZ')

LDFLAGS = -ldflags "-s -w \
	-X relay-agent/internal/version.Version=$(VERSION) \
	-X relay-agent/internal/version.Commit=$(COMMIT) \
	-X relay-agent/internal/version.BuildDate=$(BUILD_DATE)"

PLATFORMS = \
	linux/amd64 \
	linux/arm64 \
	linux/arm \
	linux/mips \
	linux/mipsle \
	linux/mips64 \
	linux/mips64le \
	freebsd/amd64 \
	freebsd/arm64 \
	darwin/amd64 \
	darwin/arm64

build:
	go build $(LDFLAGS) -o bin/relay-agent ./cmd/relay-agent

build-linux:
	GOOS=linux GOARCH=amd64 go build $(LDFLAGS) -o bin/relay-agent-linux-amd64 ./cmd/relay-agent
	GOOS=linux GOARCH=arm64 go build $(LDFLAGS) -o bin/relay-agent-linux-arm64 ./cmd/relay-agent

build-all:
	@for platform in $(PLATFORMS); do \
		os=$${platform%/*}; \
		arch=$${platform#*/}; \
		output="bin/relay-agent-$${os}-$${arch}"; \
		echo "Building $${output}..."; \
		goarm=""; goflags=""; \
		if [ "$$arch" = "arm" ]; then goarm="6"; fi; \
		if [ "$$arch" = "mips" ] || [ "$$arch" = "mipsle" ]; then goflags="softfloat"; fi; \
		GOOS=$$os GOARCH=$$arch GOARM=$$goarm GOMIPS=$$goflags go build $(LDFLAGS) -o $$output ./cmd/relay-agent || exit 1; \
	done
	@echo "Build complete: $$(ls bin/ | wc -l) binaries"

release: build-all
	@for f in bin/relay-agent-*; do \
		[ -f "$$f" ] || continue; \
		name=$$(basename $$f); \
		echo "Archiving $${name}.tar.gz..."; \
		tar -czf "bin/$${name}.tar.gz" -C bin --transform="s/$$name/relay-agent/" "$$name"; \
	done
	@echo "Release archives created"

clean:
	rm -rf bin/
