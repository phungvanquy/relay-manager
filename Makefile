.PHONY: agent docker docker-push all clean check

IMAGE_NAME ?= phungvanquy/relay-manager
IMAGE_TAG ?= latest
PLATFORMS ?= linux/amd64,linux/arm64

agent:
	$(MAKE) -C agent build-all
	mkdir -p releases
	cp agent/bin/relay-agent-* releases/
	@rm -f releases/*.tar.gz
	@cd releases && for file in relay-agent-*; do \
		case "$$file" in *.sha256) continue ;; esac; \
		sha256sum "$$file" > "$$file.sha256"; \
	done
	@echo "Agent binaries copied to releases/"
	@ls releases/ | wc -l | xargs -I{} echo "{} binaries ready"

docker:
	docker build -t $(IMAGE_NAME):$(IMAGE_TAG) -f dashboard/Dockerfile .

# Multi-arch build. buildx can't --load a multi-platform image into the local
# daemon, so this pushes straight to the registry (requires `docker login`).
docker-push:
	docker buildx build --platform $(PLATFORMS) \
		-t $(IMAGE_NAME):$(IMAGE_TAG) -f dashboard/Dockerfile --push .

all: agent docker

clean:
	rm -rf releases/
	$(MAKE) -C agent clean

check:
	cd dashboard && npm run lint
	cd dashboard && npx tsc --noEmit
	cd dashboard && npm test
	$(MAKE) -C agent lint
	$(MAKE) -C agent test
