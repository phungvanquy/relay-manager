# Releasing

Releases are automated by [`.github/workflows/release.yml`](../.github/workflows/release.yml). Pushing a semantic version tag matching `v*` starts verification, publishes the container image, and creates a GitHub Release.

## Published Artifacts

For a tag such as `v0.1.0`, the workflow publishes:

- `ghcr.io/phungvanquy/relay-manager:v0.1.0`
- `ghcr.io/phungvanquy/relay-manager:0.1.0`
- `ghcr.io/phungvanquy/relay-manager:latest`
- Linux AMD64 and ARM64 agent binaries
- `.tar.gz` agent archives
- SHA-256 checksum files for binaries and archives
- Generated GitHub release notes

The container tags reference one OCI image index containing `linux/amd64` and `linux/arm64` manifests. GitHub Actions publishes it with the repository-scoped `GITHUB_TOKEN`; Docker Hub credentials are not required.

## Prepare a Release

1. Ensure `main` is clean and synchronized with `origin/main`.
2. Update the package version when appropriate.
3. Move the relevant entries from `Unreleased` into a dated version section in `CHANGELOG.md`.
4. Run the same checks used by CI:

```bash
cd dashboard
npm ci
npm run lint
npx tsc --noEmit
npm test
npm run build
npm audit --omit=dev --audit-level=high

cd ../agent
go test -race ./...
go vet ./...
```

5. Commit and push the release preparation. Wait for the main-branch CI run to pass.

## Publish

Create and push an annotated tag:

```bash
git tag -a v0.2.0 -m "Relay Manager v0.2.0"
git push origin v0.2.0
```

Monitor the Release workflow in GitHub Actions. Do not move or reuse a published version tag. If publishing fails, correct the workflow or source, create a new commit, and use a new version when artifacts may already have escaped.

## Verify

Confirm the platform manifests and tags:

```bash
docker buildx imagetools inspect ghcr.io/phungvanquy/relay-manager:v0.2.0
docker buildx imagetools inspect ghcr.io/phungvanquy/relay-manager:0.2.0
docker buildx imagetools inspect ghcr.io/phungvanquy/relay-manager:latest
```

Download release assets and verify their checksums from the same directory:

```bash
sha256sum -c relay-agent-linux-amd64.sha256
sha256sum -c relay-agent-linux-amd64.tar.gz.sha256
```

Finally, open the GitHub Release and confirm that all eight agent assets are present and that the package is publicly pullable without registry credentials.
