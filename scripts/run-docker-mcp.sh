#!/usr/bin/env bash
# Wrapper to run the GitHub Changelog MCP server from a Docker image via stdio.
# This allows local MCP clients (e.g. VS Code) to treat the container as a stdio server.
#
# Environment variables:
#   MCP_IMAGE   - Image reference to run (default: local/github-changelog-mcp:latest)
#   MCP_PULL    - If set to '1', attempt a docker pull before running.
#   MCP_TTY     - If set to '1', allocate a TTY (not recommended for strict stdio clients).
set -euo pipefail

IMAGE="${MCP_IMAGE:-local/github-changelog-mcp:latest}"
PULL="${MCP_PULL:-0}"
TTY="${MCP_TTY:-0}"

if [[ "$PULL" == "1" ]]; then
  echo "Pulling image: $IMAGE" >&2
  docker pull "$IMAGE" >/dev/null
fi

if ! docker image inspect "$IMAGE" >/dev/null 2>&1; then
  echo "Image $IMAGE not found. Build it first: docker build -t $IMAGE ." >&2
  exit 1
fi

# Build docker run args
RUN_ARGS=(--rm -i)
if [[ "$TTY" == "1" ]]; then
  RUN_ARGS+=( -t )
fi

# Execute container. The container's entrypoint starts the MCP server on stdio.
exec docker run "${RUN_ARGS[@]}" "$IMAGE"
