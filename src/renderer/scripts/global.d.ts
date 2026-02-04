/**
 * Type declarations for the renderer process
 */

interface StreamChunk {
  content: string;
  done: boolean;
  messageId: string;
  error?: string;
}

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

interface ElectronAPI {
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

interface Window {
  electronAPI: ElectronAPI;
}
