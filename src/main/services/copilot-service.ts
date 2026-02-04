/**
 * Service for interacting with GitHub Copilot SDK
 * 
 * Uses the official @github/copilot-sdk to communicate with GitHub Copilot
 * via the Copilot CLI in server mode.
 * 
 * @see https://github.com/github/copilot-sdk
 * @see https://github.com/github/awesome-copilot/tree/main/cookbook/copilot-sdk/nodejs
 */
import { CopilotClient, CopilotSession } from '@github/copilot-sdk';
import { existsSync } from 'node:fs';

/**
 * Find the copilot CLI executable
 * macOS apps launched from Finder don't inherit shell PATH,
 * so we need to check common installation locations
 */
function findCopilotCli(): string | undefined {
  const commonPaths = [
    '/usr/local/bin/copilot',
    '/opt/homebrew/bin/copilot',
    `${process.env.HOME}/.local/bin/copilot`,
    `${process.env.HOME}/bin/copilot`,
    // npm global installs
    '/usr/local/lib/node_modules/@github/copilot-cli/bin/copilot',
    `${process.env.HOME}/.npm-global/bin/copilot`,
  ];

  for (const p of commonPaths) {
    if (existsSync(p)) {
      return p;
    }
  }

  // Fall back to just 'copilot' and hope it's in PATH
  return undefined;
}

export class CopilotService {
  private client: CopilotClient | null = null;
  private session: CopilotSession | null = null;
  private systemPrompt: string;

  constructor() {
    this.systemPrompt = `You are a friendly and knowledgeable Moss Wall AI Assistant. 
Your purpose is to help users with questions about live moss walls, including:
- Types of moss (sheet moss, mood moss, reindeer moss, fern moss, etc.)
- Ideal growing conditions (humidity, lighting, temperature)
- Watering and misting schedules
- Troubleshooting issues (browning, yellowing, drying out)
- DIY installation and frame building
- Maintenance and long-term care

Guidelines:
- Be helpful, practical, and plant-care focused
- Provide specific, actionable advice when possible
- Acknowledge when you're uncertain about something
- Recommend consulting with local nurseries or experts for serious issues
- Consider the user's specific environment and conditions

If provided with context from the local knowledge base, use it to inform your answers.
Always prioritize the health and longevity of the moss wall in your recommendations.`;
  }

  /**
   * Get or create a Copilot client and session
   */
  private async getSession(): Promise<CopilotSession> {
    try {
      if (!this.client) {
        const cliPath = findCopilotCli();
        console.log(`Copilot CLI path: ${cliPath ?? 'using PATH'}`);
        
        this.client = new CopilotClient({ 
          logLevel: 'warning',
          ...(cliPath ? { cliPath } : {}),
        });
      }

      if (!this.session) {
        this.session = await this.client.createSession({
          systemMessage: {
            content: this.systemPrompt,
          },
        });
      }

      return this.session;
    } catch (error) {
      console.error('Failed to create Copilot session:', error);
      
      // Provide helpful error messages
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (errorMessage.includes('ENOENT')) {
        throw new Error('Copilot CLI not found. Please install GitHub Copilot CLI and ensure "copilot" is in your PATH.');
      } else if (errorMessage.includes('ECONNREFUSED')) {
        throw new Error('Could not connect to Copilot CLI server. Please check your GitHub Copilot subscription.');
      }
      
      throw error;
    }
  }

  /**
   * Send a chat message and get a complete response
   */
  async chat(message: string, context?: string): Promise<string> {
    try {
      const session = await this.getSession();
      
      const prompt = context 
        ? `${context}\n\nUser question: ${message}`
        : message;

      const response = await session.sendAndWait({ prompt }, 60000);
      
      if (response?.data?.content) {
        return response.data.content;
      }
      
      return 'I apologize, but I was unable to generate a response. Please try again.';
    } catch (error) {
      console.error('Copilot chat error:', error);
      throw error;
    }
  }

  /**
   * Stream a chat response chunk by chunk
   */
  async streamChat(
    message: string,
    context: string,
    onChunk: (chunk: string, done: boolean) => void
  ): Promise<void> {
    try {
      const session = await this.getSession();

      const prompt = context 
        ? `${context}\n\nUser question: ${message}`
        : message;

      // Set up event listeners before sending
      const done = new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Response timeout'));
        }, 60000);
        
        const unsubscribe = session.on((event) => {
          if (event.type === 'assistant.message_delta') {
            const deltaContent = (event.data as { deltaContent?: string })?.deltaContent ?? '';
            onChunk(deltaContent, false);
          } else if (event.type === 'assistant.message') {
            const data = event.data as { content?: string };
            const content = data?.content ?? '';
            if (content && content.length > 0) {
              onChunk(content, false);
            }
          } else if (event.type === 'session.idle') {
            clearTimeout(timeout);
            unsubscribe();
            onChunk('', true);
            resolve();
          } else if (event.type === 'session.error') {
            const errorData = event.data as { message?: string };
            clearTimeout(timeout);
            unsubscribe();
            reject(new Error(errorData?.message ?? 'Session error'));
          }
        });
      });

      await session.send({ prompt });
      await done;
    } catch (error) {
      console.error('Copilot stream error:', error);
      throw error;
    }
  }

  /**
   * Cleanup resources
   */
  async dispose(): Promise<void> {
    try {
      if (this.session) {
        await this.session.destroy();
        this.session = null;
      }
      if (this.client) {
        await this.client.stop();
        this.client = null;
      }
    } catch (error) {
      console.error('Error during cleanup:', error);
    }
  }
}
