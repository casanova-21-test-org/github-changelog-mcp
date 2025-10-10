# GitHub Changelog MCP Server - AI Coding Instructions

## Project Overview

This is a **Model Context Protocol (MCP) server** that scrapes GitHub's changelog and provides structured access via 5 MCP tools. The architecture follows MCP's stdio transport pattern with a scraper-server separation.

## Architecture & Core Components

### 1. MCP Server (`src/index.ts`)
- **Entry point**: Class-based server using `@modelcontextprotocol/sdk`
- **Transport**: stdio only (no HTTP endpoints)
- **Tool Registration**: 5 tools registered via `setupTools()` with JSON schemas
- **Error Handling**: Centralized in `setupErrorHandling()` with process signal management

### 2. Web Scraper (`src/scraper.ts`)
- **Target**: `https://github.blog/changelog/` HTML parsing
- **Parser Logic**: Cheerio-based, expects `h3` headers with format `"MMM.DDTYPE"` (e.g., "Sep.02Improvement")
- **Caching**: NodeCache with 1-hour TTL, year-based cache keys (`changelog_${year}`)
- **Multi-year Fetching**: Always fetches current + previous year for comprehensive results

### 3. Type System (`src/types.ts`)
- **ChangelogEntry**: Core data structure with `id`, `title`, `url`, `date`, `type`, `category`
- **Change Types**: Enum of `'IMPROVEMENT' | 'RELEASE' | 'RETIRED'`
- **Filtering**: `ChangelogFilter` interface supports date ranges, categories, types, search terms

## Critical Development Patterns

### MCP Tool Implementation Pattern
```typescript
// Each tool follows this exact pattern in src/index.ts:
this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  switch (name) {
    case 'tool_name':
      return await this.handleToolName(args);
  }
});

// Handler returns structured content:
return {
  content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
};
```

### HTML Parsing Logic
```typescript
// Critical: GitHub's changelog format is very specific
const match = headerText.match(/^([A-Z][a-z]{2})\.(\d{2})(Improvement|Release|Retired)$/i);
// Must handle: "Sep.02Improvement", "Oct.15Release", etc.
```

### ID Generation Convention
```typescript
// IDs follow pattern: "YYYY-MM-DD-type-title-slug"
return `${date}-${type.toLowerCase()}-${titleSlug}`;
```

## Build & Test Workflow

### Essential Commands
- **Build**: `npm run build` (required before running server)
- **Development**: `npm run dev` (watch mode)
- **Test Server**: `npm run test:mcp` (full MCP stdio test)
- **Basic Test**: `npm test` (scraper functionality)

### Docker Deployment
- **Multi-stage build**: Build stage compiles TS, runtime stage runs as non-root user
- **stdio transport only**: No exposed ports, entrypoint starts server immediately
- **Production ready**: GitHub Actions workflow with GHCR publishing

## Configuration Patterns

### MCP Client Configuration
Multiple config files provided for different MCP clients:
- `.vscode/settings.json` & `.vscode/mcp.json`: VS Code MCP extension
- `mcp-config.json`: Generic MCP client config
- `scripts/run-docker-mcp.sh`: Docker-based MCP server

### Cache Configuration
```typescript
// Default: 1 hour TTL, 10-minute cleanup
new GitHubChangelogScraper({ stdTTL: 3600, checkperiod: 600 })
```

## Testing & Debugging

### MCP Protocol Testing
- Use `test-mcp.js` for full stdio protocol testing
- Server expects JSON-RPC messages via stdin
- Success indicator: "GitHub Changelog MCP Server running on stdio" in stderr

### Web Scraping Debugging
- HTML structure may change; focus on `h3` elements and adjacent content
- Categories are extracted from second `<a>` tag in content blocks
- Date parsing relies on month abbreviation mapping

## Integration Points

### VS Code MCP Extension
- Server auto-discovered via `.vscode/settings.json`
- Two deployment options: local Node.js or Docker container
- Tools appear in VS Code's MCP tool palette

### GitHub Actions CI/CD
- Multi-job workflow: build → test → containerize → publish
- Smoke test verifies container startup message
- Auto-publishes to GHCR on main branch pushes

## Common Pitfalls & Solutions

1. **Build Required**: Server won't start without `npm run build` first
2. **Cache Invalidation**: Use `clear_changelog_cache` tool when testing scraper changes
3. **stdio Transport**: Server logs to stderr, data to stdout (don't mix streams)
4. **Year Boundary**: Scraper fetches current + previous year automatically
5. **Category Matching**: Case-insensitive filtering, but categories stored as-scraped

## File Priority for Changes

1. **`src/scraper.ts`**: HTML parsing logic, caching, filtering
2. **`src/index.ts`**: MCP tool implementations, server setup
3. **`src/types.ts`**: Data structures (changes affect both files above)
4. **Configuration files**: MCP client setup, deployment configs