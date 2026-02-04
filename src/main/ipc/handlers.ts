import { IpcMain, BrowserWindow } from 'electron';
import { CopilotService } from '../services/copilot-service.js';
import { KnowledgeService } from '../services/knowledge-service.js';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

// Inline types to avoid cross-directory imports
interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  sources?: DataSource[];
  isStreaming?: boolean;
}

interface DataSource {
  path: string;
  title: string;
  snippet?: string;
}

interface SendMessageRequest {
  content: string;
  conversationId?: string;
}

const IPC_CHANNELS = {
  CHAT_SEND: 'chat:send',
  CHAT_STREAM: 'chat:stream',
  CHAT_STOP: 'chat:stop',
  KNOWLEDGE_SEARCH: 'knowledge:search',
  KNOWLEDGE_LOAD: 'knowledge:load',
} as const;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const copilotService = new CopilotService();
const knowledgeService = new KnowledgeService(
  path.join(__dirname, '..', '..', '..', 'data')
);

export function setupIpcHandlers(ipcMain: IpcMain): void {
  
  // Handle chat messages
  ipcMain.handle(
    IPC_CHANNELS.CHAT_SEND,
    async (_event, request: SendMessageRequest): Promise<ChatMessage> => {
      // Validate input
      if (!request?.content || typeof request.content !== 'string') {
        throw new Error('Invalid message content');
      }

      if (request.content.length > 10000) {
        throw new Error('Message too long (max 10,000 characters)');
      }

      try {
        // Search local knowledge base for relevant context
        const relevantDocs = await knowledgeService.search(request.content);
        
        // Build context from local knowledge
        const context = relevantDocs.length > 0
          ? `Use this moss wall knowledge to help answer:\n\n${relevantDocs.map(d => d.content).join('\n\n')}`
          : '';

        // Get response from Copilot
        const response = await copilotService.chat(request.content, context);

        const message: ChatMessage = {
          id: generateId(),
          role: 'assistant',
          content: response,
          timestamp: new Date(),
          sources: relevantDocs.map(d => ({
            path: d.path,
            title: d.title,
            snippet: d.snippet,
          })),
        };

        return message;
      } catch (error) {
        console.error('Error processing chat message:', error);
        throw new Error('Failed to get response. Please try again.');
      }
    }
  );

  // Handle streaming chat messages
  ipcMain.handle(
    IPC_CHANNELS.CHAT_STREAM,
    async (event, request: SendMessageRequest): Promise<{ messageId: string }> => {
      if (!request?.content || typeof request.content !== 'string') {
        throw new Error('Invalid message content');
      }

      const messageId = generateId();
      const window = BrowserWindow.fromWebContents(event.sender);

      try {
        const relevantDocs = await knowledgeService.search(request.content);
        
        const context = relevantDocs.length > 0
          ? `Use this moss wall knowledge to help answer:\n\n${relevantDocs.map(d => d.content).join('\n\n')}`
          : '';

        // Stream response
        await copilotService.streamChat(
          request.content,
          context,
          (chunk: string, done: boolean) => {
            if (window && !window.isDestroyed()) {
              window.webContents.send('chat:chunk', {
                content: chunk,
                done,
                messageId,
              });
            }
          }
        );

        return { messageId };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error('Error streaming chat:', errorMessage);
        
        // Send error through the stream so UI can display it
        if (window && !window.isDestroyed()) {
          window.webContents.send('chat:chunk', {
            content: '',
            done: true,
            messageId,
            error: errorMessage,
          });
        }
        
        throw new Error(errorMessage);
      }
    }
  );

  // Handle knowledge search
  ipcMain.handle(
    IPC_CHANNELS.KNOWLEDGE_SEARCH,
    async (_, query: string) => {
      if (!query || typeof query !== 'string') {
        throw new Error('Invalid search query');
      }

      return knowledgeService.search(query);
    }
  );

  // Handle knowledge document loading
  ipcMain.handle(
    IPC_CHANNELS.KNOWLEDGE_LOAD,
    async (_, filePath: string) => {
      if (!filePath || typeof filePath !== 'string') {
        throw new Error('Invalid file path');
      }

      return knowledgeService.loadDocument(filePath);
    }
  );
}

function generateId(): string {
  return `msg_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
}
