import fetch from 'node-fetch';
import { load } from 'cheerio';
import NodeCache from 'node-cache';
import { ChangelogEntry, ChangelogFilter, ChangelogResponse } from './types.js';

export class GitHubChangelogScraper {
  private cache: NodeCache;
  private readonly baseUrl = 'https://github.blog/changelog/';
  
  constructor(cacheOptions: { stdTTL: number; checkperiod: number } = { stdTTL: 3600, checkperiod: 600 }) {
    this.cache = new NodeCache(cacheOptions);
  }

  /**
   * Fetch and parse changelog entries from GitHub
   */
  async fetchChangelog(year?: string): Promise<ChangelogEntry[]> {
    const url = year ? `${this.baseUrl}${year}/` : this.baseUrl;
    const cacheKey = `changelog_${year || 'current'}`;
    
    // Check cache first
    const cached = this.cache.get<ChangelogEntry[]>(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const html = await response.text();
      const entries = this.parseChangelogHtml(html);
      
      // Cache the results
      this.cache.set(cacheKey, entries);
      
      return entries;
    } catch (error) {
      console.error('Error fetching changelog:', error);
      throw new Error(`Failed to fetch changelog: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Parse HTML content and extract changelog entries
   */
  private parseChangelogHtml(html: string): ChangelogEntry[] {
    const $ = load(html);
    const entries: ChangelogEntry[] = [];
    
    // Find all changelog entries (each has a date, type, and title)
    $('h3').each((_index: number, element: any) => {
      const $header = $(element);
      const headerText = $header.text().replace(/\s+/g, '').trim(); // Remove all whitespace
      
      // Parse the header format: "MMM.DDTYPE" (e.g., "Sep.02Improvement")
      const match = headerText.match(/^([A-Z][a-z]{2})\.(\d{2})(Improvement|Release|Retired)$/i);
      if (!match) return;
      
      const [, month, day, type] = match;
      const normalizedType = type.toUpperCase() as 'IMPROVEMENT' | 'RELEASE' | 'RETIRED';
      
      // Find the associated content (next sibling with the link and category)
      const $content = $header.next();
      if (!$content.length) return;
      
      const $link = $content.find('a').first();
      if (!$link.length) return;
      
      const title = $link.text().trim();
      const url = $link.attr('href');
      if (!title || !url) return;
      
      // Find category link (usually the second link in the content)
      const $categoryLink = $content.find('a').eq(1);
      const category = $categoryLink.text().trim();
      const categoryUrl = $categoryLink.attr('href') || '';
      
      // Determine the year (from the current year or URL context)
      const currentYear = new Date().getFullYear();
      const date = this.parseDate(month.toUpperCase(), day, currentYear);
      
      const entry: ChangelogEntry = {
        id: this.generateId(title, date, normalizedType),
        title,
        url: url.startsWith('http') ? url : `https://github.blog${url}`,
        date,
        type: normalizedType,
        category: category || 'Uncategorized',
        categoryUrl: categoryUrl.startsWith('http') ? categoryUrl : `https://github.blog${categoryUrl}`
      };
      
      entries.push(entry);
    });
    
    return entries.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }

  /**
   * Convert month abbreviation and day to ISO date string
   */
  private parseDate(monthAbbr: string, day: string, year: number): string {
    const monthMap: { [key: string]: number } = {
      'JAN': 0, 'FEB': 1, 'MAR': 2, 'APR': 3, 'MAY': 4, 'JUN': 5,
      'JUL': 6, 'AUG': 7, 'SEP': 8, 'OCT': 9, 'NOV': 10, 'DEC': 11
    };
    
    const month = monthMap[monthAbbr];
    if (month === undefined) {
      throw new Error(`Invalid month abbreviation: ${monthAbbr}`);
    }
    
    const date = new Date(year, month, parseInt(day));
    return date.toISOString().split('T')[0];
  }

  /**
   * Generate a unique ID for an entry
   */
  private generateId(title: string, date: string, type: string): string {
    const titleSlug = title.toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
    return `${date}-${type.toLowerCase()}-${titleSlug}`;
  }

  /**
   * Filter changelog entries based on criteria
   */
  filterEntries(entries: ChangelogEntry[], filter: ChangelogFilter): ChangelogEntry[] {
    let filtered = [...entries];

    // Filter by date range
    if (filter.startDate) {
      const startDate = new Date(filter.startDate);
      filtered = filtered.filter(entry => new Date(entry.date) >= startDate);
    }
    
    if (filter.endDate) {
      const endDate = new Date(filter.endDate);
      filtered = filtered.filter(entry => new Date(entry.date) <= endDate);
    }

    // Filter by categories
    if (filter.categories && filter.categories.length > 0) {
      const lowerCategories = filter.categories.map(c => c.toLowerCase());
      filtered = filtered.filter(entry => 
        lowerCategories.includes(entry.category.toLowerCase())
      );
    }

    // Filter by types
    if (filter.types && filter.types.length > 0) {
      filtered = filtered.filter(entry => filter.types!.includes(entry.type));
    }

    // Filter by search term
    if (filter.searchTerm) {
      const searchLower = filter.searchTerm.toLowerCase();
      filtered = filtered.filter(entry =>
        entry.title.toLowerCase().includes(searchLower) ||
        entry.category.toLowerCase().includes(searchLower)
      );
    }

    return filtered;
  }

  /**
   * Get all unique categories from entries
   */
  getCategories(entries: ChangelogEntry[]): string[] {
    const categories = new Set(entries.map(entry => entry.category));
    return Array.from(categories).sort();
  }

  /**
   * Get changelog entries with filtering
   */
  async getEntries(filter: ChangelogFilter = {}): Promise<ChangelogResponse> {
    // Fetch current year and optionally previous year for more comprehensive results
    const currentYear = new Date().getFullYear();
    const [currentEntries, previousEntries] = await Promise.all([
      this.fetchChangelog(currentYear.toString()),
      this.fetchChangelog((currentYear - 1).toString()).catch(() => [])
    ]);

    const allEntries = [...currentEntries, ...previousEntries];
    const filteredEntries = this.filterEntries(allEntries, filter);
    const categories = this.getCategories(allEntries);

    return {
      entries: filteredEntries,
      totalCount: filteredEntries.length,
      categories
    };
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.flushAll();
  }
}