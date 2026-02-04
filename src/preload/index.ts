import { contextBridge, ipcRenderer } from 'electron';

// Inline types to avoid cross-directory imports
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

interface SendMessageRequest {
  content: string;
}

interface StreamChunk {
  content: string;
  done: boolean;
  messageId: string;
}

const IPC_CHANNELS = {
  CHAT_SEND: 'chat:send',
  CHAT_STREAM: 'chat:stream',
  KNOWLEDGE_SEARCH: 'knowledge:search',
} as const;

/**
 * Preload script - exposes a safe API to the renderer process
 * 
 * SECURITY: Only expose specific, limited methods.
 * Never expose raw ipcRenderer or broad access to Node.js APIs.
 */

// Type for the exposed API
export interface ElectronAPI {
  sendMessage: (content: string) => Promise<ChatMessage>;
  streamMessage: (content: string) => Promise<{ messageId: string }>;
  onStreamChunk: (callback: (chunk: StreamChunk) => void) => () => void;
  searchKnowledge: (query: string) => Promise<Array<{
    path: string;
    title: string;
    content: string;
    snippet?: string;
  }>>;
  platform: NodeJS.Platform;
}

const api: ElectronAPI = {
  /**
   * Send a chat message and get a complete response
   */
  sendMessage: async (content: string): Promise<ChatMessage> => {
    const request: SendMessageRequest = { content };
    return ipcRenderer.invoke(IPC_CHANNELS.CHAT_SEND, request);
  },

  /**
   * Send a chat message and stream the response
   */
  streamMessage: async (content: string): Promise<{ messageId: string }> => {
    const request: SendMessageRequest = { content };
    return ipcRenderer.invoke(IPC_CHANNELS.CHAT_STREAM, request);
  },

  /**
   * Subscribe to stream chunks
   * Returns an unsubscribe function
   */
  onStreamChunk: (callback: (chunk: StreamChunk) => void): (() => void) => {
    const handler = (_event: Electron.IpcRendererEvent, chunk: StreamChunk) => {
      callback(chunk);
    };
    
    ipcRenderer.on('chat:chunk', handler);
    
    // Return cleanup function
    return () => {
      ipcRenderer.removeListener('chat:chunk', handler);
    };
  },

  /**
   * Search the local knowledge base
   */
  searchKnowledge: async (query: string) => {
    return ipcRenderer.invoke(IPC_CHANNELS.KNOWLEDGE_SEARCH, query);
  },

  /**
   * Current platform (for UI adjustments)
   */
  platform: process.platform,
};

// Expose the API to the renderer process
contextBridge.exposeInMainWorld('electronAPI', api);

// Type declaration for the renderer process
declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
