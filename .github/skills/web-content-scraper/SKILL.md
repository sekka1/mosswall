---
name: web-content-scraper
description: Scrape and extract main content from webpages, including images with source attribution. Use when a user asks to scrape, fetch, extract, or grab content from a website URL. Extracts the primary article or page content while filtering out ads, headers, footers, navigation, sidebars, and site maps. Downloads relevant images and preserves their source URLs for copyright compliance. Preserves all important details and formatting from the main content.
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
- **Images with alt text and captions** (see Image Extraction section)
- **Image source URLs for attribution**
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

## Image Extraction

Images provide valuable visual context for moss wall care and installation. This skill supports downloading images while preserving attribution for copyright compliance.

### When to Download Images

**Download images that are:**
- Part of the main article/page content (inside `<main>`, `<article>`, `.content`)
- Illustrative or instructional (diagrams, how-to photos, examples)
- Relevant to the user's query topic
- Reasonably sized (width ≥ 100px, height ≥ 100px)

**Skip images that are:**
- Icons, logos, or UI elements (< 50px in either dimension)
- Tracking pixels (1x1 images)
- Advertisement banners
- Social media buttons or share icons
- Decorative backgrounds
- Author avatars or profile pictures
- Navigation or menu images

### Image Detection

Look for images in these elements within the main content area:

```html
<!-- Standard images -->
<img src="..." alt="...">

<!-- Responsive images -->
<img srcset="..." sizes="...">
<picture>
  <source srcset="...">
  <img src="...">
</picture>

<!-- Figure elements with captions -->
<figure>
  <img src="...">
  <figcaption>Image caption</figcaption>
</figure>
```

### URL Resolution

Convert relative URLs to absolute URLs before downloading:

| Original | Page URL | Resolved |
|----------|----------|----------|
| `/images/moss.jpg` | `https://example.com/article` | `https://example.com/images/moss.jpg` |
| `../photos/wall.png` | `https://example.com/guides/care` | `https://example.com/photos/wall.png` |
| `//cdn.example.com/img.webp` | `https://example.com/page` | `https://cdn.example.com/img.webp` |

### Supported Formats

| Format | Extension | Notes |
|--------|-----------|-------|
| JPEG | `.jpg`, `.jpeg` | Photos, most common |
| PNG | `.png` | Diagrams, screenshots |
| WebP | `.webp` | Modern format, good compression |
| GIF | `.gif` | Animations, simple graphics |
| SVG | `.svg` | Vector diagrams, icons |

### File Naming Convention

Downloaded images use this naming pattern:

```
{source-domain}_{content-hash}_{original-name}.{ext}
```

**Examples:**
- `example-com_a1b2c3_moss-wall-care.jpg`
- `gardening-guide_d4e5f6_installation-step-3.png`

### Storage Location

Save downloaded images to:

```
data/images/scraped/
├── {domain}/
│   ├── {image-file}
│   └── {image-file}
└── _attribution.yaml
```

## Image Attribution

**All downloaded images MUST have attribution metadata.** This preserves copyright information and source references.

### Attribution Manifest

Maintain a single attribution file at `data/images/scraped/_attribution.yaml`:

```yaml
# Image Attribution Manifest
# Auto-generated by web-content-scraper skill
# DO NOT manually edit source URLs

images:
  - filename: "example-com_a1b2c3_moss-wall-care.jpg"
    source_page: "https://example.com/moss-wall-guide"
    source_page_title: "Complete Moss Wall Care Guide"
    original_url: "https://example.com/images/moss-wall-care.jpg"
    alt_text: "Living moss wall in a modern office space"
    caption: "A thriving sheet moss installation after 6 months"
    detected_license: null  # null if not detected
    attribution_text: "Image from example.com"
    downloaded_at: "2026-02-03T10:30:00Z"
    dimensions:
      width: 1200
      height: 800

  - filename: "garden-blog_x7y8z9_humidity-chart.png"
    source_page: "https://garden-blog.com/moss-humidity"
    source_page_title: "Humidity Requirements for Indoor Moss"
    original_url: "https://cdn.garden-blog.com/charts/humidity.png"
    alt_text: "Chart showing optimal humidity ranges for different moss types"
    caption: null
    detected_license: "CC BY 4.0"
    attribution_text: "© Garden Blog, licensed under CC BY 4.0"
    downloaded_at: "2026-02-03T11:15:00Z"
    dimensions:
      width: 800
      height: 600
```

### License Detection

When scraping, look for license information in:

1. **Image metadata** - EXIF/XMP data containing copyright
2. **Nearby text** - Captions mentioning "©", "CC", "Creative Commons"
3. **Page footer** - Site-wide license declarations
4. **Schema.org markup** - `"license"` property in JSON-LD
5. **rel="license"** - Links near images

**Common licenses to detect:**
- `CC0` - Public domain
- `CC BY` - Attribution required
- `CC BY-SA` - Attribution + ShareAlike
- `CC BY-NC` - Attribution + NonCommercial
- `All rights reserved` - Standard copyright

### Displaying Images with Attribution

When including images in responses, ALWAYS cite the source:

**Inline format:**
```markdown
![Alt text](data/images/scraped/example-com_a1b2c3_moss.jpg)

*📷 Image source: [example.com](https://example.com/original-page)*
```

**With caption:**
```markdown
![Sheet moss wall installation](data/images/scraped/example-com_a1b2c3_moss.jpg)

*A thriving sheet moss wall after proper installation*
*📷 Source: [Example Garden Guide](https://example.com/moss-guide) • © example.com*
```

**For Creative Commons:**
```markdown
![Humidity chart for moss care](data/images/scraped/garden-blog_x7y8z9_chart.png)

*📷 Source: [Garden Blog](https://garden-blog.com/moss-humidity) • CC BY 4.0*
```

### Attribution Requirements by License

| License | Requirements |
|---------|--------------|
| `CC0` / Public Domain | Attribution appreciated but not required |
| `CC BY` | Must credit author/source, link to license |
| `CC BY-SA` | Credit + link + share derivatives under same license |
| `CC BY-NC` | Credit + link + non-commercial use only |
| `All rights reserved` | Link to source, use for reference/educational purposes |
| `Unknown` | Always link to source page, note "© original author" |

## Example Output with Images

When scraping a page with images, include them in the output:

```markdown
# Complete Moss Wall Care Guide

**Source:** [https://example.com/moss-wall-guide](https://example.com/moss-wall-guide)

---

## Introduction

Living moss walls bring natural beauty to indoor spaces...

![Living moss wall installation](data/images/scraped/example-com_a1b2c3_moss-wall.jpg)

*A mature sheet moss wall displaying optimal growth*
*📷 Source: [example.com](https://example.com/moss-wall-guide)*

## Humidity Requirements

Moss thrives in humidity between 40-60%...

![Humidity chart](data/images/scraped/example-com_d4e5f6_humidity-chart.png)

*Optimal humidity ranges by moss type*
*📷 Source: [example.com](https://example.com/moss-wall-guide)*

---

### Images Downloaded

| Image | Source | License |
|-------|--------|---------|
| moss-wall.jpg | example.com | © All rights reserved |
| humidity-chart.png | example.com | © All rights reserved |
```

## Limitations

- **JavaScript-rendered pages**: Content loaded via JavaScript may not be captured
- **Authentication required**: Cannot access login-protected content
- **Rate limiting**: Some sites may block repeated requests
- **Very large pages**: May need to extract in sections
- **Image hotlink protection**: Some sites block direct image downloads
- **Dynamic image URLs**: URLs with tokens/signatures may expire
- **Large images**: Files over 10MB should be skipped to conserve storage
