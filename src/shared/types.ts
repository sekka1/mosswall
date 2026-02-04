/**
 * Shared types used across main, preload, and renderer processes
 */

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  sources?: DataSource[];
  isStreaming?: boolean;
}

export interface DataSource {
  path: string;
  title: string;
  snippet?: string;
}

export interface SendMessageRequest {
  content: string;
  conversationId?: string;
}

export interface SendMessageResponse {
  message: ChatMessage;
  conversationId: string;
}

export interface StreamChunk {
  content: string;
  done: boolean;
  messageId: string;
}

export interface AppConfig {
  copilotApiKey?: string;
  dataDirectory: string;
  theme: 'light' | 'dark' | 'system';
}

// IPC Channel names
export const IPC_CHANNELS = {
  CHAT_SEND: 'chat:send',
  CHAT_STREAM: 'chat:stream',
  CHAT_STOP: 'chat:stop',
  KNOWLEDGE_SEARCH: 'knowledge:search',
  KNOWLEDGE_LOAD: 'knowledge:load',
  CONFIG_GET: 'config:get',
  CONFIG_SET: 'config:set',
} as const;
