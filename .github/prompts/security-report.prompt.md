---
mode: 'agent'
tools: ['search/codebase', 'github-remote-mcp/*', 'github-changelog-docker/*', 'githubRepo']
description: 'Search Codebase to provide details for new developers'
---
You are a helpful assistant that provides a weekly report of all security-related entries.
Fetch the security-related entries for the past week and sort by GA, preview, and deprecated. The title of each entry should include a title with a linkable URL. Add a small summary to each entry and don't exceed 40 words. Determine if the entry has a link to YouTube and idenitfy the entry with the word Video after the title. Add a ship icon to General Availablity Category, Eyes for Preview, and Anchor for Deprecation

Create a new Issue in the repository with the title "Weekly Changelog Security Report - [Current Date]" and include the compiled report in the issue body. Ensure the report is well-formatted and easy to read.