"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
const IPC_CHANNELS = {
    CHAT_SEND: 'chat:send',
    CHAT_STREAM: 'chat:stream',
    KNOWLEDGE_SEARCH: 'knowledge:search',
};
const api = {
    /**
     * Send a chat message and get a complete response
     */
    sendMessage: async (content) => {
        const request = { content };
        return electron_1.ipcRenderer.invoke(IPC_CHANNELS.CHAT_SEND, request);
    },
    /**
     * Send a chat message and stream the response
     */
    streamMessage: async (content) => {
        const request = { content };
        return electron_1.ipcRenderer.invoke(IPC_CHANNELS.CHAT_STREAM, request);
    },
    /**
     * Subscribe to stream chunks
     * Returns an unsubscribe function
     */
    onStreamChunk: (callback) => {
        const handler = (_event, chunk) => {
            callback(chunk);
        };
        electron_1.ipcRenderer.on('chat:chunk', handler);
        // Return cleanup function
        return () => {
            electron_1.ipcRenderer.removeListener('chat:chunk', handler);
        };
    },
    /**
     * Search the local knowledge base
     */
    searchKnowledge: async (query) => {
        return electron_1.ipcRenderer.invoke(IPC_CHANNELS.KNOWLEDGE_SEARCH, query);
    },
    /**
     * Current platform (for UI adjustments)
     */
    platform: process.platform,
};
// Expose the API to the renderer process
electron_1.contextBridge.exposeInMainWorld('electronAPI', api);
//# sourceMappingURL=index.js.map