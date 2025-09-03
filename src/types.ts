export interface ChangelogEntry {
  id: string;
  title: string;
  url: string;
  date: string;
  type: 'IMPROVEMENT' | 'RELEASE' | 'RETIRED';
  category: string;
  categoryUrl: string;
  description?: string;
}

export interface ChangelogFilter {
  startDate?: string;
  endDate?: string;
  categories?: string[];
  types?: ('IMPROVEMENT' | 'RELEASE' | 'RETIRED')[];
  searchTerm?: string;
}

export interface ChangelogResponse {
  entries: ChangelogEntry[];
  totalCount: number;
  categories: string[];
}