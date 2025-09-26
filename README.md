# GitHub Changelog MCP Server

A Model Context Protocol (MCP) server that scrapes and provides access to GitHub's changelog entries with advanced filtering and search capabilities.

## Features

- 🔍 **Comprehensive Scraping**: Fetches changelog entries from GitHub's official changelog
- 📊 **Advanced Filtering**: Filter by date range, category, change type, or search terms
- 🚀 **Built-in Caching**: Reduces API calls with intelligent caching (1-hour default TTL)
- 🏷️ **Category Support**: Organizes entries by GitHub's official categories (COPILOT, ACTIONS, etc.)
- 📈 **Change Types**: Tracks IMPROVEMENT, RELEASE, and RETIRED entries
- 🔎 **Search Functionality**: Full-text search across titles and categories

## Installation

1. Clone the repository:
```bash
git clone https://github.com/your-username/github-changelog-mcp-server.git
cd github-changelog-mcp-server
```

2. Install dependencies:
```bash
npm install
```

3. Build the project:
```bash
npm run build
```

## Usage

### Running the Server

```bash
npm start
```

The server runs on stdio transport and communicates via the Model Context Protocol.

### Development

```bash
npm run dev  # Watch mode for development
```

### Container (Docker) Usage

You can build and run the server in a minimal container (multi‑stage build included).

Build the image locally:

```bash
docker build -t ghcr.io/<owner>/github-changelog-mcp:dev .
```

Run the container (will start and wait for MCP stdio messages):

```bash
docker run -it --rm ghcr.io/<owner>/github-changelog-mcp:dev
```

Publish to GitHub Container Registry (GHCR):

```bash
docker tag ghcr.io/<owner>/github-changelog-mcp:dev ghcr.io/<owner>/github-changelog-mcp:1.0.0
docker push ghcr.io/<owner>/github-changelog-mcp:1.0.0
docker push ghcr.io/<owner>/github-changelog-mcp:dev
```

In GitHub Actions, the provided workflow `.github/workflows/container.yml` builds, tests, and (on non‑PR events) pushes tags: branch, tag, commit SHA, and `latest` (default branch only).

> Note: Since the server uses stdio transport, it does not expose an HTTP port by default. If you need health checks, add an optional HTTP endpoint (see comments in the Dockerfile instructions section of project issues / future enhancements).

## Available Tools

### 1. `get_changelog_entries`

Get GitHub changelog entries with optional filtering.

**Parameters:**
- `startDate` (optional): Start date filter (YYYY-MM-DD format)
- `endDate` (optional): End date filter (YYYY-MM-DD format)
- `categories` (optional): Array of categories to filter by
- `types` (optional): Array of change types (`IMPROVEMENT`, `RELEASE`, `RETIRED`)
- `searchTerm` (optional): Search term for title/category matching
- `limit` (optional): Maximum number of entries to return (default: 50)

**Example:**
```json
{
  "startDate": "2025-08-01",
  "categories": ["COPILOT", "ACTIONS"],
  "types": ["RELEASE"],
  "limit": 10
}
```

### 2. `get_recent_entries`

Get the most recent changelog entries.

**Parameters:**
- `count` (optional): Number of entries to return (default: 10, max: 50)
- `category` (optional): Filter by specific category
- `type` (optional): Filter by specific change type

**Example:**
```json
{
  "count": 5,
  "category": "COPILOT"
}
```

### 3. `get_changelog_categories`

Get all available changelog categories.

**Parameters:** None

### 4. `search_changelog`

Search changelog entries by title, category, or description.

**Parameters:**
- `query` (required): Search query string
- `limit` (optional): Maximum number of results (default: 20)

**Example:**
```json
{
  "query": "Copilot code review",
  "limit": 15
}
```

### 5. `clear_changelog_cache`

Clear the changelog cache to force fresh data on next request.

**Parameters:** None

## Data Structure

Each changelog entry contains:

```typescript
interface ChangelogEntry {
  id: string;           // Unique identifier
  title: string;        // Entry title
  url: string;          // Full URL to the changelog entry
  date: string;         // ISO date string (YYYY-MM-DD)
  type: 'IMPROVEMENT' | 'RELEASE' | 'RETIRED';
  category: string;     // GitHub category (e.g., "COPILOT", "ACTIONS")
  categoryUrl: string;  // URL to category filter page
  description?: string; // Optional description
}
```

## Categories

Common GitHub changelog categories include:

- **COPILOT** - GitHub Copilot updates
- **ACTIONS** - GitHub Actions improvements
- **APPLICATION SECURITY** - Security-related changes
- **COLLABORATION TOOLS** - Team collaboration features
- **SUPPLY CHAIN SECURITY** - Dependency and supply chain security
- **ENTERPRISE MANAGEMENT TOOLS** - Enterprise administration features
- **ECOSYSTEM & ACCESSIBILITY** - Platform and accessibility improvements
- **PROJECTS & ISSUES** - Project management and issue tracking
- **ACCOUNT MANAGEMENT** - Account and billing features
- **PLATFORM GOVERNANCE** - Platform policies and governance

## Caching

The server implements intelligent caching with:
- **TTL**: 1 hour default (3600 seconds)
- **Check Period**: 10 minutes (600 seconds)
- **Automatic Cache Keys**: Based on year and request parameters
- **Manual Cache Clearing**: Via `clear_changelog_cache` tool

## Configuration

### Cache Configuration

You can customize cache behavior when initializing the scraper:

```typescript
const scraper = new GitHubChangelogScraper({
  stdTTL: 1800,    // 30 minutes TTL
  checkperiod: 300  // Check every 5 minutes
});
```

### Rate Limiting

The server implements built-in rate limiting through caching to respect GitHub's resources. Cached responses are served instantly, while fresh requests are limited by the cache TTL.

## Error Handling

The server provides comprehensive error handling:

- **Network Errors**: Graceful handling of connection issues
- **Parse Errors**: Robust HTML parsing with fallbacks
- **Validation Errors**: Input parameter validation
- **Cache Errors**: Automatic cache recovery

## Examples

### Get Recent Copilot Updates

```json
{
  "tool": "get_recent_entries",
  "arguments": {
    "count": 10,
    "category": "COPILOT"
  }
}
```

### Search for Security-Related Changes

```json
{
  "tool": "search_changelog",
  "arguments": {
    "query": "security",
    "limit": 20
  }
}
```

### Get All Releases from Last Month

```json
{
  "tool": "get_changelog_entries",
  "arguments": {
    "startDate": "2025-08-01",
    "endDate": "2025-08-31",
    "types": ["RELEASE"]
  }
}
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

MIT License - see LICENSE file for details.

## Support

For issues and questions:
1. Check the GitHub Issues page
2. Review the documentation
3. Create a new issue with detailed information

---

**Note**: This server scrapes public GitHub changelog data. Please respect GitHub's terms of service and rate limits.