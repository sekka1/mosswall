import * as fs from 'node:fs/promises';
import * as path from 'node:path';
/**
 * Service for searching and loading knowledge from the /data directory
 */
export class KnowledgeService {
    dataDirectory;
    documentCache = new Map();
    constructor(dataDirectory) {
        this.dataDirectory = dataDirectory;
    }
    /**
     * Search the knowledge base for relevant documents
     */
    async search(query) {
        const results = [];
        const queryTerms = query.toLowerCase().split(/\s+/);
        try {
            const documents = await this.getAllDocuments();
            for (const doc of documents) {
                const contentLower = doc.content.toLowerCase();
                const titleLower = doc.title.toLowerCase();
                // Simple relevance scoring based on term matches
                let score = 0;
                for (const term of queryTerms) {
                    if (term.length < 3)
                        continue; // Skip short words
                    if (titleLower.includes(term))
                        score += 10;
                    if (contentLower.includes(term)) {
                        // Count occurrences
                        const matches = (contentLower.match(new RegExp(term, 'g')) ?? []).length;
                        score += Math.min(matches, 5); // Cap at 5 matches
                    }
                }
                if (score > 0) {
                    results.push({
                        ...doc,
                        snippet: this.extractSnippet(doc.content, queryTerms),
                    });
                }
            }
            // Sort by relevance (highest first) and return top results
            return results
                .sort((a, b) => this.scoreDocument(b, queryTerms) - this.scoreDocument(a, queryTerms))
                .slice(0, 3);
        }
        catch (error) {
            console.error('Error searching knowledge base:', error);
            return [];
        }
    }
    /**
     * Load a specific document by path
     */
    async loadDocument(relativePath) {
        // Security: Prevent path traversal
        const normalizedPath = path.normalize(relativePath);
        if (normalizedPath.includes('..')) {
            throw new Error('Invalid path');
        }
        const fullPath = path.join(this.dataDirectory, normalizedPath);
        // Ensure path is within data directory
        if (!fullPath.startsWith(this.dataDirectory)) {
            throw new Error('Invalid path');
        }
        try {
            const content = await fs.readFile(fullPath, 'utf-8');
            const title = this.extractTitle(content, relativePath);
            return {
                path: relativePath,
                title,
                content,
            };
        }
        catch (error) {
            console.error(`Error loading document: ${relativePath}`, error);
            return null;
        }
    }
    /**
     * Get all documents from the knowledge base
     */
    async getAllDocuments() {
        const documents = [];
        try {
            await this.walkDirectory(this.dataDirectory, async (filePath) => {
                const ext = path.extname(filePath).toLowerCase();
                if (ext === '.md' || ext === '.yaml' || ext === '.yml') {
                    const relativePath = path.relative(this.dataDirectory, filePath);
                    // Check cache first
                    if (this.documentCache.has(relativePath)) {
                        documents.push(this.documentCache.get(relativePath));
                        return;
                    }
                    try {
                        const content = await fs.readFile(filePath, 'utf-8');
                        // Skip .gitkeep and empty files
                        if (content.trim().length < 10)
                            return;
                        const doc = {
                            path: relativePath,
                            title: this.extractTitle(content, relativePath),
                            content,
                        };
                        this.documentCache.set(relativePath, doc);
                        documents.push(doc);
                    }
                    catch (error) {
                        console.error(`Error reading file: ${filePath}`, error);
                    }
                }
            });
        }
        catch (error) {
            console.error('Error walking data directory:', error);
        }
        return documents;
    }
    /**
     * Recursively walk a directory
     */
    async walkDirectory(dir, callback) {
        try {
            const entries = await fs.readdir(dir, { withFileTypes: true });
            for (const entry of entries) {
                const fullPath = path.join(dir, entry.name);
                if (entry.isDirectory() && !entry.name.startsWith('.')) {
                    await this.walkDirectory(fullPath, callback);
                }
                else if (entry.isFile()) {
                    await callback(fullPath);
                }
            }
        }
        catch {
            // Directory might not exist yet
            console.warn(`Directory not accessible: ${dir}`);
        }
    }
    /**
     * Extract title from document content or filename
     */
    extractTitle(content, filePath) {
        // Try to extract from markdown heading
        const headingMatch = content.match(/^#\s+(.+)$/m);
        if (headingMatch) {
            return headingMatch[1].trim();
        }
        // Try to extract from YAML name field
        const yamlMatch = content.match(/^name:\s*["']?(.+?)["']?\s*$/m);
        if (yamlMatch) {
            return yamlMatch[1].trim();
        }
        // Fall back to filename
        return path.basename(filePath, path.extname(filePath))
            .replace(/-/g, ' ')
            .replace(/\b\w/g, c => c.toUpperCase());
    }
    /**
     * Extract a relevant snippet from content
     */
    extractSnippet(content, queryTerms) {
        const lines = content.split('\n');
        for (const term of queryTerms) {
            if (term.length < 3)
                continue;
            for (let i = 0; i < lines.length; i++) {
                if (lines[i].toLowerCase().includes(term)) {
                    // Return a few lines around the match
                    const start = Math.max(0, i - 1);
                    const end = Math.min(lines.length, i + 3);
                    const snippet = lines.slice(start, end).join('\n').trim();
                    if (snippet.length > 20) {
                        return snippet.length > 300
                            ? snippet.substring(0, 300) + '...'
                            : snippet;
                    }
                }
            }
        }
        // Fall back to first meaningful content
        const firstContent = lines
            .filter(l => l.trim() && !l.startsWith('#') && !l.startsWith('---'))
            .slice(0, 3)
            .join('\n');
        return firstContent.length > 300
            ? firstContent.substring(0, 300) + '...'
            : firstContent;
    }
    /**
     * Score a document for relevance
     */
    scoreDocument(doc, queryTerms) {
        let score = 0;
        const contentLower = doc.content.toLowerCase();
        const titleLower = doc.title.toLowerCase();
        for (const term of queryTerms) {
            if (term.length < 3)
                continue;
            if (titleLower.includes(term))
                score += 10;
            const matches = (contentLower.match(new RegExp(term, 'g')) ?? []).length;
            score += Math.min(matches, 5);
        }
        return score;
    }
    /**
     * Clear the document cache
     */
    clearCache() {
        this.documentCache.clear();
    }
}
//# sourceMappingURL=knowledge-service.js.map