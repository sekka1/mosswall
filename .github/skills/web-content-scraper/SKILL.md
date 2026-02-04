---
name: web-content-scraper
description: Scrape and extract main content from webpages. Use when a user asks to scrape, fetch, extract, or grab content from a website URL. Extracts the primary article or page content while filtering out ads, headers, footers, navigation, sidebars, and site maps. Preserves all important details and formatting from the main content.
---

# Web Content Scraper Skill

Extract meaningful content from webpages, filtering out noise like ads, navigation, and boilerplate.

## Overview

This skill fetches webpage content and extracts only the main article or informational content. It automatically filters out:
- Advertisements and promotional content
- Headers and footers
- Navigation menus and sidebars
- Site maps and link directories
- Cookie notices and popups
- Social media widgets

## When to Use

Use this skill when a user:
- Asks to "scrape" a website
- Wants to "grab content" from a URL
- Needs to "extract information" from a webpage
- Asks to "fetch" or "get" the content of a website
- Wants to copy text from a webpage

## Instructions

### Step 1: Validate the URL

Before scraping, verify the URL is valid and accessible. Ensure it starts with `http://` or `https://`.

### Step 2: Fetch the Webpage

Use the `fetch_webpage` tool to retrieve the page content. Set the query to focus on extracting the main article or informational content.

### Step 3: Extract Main Content

Parse the content and filter out noise. The goal is to capture ALL the meaningful information while excluding structural/promotional elements.

**Always Remove:**
- Scripts and style blocks
- Elements with classes containing: ad, ads, advertisement, banner, promo, sponsor
- Navigation elements: `<nav>`, `.nav`, `.menu`, `.navigation`
- Header and footer: `<header>`, `<footer>`, `.header`, `.footer`
- Sidebars: `<aside>`, `.sidebar`, `.side-bar`
- Cookie notices and popups
- Social sharing widgets
- Comment sections
- Related/recommended article sections
- Site maps and link directories
- "Subscribe" or "Sign up" callouts

**Always Preserve (Copy Exactly - Details Matter):**
- Main article/page content - every word
- Headings (h1-h6) with their hierarchy
- All paragraphs in full
- Lists (ordered and unordered) with all items
- Tables with all data
- Code blocks and inline code
- Blockquotes
- Important metadata (author, date, if visible in content)
- Image descriptions/captions when present
- Any data, statistics, or specific details

### Step 4: Format and Return Results

Present the extracted content in clean markdown format:

1. **Title**: Use the page's main heading as an H1
2. **Source**: Include the original URL for reference
3. **Content**: Full extracted content with preserved structure

## Example Output Format

```markdown
# [Page Title]

**Source:** [URL]

---

[Full extracted content preserving all headings, paragraphs, 
lists, tables, code blocks, and formatting exactly as they 
appear in the original]
```

## Content Extraction Priority

When identifying main content, look for these elements in order:

1. `<main>` element
2. `<article>` element
3. `[role="main"]` attribute
4. `.content`, `.main-content`, `.article-content`, `.post-content` classes
5. `#content`, `#main`, `#article` IDs
6. The largest text block in `<body>`

## Handling Different Page Types

### Article/Blog Posts
- Extract the full article text
- Include author and publication date if present
- Preserve all paragraphs and sections

### Documentation Pages
- Extract all documentation content
- Preserve code examples exactly
- Maintain heading hierarchy

### Product Pages
- Extract product descriptions
- Include specifications and features
- Preserve pricing information if present

### Data/Reference Pages
- Extract all tables and data
- Preserve numerical precision
- Include any footnotes or annotations

## Error Handling

| Error | Response |
|-------|----------|
| Invalid URL | "Please provide a valid URL starting with http:// or https://" |
| Connection failed | "Could not connect to [URL]. Please check the URL is correct and accessible." |
| 403/401 errors | "Access denied. This page may require authentication." |
| No content found | "Could not extract main content. The page may be JavaScript-rendered or have an unusual structure." |
| Timeout | "Request timed out. The server may be slow or unavailable." |

## Important Guidelines

1. **Copy everything exactly** - Details matter. Don't summarize or truncate.
2. **Preserve formatting** - Keep headings, lists, tables, and code blocks intact.
3. **Be thorough** - Extract ALL relevant content, not just the first few paragraphs.
4. **Note limitations** - If content appears incomplete, inform the user.
5. **Include source** - Always reference the original URL.

## Limitations

- **JavaScript-rendered pages**: Content loaded via JavaScript may not be captured
- **Authentication required**: Cannot access login-protected content
- **Rate limiting**: Some sites may block repeated requests
- **Very large pages**: May need to extract in sections
