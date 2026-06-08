## 1. License and Changelog

- [x] 1.1 Create LICENSE file at project root with MIT license text, copyright "Relay Manager Contributors", year 2024-present
- [x] 1.2 Create CHANGELOG.md at project root with Keep a Changelog format, Unreleased section, and initial [0.1.0] entry summarizing existing features (dashboard, agent, WebSocket sync, iptables management, CI pipeline) ← (verify: follows keepachangelog.com format, version anchors are correct)

## 2. Release Workflow

- [x] 2.1 Create `.github/workflows/release.yml` with trigger on push tags `v*`
- [x] 2.2 Add job: build agent binaries using `make -C agent build-all` with VERSION set from git tag, then `make -C agent release` for archives
- [x] 2.3 Add job/step: build Docker image using `docker build -f dashboard/Dockerfile .` and push to `phungvanquy/relay-manager` with version tag + `latest` tag (using Docker Hub secrets)
- [x] 2.4 Add job/step: create GitHub Release using `softprops/action-gh-release` with the `.tar.gz` archives attached ← (verify: workflow YAML is valid, triggers only on v* tags, version flows through to agent binary ldflags, Docker tags are correct, release has both platform archives attached)
