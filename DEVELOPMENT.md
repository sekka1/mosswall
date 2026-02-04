# Electron App Development Guidelines

This document provides best practices and testing guidelines for AI agents and contributors working on the Moss Wall AI Assistant Electron application.

## Architecture Overview

```
src/
├── main/               # Main process (Node.js environment)
│   ├── index.ts        # App entry point, window management
│   ├── ipc/            # IPC handlers for renderer communication
│   └── services/       # Backend services (Copilot SDK, file access)
├── renderer/           # Renderer process (Browser environment)
│   ├── index.html      # Main HTML entry
│   ├── components/     # UI components
│   ├── hooks/          # React/Vue hooks (if applicable)
│   └── styles/         # CSS/styling
├── preload/            # Preload scripts (Bridge between main/renderer)
│   └── index.ts        # Expose safe APIs to renderer
├── shared/             # Shared types and utilities
│   ├── types/          # TypeScript interfaces
│   └── constants/      # Shared constants
└── __tests__/          # Test files (mirrors src/ structure)
```

## Testing Strategy

### Test Types

| Type | Purpose | Tools | Location |
|------|---------|-------|----------|
| Unit Tests | Test isolated functions/modules | Vitest or Jest | `src/__tests__/unit/` |
| Integration Tests | Test IPC and service interactions | Vitest + mocks | `src/__tests__/integration/` |
| E2E Tests | Test full app workflows | Playwright | `e2e/` |
| Component Tests | Test UI components in isolation | Testing Library | `src/__tests__/components/` |

### Unit Testing

#### Main Process Tests

```typescript
// src/__tests__/unit/main/services/knowledge-service.test.ts
import { describe, it, expect, vi } from 'vitest';
import { KnowledgeService } from '@main/services/knowledge-service';

describe('KnowledgeService', () => {
  it('should load markdown files from data directory', async () => {
    const service = new KnowledgeService('/mock/data/path');
    const result = await service.loadDocument('models/sheet-moss.yaml');
    
    expect(result).toBeDefined();
    expect(result.content).toContain('Sheet Moss');
  });

  it('should return null for non-existent files', async () => {
    const service = new KnowledgeService('/mock/data/path');
    const result = await service.loadDocument('non-existent.md');
    
    expect(result).toBeNull();
  });
});
```

#### Renderer Process Tests

```typescript
// src/__tests__/unit/renderer/utils/message-formatter.test.ts
import { describe, it, expect } from 'vitest';
import { formatAgentResponse } from '@renderer/utils/message-formatter';

describe('formatAgentResponse', () => {
  it('should convert markdown to safe HTML', () => {
    const markdown = '**Bold** and _italic_';
    const result = formatAgentResponse(markdown);
    
    expect(result).toContain('<strong>Bold</strong>');
    expect(result).toContain('<em>italic</em>');
  });

  it('should sanitize potentially dangerous HTML', () => {
    const malicious = '<script>alert("xss")</script>';
    const result = formatAgentResponse(malicious);
    
    expect(result).not.toContain('<script>');
  });
});
```

#### Preload Script Tests

```typescript
// src/__tests__/unit/preload/api.test.ts
import { describe, it, expect, vi } from 'vitest';

// Mock electron before importing
vi.mock('electron', () => ({
  contextBridge: {
    exposeInMainWorld: vi.fn(),
  },
  ipcRenderer: {
    invoke: vi.fn(),
    on: vi.fn(),
  },
}));

import { api } from '@preload/index';

describe('Preload API', () => {
  it('should expose only allowed methods', () => {
    const exposedMethods = Object.keys(api);
    
    expect(exposedMethods).toContain('sendMessage');
    expect(exposedMethods).toContain('loadKnowledge');
    expect(exposedMethods).not.toContain('executeArbitrary');
  });
});
```

### Integration Testing

```typescript
// src/__tests__/integration/ipc-handlers.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ipcMain } from 'electron';
import { setupIpcHandlers } from '@main/ipc/handlers';

describe('IPC Handlers', () => {
  beforeEach(() => {
    setupIpcHandlers();
  });

  it('should handle chat:sendMessage and return response', async () => {
    const mockEvent = { sender: { id: 1 } };
    const message = { content: 'What is sheet moss?' };
    
    // Simulate IPC call
    const handler = ipcMain._handlers.get('chat:sendMessage');
    const response = await handler(mockEvent, message);
    
    expect(response).toHaveProperty('content');
    expect(response).toHaveProperty('sources');
  });
});
```

### End-to-End Testing with Playwright

```typescript
// e2e/chat-flow.spec.ts
import { test, expect, _electron as electron } from '@playwright/test';

test.describe('Chat Flow', () => {
  let app;
  let window;

  test.beforeAll(async () => {
    app = await electron.launch({ args: ['.'] });
    window = await app.firstWindow();
  });

  test.afterAll(async () => {
    await app.close();
  });

  test('should send a message and receive a response', async () => {
    const input = window.locator('[data-testid="chat-input"]');
    const sendButton = window.locator('[data-testid="send-button"]');
    
    await input.fill('Tell me about watering moss walls');
    await sendButton.click();
    
    // Wait for response
    const response = window.locator('[data-testid="assistant-message"]').last();
    await expect(response).toBeVisible({ timeout: 30000 });
    await expect(response).toContainText(/water|mist|humidity/i);
  });

  test('should display source references when available', async () => {
    const input = window.locator('[data-testid="chat-input"]');
    await input.fill('What are the ideal conditions for sheet moss?');
    await input.press('Enter');
    
    const sources = window.locator('[data-testid="source-reference"]');
    await expect(sources.first()).toBeVisible({ timeout: 30000 });
  });
});
```

### Running Tests

```bash
# Run all unit tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run E2E tests
npm run test:e2e

# Run E2E tests with UI
npm run test:e2e:ui
```

## Best Practices for AI Agents

### Code Organization

1. **Separation of Concerns**
   - Main process: Window management, system APIs, IPC handlers
   - Renderer process: UI only, no direct Node.js or Electron APIs
   - Preload: Minimal bridge, expose only what's needed

2. **Type Safety**
   ```typescript
   // shared/types/ipc.ts
   export interface ChatMessage {
     id: string;
     role: 'user' | 'assistant';
     content: string;
     timestamp: Date;
     sources?: DataSource[];
   }

   export interface DataSource {
     path: string;
     title: string;
     relevance: number;
   }
   ```

3. **Consistent File Naming**
   - Use kebab-case for files: `knowledge-service.ts`
   - Use PascalCase for components: `ChatWindow.tsx`
   - Suffix test files with `.test.ts` or `.spec.ts`

### Security Requirements

Electron apps have significant security implications. Always follow these practices:

1. **Context Isolation (Required)**
   ```typescript
   // main/index.ts
   const mainWindow = new BrowserWindow({
     webPreferences: {
       contextIsolation: true,      // Always true
       nodeIntegration: false,      // Always false
       preload: path.join(__dirname, 'preload.js'),
     },
   });
   ```

2. **Validate IPC Inputs**
   ```typescript
   // main/ipc/handlers.ts
   ipcMain.handle('chat:sendMessage', async (event, message) => {
     // Always validate input
     if (typeof message?.content !== 'string') {
       throw new Error('Invalid message format');
     }
     if (message.content.length > 10000) {
       throw new Error('Message too long');
     }
     // Process message...
   });
   ```

3. **Sanitize Rendered Content**
   ```typescript
   // Never use dangerouslySetInnerHTML with unsanitized content
   import DOMPurify from 'dompurify';
   
   const SafeMarkdown = ({ content }) => {
     const sanitized = DOMPurify.sanitize(marked(content));
     return <div dangerouslySetInnerHTML={{ __html: sanitized }} />;
   };
   ```

4. **Limit Preload API Surface**
   ```typescript
   // preload/index.ts - Only expose what's necessary
   contextBridge.exposeInMainWorld('api', {
     // Good: Specific, limited methods
     sendChatMessage: (content: string) => ipcRenderer.invoke('chat:send', content),
     getKnowledgeTopics: () => ipcRenderer.invoke('knowledge:topics'),
     
     // Bad: Never expose raw IPC or broad access
     // ipcRenderer: ipcRenderer,  // NEVER DO THIS
     // invoke: ipcRenderer.invoke, // NEVER DO THIS
   });
   ```

### Performance Guidelines

1. **Lazy Load Heavy Modules**
   ```typescript
   // Load Copilot SDK only when needed
   let copilotClient: CopilotClient | null = null;
   
   async function getCopilotClient() {
     if (!copilotClient) {
       const { CopilotClient } = await import('@github/copilot-sdk');
       copilotClient = new CopilotClient(config);
     }
     return copilotClient;
   }
   ```

2. **Debounce User Input**
   ```typescript
   // Avoid excessive API calls while typing
   const debouncedSearch = useMemo(
     () => debounce((query: string) => searchKnowledge(query), 300),
     []
   );
   ```

3. **Stream Long Responses**
   ```typescript
   // Stream AI responses for better UX
   ipcMain.handle('chat:sendMessage', async (event, message) => {
     const stream = await copilot.streamResponse(message);
     
     for await (const chunk of stream) {
       event.sender.send('chat:chunk', chunk);
     }
     
     return { complete: true };
   });
   ```

### Error Handling

1. **Graceful Degradation**
   ```typescript
   async function getAIResponse(message: string): Promise<Response> {
     try {
       return await copilot.chat(message);
     } catch (error) {
       if (error.code === 'NETWORK_ERROR') {
         // Fall back to local knowledge only
         return await searchLocalKnowledge(message);
       }
       throw error;
     }
   }
   ```

2. **User-Friendly Error Messages**
   ```typescript
   // Map technical errors to user-friendly messages
   const errorMessages: Record<string, string> = {
     'NETWORK_ERROR': 'Unable to connect. Please check your internet connection.',
     'RATE_LIMITED': 'Too many requests. Please wait a moment and try again.',
     'AUTH_FAILED': 'Authentication failed. Please sign in again.',
   };
   ```

### Testing Checklist for AI Agents

Before submitting code, ensure:

- [ ] All new functions have corresponding unit tests
- [ ] IPC handlers validate all inputs
- [ ] No `nodeIntegration: true` or `contextIsolation: false`
- [ ] Preload scripts expose minimal, specific APIs
- [ ] User-facing strings are ready for localization
- [ ] Error states are handled gracefully
- [ ] Loading states are implemented for async operations
- [ ] TypeScript strict mode passes without errors
- [ ] No `any` types without explicit justification

### Recommended Dependencies

```json
{
  "devDependencies": {
    "vitest": "^1.0.0",
    "@testing-library/react": "^14.0.0",
    "@playwright/test": "^1.40.0",
    "electron-builder": "^24.0.0",
    "@types/node": "^20.0.0",
    "typescript": "^5.0.0"
  },
  "dependencies": {
    "electron": "^28.0.0",
    "dompurify": "^3.0.0",
    "marked": "^11.0.0"
  }
}
```

## Continuous Integration

```yaml
# .github/workflows/test.yml
name: Test

on: [push, pull_request]

jobs:
  test:
    runs-on: ${{ matrix.os }}
    strategy:
      matrix:
        os: [macos-latest, windows-latest]
        node: [18, 20]

    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node }}
      
      - run: npm ci
      - run: npm run lint
      - run: npm test
      
      - name: E2E Tests
        run: npm run test:e2e
```

## Resources

- [Electron Security Checklist](https://www.electronjs.org/docs/latest/tutorial/security)
- [Electron Testing Guide](https://www.electronjs.org/docs/latest/tutorial/automated-testing)
- [Playwright Electron Testing](https://playwright.dev/docs/api/class-electron)
- [Vitest Documentation](https://vitest.dev/)
- [GitHub Copilot SDK](https://github.com/features/copilot)
