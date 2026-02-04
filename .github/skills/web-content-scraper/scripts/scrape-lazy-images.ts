#!/usr/bin/env npx ts-node
/**
 * Playwright-based web scraper for lazy-loaded images
 *
 * This script uses Playwright to render JavaScript-heavy pages and extract
 * images that use lazy-loading techniques (data-src, data-lazy-src, srcset).
 *
 * Usage:
 *   npx ts-node scripts/scrape-lazy-images.ts <url> [output-dir]
 *
 * Examples:
 *   npx ts-node scripts/scrape-lazy-images.ts https://example.com/blog/article
 *   npx ts-node scripts/scrape-lazy-images.ts https://example.com/blog/article ./output
 *
 * Output:
 *   - Downloaded images in output-dir/images/
 *   - Attribution manifest at output-dir/images/_attribution.yaml
 *   - Extracted content at output-dir/content.md
 *
 * Prerequisites:
 *   npm install playwright (or use @playwright/test which includes it)
 *   npx playwright install chromium
 */

import { chromium, type Browser, type Page } from 'playwright';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as https from 'node:https';
import * as http from 'node:http';

// ============================================================================
// Types
// ============================================================================

interface ImageInfo {
  /** Original URL of the image */
  url: string;
  /** Alt text from the image element */
  alt: string;
  /** Title attribute if present */
  title?: string;
  /** Caption from figcaption or nearby text */
  caption?: string;
  /** Source attribution (data-source, data-credit, etc.) */
  source?: string;
  /** Local filename after download */
  localFilename?: string;
  /** Whether the image was successfully downloaded */
  downloaded: boolean;
  /** Error message if download failed */
  error?: string;
  /** Image dimensions if available */
  width?: number;
  height?: number;
  /** Extraction method used */
  extractionMethod: 'src' | 'data-src' | 'data-lazy-src' | 'srcset' | 'noscript';
}

interface ScrapedContent {
  /** Page title */
  title: string;
  /** Page URL */
  url: string;
  /** Extracted main content as markdown */
  content: string;
  /** All extracted images */
  images: ImageInfo[];
  /** Scrape timestamp */
  scrapedAt: string;
}

interface SrcsetEntry {
  url: string;
  descriptor: string;
  width?: number;
}

// ============================================================================
// Configuration
// ============================================================================

const CONFIG = {
  /** Viewport dimensions for rendering */
  viewport: { width: 1920, height: 1080 },
  /** How long to wait for network idle after scroll (ms) */
  networkIdleTimeout: 2000,
  /** How many pixels to scroll each step */
  scrollStep: 500,
  /** Delay between scroll steps (ms) */
  scrollDelay: 300,
  /** Maximum time to wait for page load (ms) */
  pageTimeout: 30000,
  /** User agent string */
  userAgent:
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  /** Selectors for main content areas */
  contentSelectors: [
    'article',
    'main',
    '.post-content',
    '.entry-content',
    '.article-content',
    '.blog-content',
    '#content',
    '.content',
  ],
  /** Selectors to remove from content */
  removeSelectors: [
    'script',
    'style',
    'nav',
    'header',
    'footer',
    '.sidebar',
    '.comments',
    '.related-posts',
    '.share-buttons',
    '.advertisement',
    '.ad',
    'iframe',
  ],
};

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Sanitize a string for use as a filename
 */
function sanitizeFilename(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9.-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 100);
}

/**
 * Extract filename from URL
 */
function getFilenameFromUrl(url: string): string {
  try {
    const urlObj = new URL(url);
    const pathname = urlObj.pathname;
    const basename = path.basename(pathname);

    // If no extension, try to determine from URL
    if (!path.extname(basename)) {
      return sanitizeFilename(basename) + '.jpg';
    }

    return sanitizeFilename(basename);
  } catch {
    return `image-${Date.now()}.jpg`;
  }
}

/**
 * Parse srcset attribute into individual entries
 */
function parseSrcset(srcset: string): SrcsetEntry[] {
  const entries: SrcsetEntry[] = [];

  // Split by comma, handling URLs with commas
  const parts = srcset.split(/,\s*(?=https?:|\/)/);

  for (const part of parts) {
    const trimmed = part.trim();
    if (!trimmed) continue;

    // Match URL and optional descriptor (e.g., "1200w" or "2x")
    const match = trimmed.match(/^(.+?)\s+(\d+w|\d+(?:\.\d+)?x)?$/);

    if (match) {
      const url = match[1].trim();
      const descriptor = match[2] || '1x';
      const width = descriptor.endsWith('w') ? parseInt(descriptor, 10) : undefined;

      entries.push({ url, descriptor, width });
    } else {
      // URL without descriptor
      entries.push({ url: trimmed, descriptor: '1x' });
    }
  }

  // Sort by width descending to get highest quality first
  return entries.sort((a, b) => (b.width || 0) - (a.width || 0));
}

/**
 * Download a file from URL to local path
 */
async function downloadFile(url: string, destPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http;

    const request = protocol.get(url, { headers: { 'User-Agent': CONFIG.userAgent } }, (response) => {
      // Handle redirects
      if (response.statusCode === 301 || response.statusCode === 302) {
        const redirectUrl = response.headers.location;
        if (redirectUrl) {
          downloadFile(redirectUrl, destPath).then(resolve).catch(reject);
          return;
        }
      }

      if (response.statusCode !== 200) {
        reject(new Error(`HTTP ${response.statusCode}: ${response.statusMessage}`));
        return;
      }

      const fileStream = fs.createWriteStream(destPath);
      response.pipe(fileStream);

      fileStream.on('finish', () => {
        fileStream.close();
        resolve();
      });

      fileStream.on('error', (err) => {
        fs.unlink(destPath, () => {}); // Clean up partial file
        reject(err);
      });
    });

    request.on('error', reject);
    request.setTimeout(30000, () => {
      request.destroy();
      reject(new Error('Download timeout'));
    });
  });
}

/**
 * Convert HTML to simple markdown
 */
function htmlToMarkdown(html: string): string {
  return (
    html
      // Headers
      .replace(/<h1[^>]*>(.*?)<\/h1>/gi, '# $1\n\n')
      .replace(/<h2[^>]*>(.*?)<\/h2>/gi, '## $1\n\n')
      .replace(/<h3[^>]*>(.*?)<\/h3>/gi, '### $1\n\n')
      .replace(/<h4[^>]*>(.*?)<\/h4>/gi, '#### $1\n\n')
      .replace(/<h5[^>]*>(.*?)<\/h5>/gi, '##### $1\n\n')
      .replace(/<h6[^>]*>(.*?)<\/h6>/gi, '###### $1\n\n')
      // Paragraphs
      .replace(/<p[^>]*>(.*?)<\/p>/gi, '$1\n\n')
      // Line breaks
      .replace(/<br\s*\/?>/gi, '\n')
      // Bold
      .replace(/<(?:strong|b)[^>]*>(.*?)<\/(?:strong|b)>/gi, '**$1**')
      // Italic
      .replace(/<(?:em|i)[^>]*>(.*?)<\/(?:em|i)>/gi, '*$1*')
      // Links
      .replace(/<a[^>]*href="([^"]*)"[^>]*>(.*?)<\/a>/gi, '[$2]($1)')
      // Lists
      .replace(/<ul[^>]*>/gi, '\n')
      .replace(/<\/ul>/gi, '\n')
      .replace(/<ol[^>]*>/gi, '\n')
      .replace(/<\/ol>/gi, '\n')
      .replace(/<li[^>]*>(.*?)<\/li>/gi, '- $1\n')
      // Blockquotes
      .replace(/<blockquote[^>]*>(.*?)<\/blockquote>/gi, '> $1\n\n')
      // Code
      .replace(/<code[^>]*>(.*?)<\/code>/gi, '`$1`')
      .replace(/<pre[^>]*>(.*?)<\/pre>/gi, '```\n$1\n```\n\n')
      // Remove remaining tags
      .replace(/<[^>]+>/g, '')
      // Decode HTML entities
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      // Clean up whitespace
      .replace(/\n{3,}/g, '\n\n')
      .trim()
  );
}

// ============================================================================
// Main Scraper Class
// ============================================================================

class LazyImageScraper {
  private browser: Browser | null = null;
  private page: Page | null = null;

  /**
   * Initialize the browser
   */
  async init(): Promise<void> {
    console.log('🚀 Launching browser...');
    this.browser = await chromium.launch({
      headless: true,
    });

    const context = await this.browser.newContext({
      viewport: CONFIG.viewport,
      userAgent: CONFIG.userAgent,
    });

    this.page = await context.newPage();
  }

  /**
   * Close the browser
   */
  async close(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      this.page = null;
    }
  }

  /**
   * Scroll through the entire page to trigger lazy loading
   */
  private async scrollToLoadImages(): Promise<void> {
    if (!this.page) throw new Error('Page not initialized');

    console.log('📜 Scrolling to trigger lazy-loaded images...');

    // Get page height
    const pageHeight = await this.page.evaluate(() => document.body.scrollHeight);
    let currentPosition = 0;

    while (currentPosition < pageHeight) {
      await this.page.evaluate((y) => window.scrollTo(0, y), currentPosition);
      await this.page.waitForTimeout(CONFIG.scrollDelay);
      currentPosition += CONFIG.scrollStep;

      // Check if page height increased (infinite scroll)
      const newHeight = await this.page.evaluate(() => document.body.scrollHeight);
      if (newHeight > pageHeight) {
        console.log('  📄 Page expanded, continuing scroll...');
      }
    }

    // Scroll back to top
    await this.page.evaluate(() => window.scrollTo(0, 0));

    // Wait for any final image loads
    await this.page.waitForTimeout(CONFIG.networkIdleTimeout);
    console.log('  ✅ Scroll complete');
  }

  /**
   * Extract all images from the page
   */
  private async extractImages(): Promise<ImageInfo[]> {
    if (!this.page) throw new Error('Page not initialized');

    console.log('🖼️  Extracting images...');

    const images = await this.page.evaluate(() => {
      const results: Array<{
        url: string;
        alt: string;
        title?: string;
        caption?: string;
        source?: string;
        width?: number;
        height?: number;
        extractionMethod: string;
      }> = [];

      // Helper to get best URL from an image element
      const getBestImageUrl = (
        img: HTMLImageElement
      ): { url: string; method: string } | null => {
        // Priority order for URL extraction

        // 1. Check data-lazy-src (WordPress)
        const lazyDataSrc = img.getAttribute('data-lazy-src');
        if (lazyDataSrc && !lazyDataSrc.startsWith('data:')) {
          return { url: lazyDataSrc, method: 'data-lazy-src' };
        }

        // 2. Check data-src (common lazy-load)
        const dataSrc = img.getAttribute('data-src');
        if (dataSrc && !dataSrc.startsWith('data:')) {
          return { url: dataSrc, method: 'data-src' };
        }

        // 3. Check srcset for highest resolution
        const srcset = img.getAttribute('data-lazy-srcset') || img.getAttribute('srcset');
        if (srcset) {
          const entries = srcset.split(',').map((s) => s.trim());
          let bestUrl = '';
          let bestWidth = 0;

          for (const entry of entries) {
            const parts = entry.split(/\s+/);
            if (parts.length >= 1) {
              const url = parts[0];
              const descriptor = parts[1] || '1x';
              const width = descriptor.endsWith('w')
                ? parseInt(descriptor, 10)
                : 1000;

              if (width > bestWidth && !url.startsWith('data:')) {
                bestWidth = width;
                bestUrl = url;
              }
            }
          }

          if (bestUrl) {
            return { url: bestUrl, method: 'srcset' };
          }
        }

        // 4. Check regular src (if not a placeholder)
        const src = img.src || img.getAttribute('src');
        if (src && !src.startsWith('data:') && !src.includes('placeholder')) {
          return { url: src, method: 'src' };
        }

        return null;
      };

      // Helper to find caption near an image
      const findCaption = (img: HTMLImageElement): string | undefined => {
        // Check for figcaption
        const figure = img.closest('figure');
        if (figure) {
          const figcaption = figure.querySelector('figcaption');
          if (figcaption) {
            return figcaption.textContent?.trim();
          }
        }

        // Check for wp-caption-text (WordPress)
        const wpCaption = img
          .closest('.wp-caption')
          ?.querySelector('.wp-caption-text');
        if (wpCaption) {
          return wpCaption.textContent?.trim();
        }

        return undefined;
      };

      // Helper to find source attribution
      const findSource = (img: HTMLImageElement): string | undefined => {
        // Check data attributes
        const dataSource =
          img.getAttribute('data-source') ||
          img.getAttribute('data-credit') ||
          img.getAttribute('data-attribution');
        if (dataSource) return dataSource;

        // Check figure for source
        const figure = img.closest('figure');
        if (figure) {
          const source = figure.querySelector('.source, .credit, .attribution');
          if (source) return source.textContent?.trim();
        }

        return undefined;
      };

      // Process all img elements
      const imgElements = Array.from(document.querySelectorAll('img'));
      for (const img of imgElements) {
        const urlInfo = getBestImageUrl(img);
        if (!urlInfo) continue;

        // Skip tiny images (likely icons)
        const width = img.naturalWidth || img.width;
        const height = img.naturalHeight || img.height;
        if ((width > 0 && width < 50) || (height > 0 && height < 50)) {
          continue;
        }

        results.push({
          url: urlInfo.url,
          alt: img.alt || '',
          title: img.title || undefined,
          caption: findCaption(img),
          source: findSource(img),
          width: width || undefined,
          height: height || undefined,
          extractionMethod: urlInfo.method,
        });
      }

      // Also check noscript tags for fallback images
      const noscripts = Array.from(document.querySelectorAll('noscript'));
      for (const noscript of noscripts) {
        const content = noscript.textContent || '';
        const imgMatch = content.match(/<img[^>]+src="([^"]+)"[^>]*>/);
        if (imgMatch) {
          const url = imgMatch[1];
          if (!url.startsWith('data:')) {
            const altMatch = content.match(/alt="([^"]*)"/);
            results.push({
              url,
              alt: altMatch ? altMatch[1] : '',
              extractionMethod: 'noscript',
            });
          }
        }
      }

      return results;
    });

    // Deduplicate by URL
    const seen = new Set<string>();
    const uniqueImages: ImageInfo[] = [];

    for (const img of images) {
      // Resolve relative URLs
      let fullUrl = img.url;
      if (!fullUrl.startsWith('http')) {
        try {
          fullUrl = new URL(img.url, this.page!.url()).href;
        } catch {
          continue;
        }
      }

      if (!seen.has(fullUrl)) {
        seen.add(fullUrl);
        uniqueImages.push({
          ...img,
          url: fullUrl,
          downloaded: false,
          extractionMethod: img.extractionMethod as ImageInfo['extractionMethod'],
        });
      }
    }

    console.log(`  ✅ Found ${uniqueImages.length} unique images`);
    return uniqueImages;
  }

  /**
   * Extract main text content from the page
   */
  private async extractContent(): Promise<{ title: string; content: string }> {
    if (!this.page) throw new Error('Page not initialized');

    console.log('📝 Extracting content...');

    const result = await this.page.evaluate(
      ({ contentSelectors, removeSelectors }) => {
        // Get page title
        const title =
          document.querySelector('h1')?.textContent?.trim() ||
          document.title ||
          'Untitled';

        // Find main content area
        let contentElement: Element | null = null;
        for (const selector of contentSelectors) {
          contentElement = document.querySelector(selector);
          if (contentElement) break;
        }

        if (!contentElement) {
          contentElement = document.body;
        }

        // Clone to avoid modifying the page
        const clone = contentElement.cloneNode(true) as Element;

        // Remove unwanted elements
        for (const selector of removeSelectors) {
          clone.querySelectorAll(selector).forEach((el) => el.remove());
        }

        return {
          title,
          content: clone.innerHTML,
        };
      },
      { contentSelectors: CONFIG.contentSelectors, removeSelectors: CONFIG.removeSelectors }
    );

    return {
      title: result.title,
      content: htmlToMarkdown(result.content),
    };
  }

  /**
   * Download all images to a directory
   */
  private async downloadImages(
    images: ImageInfo[],
    outputDir: string
  ): Promise<ImageInfo[]> {
    console.log(`📥 Downloading ${images.length} images...`);

    const imagesDir = path.join(outputDir, 'images');
    fs.mkdirSync(imagesDir, { recursive: true });

    const results: ImageInfo[] = [];

    for (const img of images) {
      const filename = getFilenameFromUrl(img.url);
      const destPath = path.join(imagesDir, filename);

      // Avoid duplicates
      let finalFilename = filename;
      let counter = 1;
      while (fs.existsSync(path.join(imagesDir, finalFilename))) {
        const ext = path.extname(filename);
        const base = path.basename(filename, ext);
        finalFilename = `${base}-${counter}${ext}`;
        counter++;
      }

      const finalPath = path.join(imagesDir, finalFilename);

      try {
        await downloadFile(img.url, finalPath);
        results.push({
          ...img,
          localFilename: finalFilename,
          downloaded: true,
        });
        console.log(`  ✅ ${finalFilename}`);
      } catch (err) {
        const error = err instanceof Error ? err.message : String(err);
        results.push({
          ...img,
          localFilename: finalFilename,
          downloaded: false,
          error,
        });
        console.log(`  ❌ ${finalFilename}: ${error}`);
      }
    }

    return results;
  }

  /**
   * Generate attribution manifest
   */
  private generateAttributionManifest(
    images: ImageInfo[],
    pageUrl: string
  ): string {
    const lines: string[] = [
      '# Image Attribution Manifest',
      '# Auto-generated by scrape-lazy-images.ts',
      `# Source: ${pageUrl}`,
      `# Generated: ${new Date().toISOString()}`,
      '',
      'images:',
    ];

    for (const img of images) {
      lines.push(`  - filename: "${img.localFilename || 'unknown'}"`);
      lines.push(`    source_url: "${img.url}"`);
      lines.push(`    alt_text: "${(img.alt || '').replace(/"/g, '\\"')}"`);

      if (img.title) {
        lines.push(`    title: "${img.title.replace(/"/g, '\\"')}"`);
      }
      if (img.caption) {
        lines.push(`    caption: "${img.caption.replace(/"/g, '\\"')}"`);
      }
      if (img.source) {
        lines.push(`    attribution: "${img.source.replace(/"/g, '\\"')}"`);
      }

      lines.push(`    extraction_method: "${img.extractionMethod}"`);
      lines.push(`    downloaded: ${img.downloaded}`);

      if (img.error) {
        lines.push(`    error: "${img.error.replace(/"/g, '\\"')}"`);
      }
      if (img.width && img.height) {
        lines.push(`    dimensions: "${img.width}x${img.height}"`);
      }

      lines.push(`    license: "unknown - verify before use"`);
      lines.push('');
    }

    return lines.join('\n');
  }

  /**
   * Main scrape method
   */
  async scrape(url: string, outputDir: string): Promise<ScrapedContent> {
    if (!this.page) throw new Error('Browser not initialized');

    console.log(`\n🌐 Scraping: ${url}\n`);

    // Navigate to page
    console.log('📄 Loading page...');
    await this.page.goto(url, {
      waitUntil: 'domcontentloaded',
      timeout: CONFIG.pageTimeout,
    });

    // Wait for initial render
    await this.page.waitForTimeout(1000);

    // Scroll to trigger lazy loading
    await this.scrollToLoadImages();

    // Extract content
    const { title, content } = await this.extractContent();

    // Extract images
    let images = await this.extractImages();

    // Download images
    images = await this.downloadImages(images, outputDir);

    // Generate attribution manifest
    const attribution = this.generateAttributionManifest(images, url);
    const attributionPath = path.join(outputDir, 'images', '_attribution.yaml');
    fs.writeFileSync(attributionPath, attribution);
    console.log(`\n📋 Attribution manifest: ${attributionPath}`);

    // Save content
    const contentPath = path.join(outputDir, 'content.md');
    const markdown = [
      `# ${title}`,
      '',
      `> Source: ${url}`,
      `> Scraped: ${new Date().toISOString()}`,
      '',
      '---',
      '',
      content,
    ].join('\n');
    fs.writeFileSync(contentPath, markdown);
    console.log(`📝 Content saved: ${contentPath}`);

    const result: ScrapedContent = {
      title,
      url,
      content,
      images,
      scrapedAt: new Date().toISOString(),
    };

    // Print summary
    const downloaded = images.filter((i) => i.downloaded).length;
    console.log(`\n✨ Scraping complete!`);
    console.log(`   📝 Title: ${title}`);
    console.log(`   🖼️  Images: ${downloaded}/${images.length} downloaded`);
    console.log(`   📂 Output: ${outputDir}`);

    return result;
  }
}

// ============================================================================
// CLI Entry Point
// ============================================================================

async function main(): Promise<void> {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.log(`
Usage: npx ts-node scrape-lazy-images.ts <url> [output-dir]

Arguments:
  url         The URL to scrape
  output-dir  Output directory (default: ./scraped-<timestamp>)

Examples:
  npx ts-node scrape-lazy-images.ts https://example.com/blog/article
  npx ts-node scrape-lazy-images.ts https://example.com/blog/article ./output
`);
    process.exit(1);
  }

  const url = args[0];
  const outputDir = args[1] || `./scraped-${Date.now()}`;

  // Validate URL
  try {
    new URL(url);
  } catch {
    console.error(`❌ Invalid URL: ${url}`);
    process.exit(1);
  }

  // Create output directory
  fs.mkdirSync(outputDir, { recursive: true });

  const scraper = new LazyImageScraper();

  try {
    await scraper.init();
    await scraper.scrape(url, outputDir);
  } catch (err) {
    console.error('❌ Scraping failed:', err);
    process.exit(1);
  } finally {
    await scraper.close();
  }
}

main();
