.PHONY: agent docker all clean check

IMAGE_NAME ?= phungvanquy/relay-manager
IMAGE_TAG ?= latest

agent:
	$(MAKE) -C agent build-all
	mkdir -p releases
	cp agent/bin/relay-agent-* releases/
	@rm -f releases/*.tar.gz
	@echo "Agent binaries copied to releases/"
	@ls releases/ | wc -l | xargs -I{} echo "{} binaries ready"

docker:
	docker build -t $(IMAGE_NAME):$(IMAGE_TAG) -f dashboard/Dockerfile .

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
