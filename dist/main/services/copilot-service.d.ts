export declare class CopilotService {
    private client;
    private session;
    private systemPrompt;
    constructor();
    /**
     * Get or create a Copilot client and session
     */
    private getSession;
    /**
     * Send a chat message and get a complete response
     */
    chat(message: string, context?: string): Promise<string>;
    /**
     * Stream a chat response chunk by chunk
     */
    streamChat(message: string, context: string, onChunk: (chunk: string, done: boolean) => void): Promise<void>;
    /**
     * Cleanup resources
     */
    dispose(): Promise<void>;
}
//# sourceMappingURL=copilot-service.d.ts.map