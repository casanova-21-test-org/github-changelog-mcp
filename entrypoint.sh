#!/usr/bin/env bash
set -euo pipefail
echo "Starting GitHub Changelog MCP Server (stdio transport)..."
exec node dist/index.js
