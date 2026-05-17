.PHONY: build build-linux clean

build:
	go build -o bin/relay-agent ./cmd/relay-agent

build-linux:
	GOOS=linux GOARCH=amd64 go build -o bin/relay-agent-linux-amd64 ./cmd/relay-agent
	GOOS=linux GOARCH=arm64 go build -o bin/relay-agent-linux-arm64 ./cmd/relay-agent

clean:
	rm -rf bin/
