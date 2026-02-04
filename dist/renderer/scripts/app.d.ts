/**
 * Moss Wall AI Assistant - Renderer Process
 */
interface ChatMessage {
    id: string;
    role: 'user' | 'assistant' | 'system';
    content: string;
    timestamp: Date;
    sources?: Array<{
        path: string;
        title: string;
        snippet?: string;
    }>;
}
interface StreamChunk {
    content: string;
    done: boolean;
    messageId: string;
    error?: string;
}
declare class AssistantApp {
    private messagesContainer;
    private chatForm;
    private messageInput;
    private sendButton;
    private isStreaming;
    private currentStreamingMessage;
    private unsubscribeStream;
    constructor();
    private setupEventListeners;
    private setupStreamListener;
    private handleSubmit;
    private addMessage;
    private createMessageElement;
    private createSourcesElement;
    private addTypingIndicator;
    private removeTypingIndicator;
    private formatMarkdown;
    private escapeHtml;
    private scrollToBottom;
    private autoResizeTextarea;
    private disableInput;
    private enableInput;
    private generateId;
    destroy(): void;
}
//# sourceMappingURL=app.d.ts.map