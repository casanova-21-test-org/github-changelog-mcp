#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from '@modelcontextprotocol/sdk/types.js';
import { GitHubChangelogScraper } from './scraper.js';
import { ChangelogFilter } from './types.js';

class GitHubChangelogMCPServer {
  private server: Server;
  private scraper: GitHubChangelogScraper;

  constructor() {
    this.server = new Server(
      {
        name: 'github-changelog-mcp-server',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.scraper = new GitHubChangelogScraper();
    this.setupTools();
    this.setupErrorHandling();
  }

  private setupErrorHandling(): void {
    this.server.onerror = (error) => {
      console.error('[MCP Error]', error);
    };

    process.on('SIGINT', async () => {
      await this.server.close();
      process.exit(0);
    });
  }

  private setupTools(): void {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: 'get_changelog_entries',
            description: 'Get GitHub changelog entries with optional filtering by date, category, type, or search term',
            inputSchema: {
              type: 'object',
              properties: {
                startDate: {
                  type: 'string',
                  description: 'Start date filter (YYYY-MM-DD format)',
                },
                endDate: {
                  type: 'string',
                  description: 'End date filter (YYYY-MM-DD format)',
                },
                categories: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'Filter by categories (e.g., "COPILOT", "ACTIONS")',
                },
                types: {
                  type: 'array',
                  items: { 
                    type: 'string',
                    enum: ['IMPROVEMENT', 'RELEASE', 'RETIRED']
                  },
                  description: 'Filter by change types',
                },
                searchTerm: {
                  type: 'string',
                  description: 'Search term to filter entries by title or category',
                },
                limit: {
                  type: 'number',
                  description: 'Maximum number of entries to return (default: 50)',
                  default: 50,
                },
              },
              additionalProperties: false,
            },
          },
          {
            name: 'get_recent_entries',
            description: 'Get the most recent GitHub changelog entries',
            inputSchema: {
              type: 'object',
              properties: {
                count: {
                  type: 'number',
                  description: 'Number of recent entries to return (default: 10, max: 50)',
                  default: 10,
                  maximum: 50,
                },
                category: {
                  type: 'string',
                  description: 'Optional category filter',
                },
                type: {
                  type: 'string',
                  enum: ['IMPROVEMENT', 'RELEASE', 'RETIRED'],
                  description: 'Optional type filter',
                },
              },
              additionalProperties: false,
            },
          },
          {
            name: 'get_changelog_categories',
            description: 'Get all available changelog categories',
            inputSchema: {
              type: 'object',
              properties: {},
              additionalProperties: false,
            },
          },
          {
            name: 'search_changelog',
            description: 'Search changelog entries by title, category, or description',
            inputSchema: {
              type: 'object',
              properties: {
                query: {
                  type: 'string',
                  description: 'Search query string',
                },
                limit: {
                  type: 'number',
                  description: 'Maximum number of results (default: 20)',
                  default: 20,
                },
              },
              required: ['query'],
              additionalProperties: false,
            },
          },
          {
            name: 'clear_changelog_cache',
            description: 'Clear the changelog cache to force fresh data on next request',
            inputSchema: {
              type: 'object',
              properties: {},
              additionalProperties: false,
            },
          },
        ],
      };
    });

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case 'get_changelog_entries':
            return await this.handleGetChangelogEntries(args);

          case 'get_recent_entries':
            return await this.handleGetRecentEntries(args);

          case 'get_changelog_categories':
            return await this.handleGetChangelogCategories();

          case 'search_changelog':
            return await this.handleSearchChangelog(args);

          case 'clear_changelog_cache':
            return await this.handleClearCache();

          default:
            throw new Error(`Unknown tool: ${name}`);
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        return {
          content: [
            {
              type: 'text',
              text: `Error: ${errorMessage}`,
            },
          ],
        };
      }
    });
  }

  private async handleGetChangelogEntries(args: any) {
    const filter: ChangelogFilter = {
      startDate: args.startDate,
      endDate: args.endDate,
      categories: args.categories,
      types: args.types,
      searchTerm: args.searchTerm,
    };

    const response = await this.scraper.getEntries(filter);
    const limit = args.limit || 50;
    const limitedEntries = response.entries.slice(0, limit);

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            entries: limitedEntries,
            totalCount: response.totalCount,
            returnedCount: limitedEntries.length,
            categories: response.categories,
          }, null, 2),
        },
      ],
    };
  }

  private async handleGetRecentEntries(args: any) {
    const count = Math.min(args.count || 10, 50);
    const filter: ChangelogFilter = {};
    
    if (args.category) {
      filter.categories = [args.category];
    }
    
    if (args.type) {
      filter.types = [args.type];
    }

    const response = await this.scraper.getEntries(filter);
    const recentEntries = response.entries.slice(0, count);

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            entries: recentEntries,
            count: recentEntries.length,
          }, null, 2),
        },
      ],
    };
  }

  private async handleGetChangelogCategories() {
    const response = await this.scraper.getEntries();

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            categories: response.categories,
            count: response.categories.length,
          }, null, 2),
        },
      ],
    };
  }

  private async handleSearchChangelog(args: any) {
    const { query, limit = 20 } = args;
    
    if (!query || typeof query !== 'string') {
      throw new Error('Search query is required and must be a string');
    }

    const filter: ChangelogFilter = {
      searchTerm: query,
    };

    const response = await this.scraper.getEntries(filter);
    const limitedResults = response.entries.slice(0, limit);

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            query,
            entries: limitedResults,
            totalMatches: response.totalCount,
            returnedCount: limitedResults.length,
          }, null, 2),
        },
      ],
    };
  }

  private async handleClearCache() {
    this.scraper.clearCache();

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            message: 'Changelog cache cleared successfully',
            timestamp: new Date().toISOString(),
          }, null, 2),
        },
      ],
    };
  }

  async run(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('GitHub Changelog MCP Server running on stdio');
  }
}

// Start the server
const server = new GitHubChangelogMCPServer();
server.run().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});