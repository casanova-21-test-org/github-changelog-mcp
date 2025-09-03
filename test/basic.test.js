import { GitHubChangelogScraper } from '../dist/scraper.js';

async function test() {
  console.log('Testing GitHub Changelog MCP Server...\n');
  
  const scraper = new GitHubChangelogScraper();
  
  try {
    // Test 1: Get recent entries
    console.log('1. Testing recent entries...');
    const recent = await scraper.getEntries();
    console.log(`✓ Fetched ${recent.entries.length} entries`);
    console.log(`✓ Found ${recent.categories.length} categories`);
    
    if (recent.entries.length > 0) {
      const latest = recent.entries[0];
      console.log(`✓ Latest entry: "${latest.title}" (${latest.type})`);
    }
    
    // Test 2: Test filtering by category
    console.log('\n2. Testing category filtering...');
    const copilotEntries = await scraper.getEntries({
      categories: ['COPILOT'],
    });
    console.log(`✓ Found ${copilotEntries.entries.length} Copilot entries`);
    
    // Test 3: Test search functionality
    console.log('\n3. Testing search functionality...');
    const searchResults = await scraper.getEntries({
      searchTerm: 'code review',
    });
    console.log(`✓ Found ${searchResults.entries.length} entries matching "code review"`);
    
    // Test 4: Show available categories
    console.log('\n4. Available categories:');
    recent.categories.slice(0, 10).forEach(cat => {
      console.log(`   - ${cat}`);
    });
    if (recent.categories.length > 10) {
      console.log(`   ... and ${recent.categories.length - 10} more`);
    }
    
    console.log('\n✅ All tests passed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

test();