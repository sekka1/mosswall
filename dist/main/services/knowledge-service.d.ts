interface KnowledgeDocument {
    path: string;
    title: string;
    content: string;
    snippet?: string;
}
/**
 * Service for searching and loading knowledge from the /data directory
 */
export declare class KnowledgeService {
    private dataDirectory;
    private documentCache;
    constructor(dataDirectory: string);
    /**
     * Search the knowledge base for relevant documents
     */
    search(query: string): Promise<KnowledgeDocument[]>;
    /**
     * Load a specific document by path
     */
    loadDocument(relativePath: string): Promise<KnowledgeDocument | null>;
    /**
     * Get all documents from the knowledge base
     */
    private getAllDocuments;
    /**
     * Recursively walk a directory
     */
    private walkDirectory;
    /**
     * Extract title from document content or filename
     */
    private extractTitle;
    /**
     * Extract a relevant snippet from content
     */
    private extractSnippet;
    /**
     * Score a document for relevance
     */
    private scoreDocument;
    /**
     * Clear the document cache
     */
    clearCache(): void;
}
export {};
//# sourceMappingURL=knowledge-service.d.ts.map