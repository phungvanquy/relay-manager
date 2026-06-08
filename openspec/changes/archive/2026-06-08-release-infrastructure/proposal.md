## Why

The project has no LICENSE (making it legally undistributable), no CHANGELOG (no release history), and no automated release pipeline. Tagged releases cannot produce artifacts automatically. This blocks treating the repo as a standard open-source project that others can use, contribute to, or deploy from published releases.

## What Changes

- Add MIT LICENSE file at project root
- Add CHANGELOG.md with an initial v0.1.0 entry summarizing existing features
- Add GitHub Actions release workflow (`.github/workflows/release.yml`) triggered on `v*` tag push that:
  - Builds Go agent binaries for linux/amd64 and linux/arm64
  - Creates `.tar.gz` archives for each binary
  - Builds and pushes Docker image to Docker Hub (`phungvanquy/relay-manager`) tagged with version + `latest`
  - Creates a GitHub Release with agent binaries attached

## Capabilities

### New Capabilities
- `release-pipeline`: GitHub Actions workflow for automated binary builds, Docker image publishing, and GitHub Release creation on version tags

### Modified Capabilities

## Impact

- **Root**: New `LICENSE` and `CHANGELOG.md` files
- **`.github/workflows/`**: New `release.yml` workflow
- **Docker Hub**: Automated image pushes on tag (requires `DOCKERHUB_USERNAME` and `DOCKERHUB_TOKEN` secrets configured in GitHub repo settings)
- **No runtime behavior changes** — purely release/distribution infrastructure
