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
}
/**
 * Preload script - exposes a safe API to the renderer process
 *
 * SECURITY: Only expose specific, limited methods.
 * Never expose raw ipcRenderer or broad access to Node.js APIs.
 */
export interface ElectronAPI {
    sendMessage: (content: string) => Promise<ChatMessage>;
    streamMessage: (content: string) => Promise<{
        messageId: string;
    }>;
    onStreamChunk: (callback: (chunk: StreamChunk) => void) => () => void;
    searchKnowledge: (query: string) => Promise<Array<{
        path: string;
        title: string;
        content: string;
        snippet?: string;
    }>>;
    platform: NodeJS.Platform;
}
declare global {
    interface Window {
        electronAPI: ElectronAPI;
    }
}
export {};
//# sourceMappingURL=index.d.ts.map