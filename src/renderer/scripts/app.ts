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

class AssistantApp {
  private messagesContainer: HTMLElement;
  private chatForm: HTMLFormElement;
  private messageInput: HTMLTextAreaElement;
  private sendButton: HTMLButtonElement;
  private isStreaming = false;
  private currentStreamingMessage: HTMLElement | null = null;
  private unsubscribeStream: (() => void) | null = null;

  constructor() {
    // Get DOM elements
    this.messagesContainer = document.getElementById('messages')!;
    this.chatForm = document.getElementById('chatForm') as HTMLFormElement;
    this.messageInput = document.getElementById('messageInput') as HTMLTextAreaElement;
    this.sendButton = document.getElementById('sendButton') as HTMLButtonElement;

    // Initialize
    this.setupEventListeners();
    this.setupStreamListener();
    this.autoResizeTextarea();
  }

  private setupEventListeners(): void {
    // Form submission
    this.chatForm.addEventListener('submit', (e) => {
      e.preventDefault();
      this.handleSubmit();
    });

    // Enter to send, Shift+Enter for new line
    this.messageInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        this.handleSubmit();
      }
    });

    // Auto-resize textarea
    this.messageInput.addEventListener('input', () => {
      this.autoResizeTextarea();
    });
  }

  private setupStreamListener(): void {
    // Listen for streaming chunks from the main process
    this.unsubscribeStream = window.electronAPI.onStreamChunk((chunk: StreamChunk) => {
      if (this.currentStreamingMessage) {
        const textElement = this.currentStreamingMessage.querySelector('.message-text');
        if (textElement) {
          if (chunk.error) {
            // Error occurred - show error message
            this.removeTypingIndicator(this.currentStreamingMessage);
            textElement.innerHTML = this.formatMarkdown(
              `❌ Error: ${chunk.error}\n\n` +
              `**Troubleshooting:**\n` +
              `- Ensure GitHub Copilot CLI is installed (\`copilot\` command)\n` +
              `- Check that you have an active GitHub Copilot subscription\n` +
              `- Try running \`copilot auth login\` in your terminal`
            );
            this.currentStreamingMessage.classList.add('error');
            this.isStreaming = false;
            this.currentStreamingMessage = null;
            this.enableInput();
          } else if (chunk.done) {
            // Streaming complete - format the final content
            const content = textElement.textContent ?? '';
            textElement.innerHTML = this.formatMarkdown(content);
            this.removeTypingIndicator(this.currentStreamingMessage);
            this.isStreaming = false;
            this.currentStreamingMessage = null;
            this.enableInput();
          } else {
            // Append chunk
            textElement.textContent += chunk.content;
            this.scrollToBottom();
          }
        }
      }
    });
  }

  private async handleSubmit(): Promise<void> {
    const content = this.messageInput.value.trim();
    
    if (!content || this.isStreaming) return;

    // Clear input
    this.messageInput.value = '';
    this.autoResizeTextarea();
    this.disableInput();

    // Add user message
    this.addMessage({
      id: this.generateId(),
      role: 'user',
      content,
      timestamp: new Date(),
    });

    // Create assistant message placeholder for streaming
    const assistantMessage = this.createMessageElement({
      id: this.generateId(),
      role: 'assistant',
      content: '',
      timestamp: new Date(),
    });
    
    // Add typing indicator
    this.addTypingIndicator(assistantMessage);
    this.messagesContainer.appendChild(assistantMessage);
    this.currentStreamingMessage = assistantMessage;
    this.scrollToBottom();

    try {
      this.isStreaming = true;
      
      // Use streaming API
      await window.electronAPI.streamMessage(content);
      
    } catch (error) {
      console.error('Error sending message:', error);
      
      // Show error message
      this.removeTypingIndicator(assistantMessage);
      const textElement = assistantMessage.querySelector('.message-text');
      if (textElement) {
        textElement.innerHTML = this.formatMarkdown(
          '❌ Sorry, I encountered an error processing your request. Please try again.'
        );
      }
      assistantMessage.classList.add('error');
      
      this.isStreaming = false;
      this.currentStreamingMessage = null;
      this.enableInput();
    }
  }

  private addMessage(message: ChatMessage): void {
    const messageElement = this.createMessageElement(message);
    this.messagesContainer.appendChild(messageElement);
    this.scrollToBottom();
  }

  private createMessageElement(message: ChatMessage): HTMLElement {
    const div = document.createElement('div');
    div.className = `message ${message.role}`;
    div.dataset.messageId = message.id;

    const avatar = document.createElement('div');
    avatar.className = 'message-avatar';
    avatar.textContent = message.role === 'user' ? '👤' : '🤖';

    const content = document.createElement('div');
    content.className = 'message-content';

    const text = document.createElement('div');
    text.className = 'message-text';
    text.innerHTML = message.content ? this.formatMarkdown(message.content) : '';

    content.appendChild(text);

    // Add sources if available
    if (message.sources && message.sources.length > 0) {
      const sources = this.createSourcesElement(message.sources);
      content.appendChild(sources);
    }

    div.appendChild(avatar);
    div.appendChild(content);

    return div;
  }

  private createSourcesElement(sources: ChatMessage['sources']): HTMLElement {
    const details = document.createElement('details');
    details.className = 'message-sources';

    const summary = document.createElement('summary');
    summary.textContent = `📚 ${sources!.length} source${sources!.length > 1 ? 's' : ''} referenced`;
    details.appendChild(summary);

    const list = document.createElement('ul');
    for (const source of sources!) {
      const item = document.createElement('li');
      item.textContent = `${source.title} (${source.path})`;
      list.appendChild(item);
    }
    details.appendChild(list);

    return details;
  }

  private addTypingIndicator(messageElement: HTMLElement): void {
    const content = messageElement.querySelector('.message-content');
    if (content) {
      const indicator = document.createElement('div');
      indicator.className = 'typing-indicator';
      indicator.innerHTML = '<span></span><span></span><span></span>';
      content.appendChild(indicator);
    }
  }

  private removeTypingIndicator(messageElement: HTMLElement): void {
    const indicator = messageElement.querySelector('.typing-indicator');
    if (indicator) {
      indicator.remove();
    }
  }

  private formatMarkdown(text: string): string {
    // Simple markdown formatting
    // In production, use a proper library like marked + DOMPurify
    
    let html = this.escapeHtml(text);
    
    // Bold
    html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    
    // Italic
    html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
    html = html.replace(/_(.+?)_/g, '<em>$1</em>');
    
    // Code blocks
    html = html.replace(/```(\w*)\n([\s\S]*?)```/g, '<pre><code>$2</code></pre>');
    
    // Inline code
    html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
    
    // Headers
    html = html.replace(/^### (.+)$/gm, '<h4>$1</h4>');
    html = html.replace(/^## (.+)$/gm, '<h3>$1</h3>');
    html = html.replace(/^# (.+)$/gm, '<h2>$1</h2>');
    
    // Lists
    html = html.replace(/^- (.+)$/gm, '<li>$1</li>');
    html = html.replace(/^(\d+)\. (.+)$/gm, '<li>$2</li>');
    html = html.replace(/(<li>.*<\/li>\n?)+/g, '<ul>$&</ul>');
    
    // Paragraphs (double newlines)
    html = html.replace(/\n\n/g, '</p><p>');
    html = '<p>' + html + '</p>';
    
    // Clean up empty paragraphs
    html = html.replace(/<p><\/p>/g, '');
    html = html.replace(/<p>(<h[234]>)/g, '$1');
    html = html.replace(/(<\/h[234]>)<\/p>/g, '$1');
    html = html.replace(/<p>(<ul>)/g, '$1');
    html = html.replace(/(<\/ul>)<\/p>/g, '$1');
    html = html.replace(/<p>(<pre>)/g, '$1');
    html = html.replace(/(<\/pre>)<\/p>/g, '$1');

    return html;
  }

  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  private scrollToBottom(): void {
    const container = document.getElementById('chatContainer');
    if (container) {
      container.scrollTop = container.scrollHeight;
    }
  }

  private autoResizeTextarea(): void {
    this.messageInput.style.height = 'auto';
    this.messageInput.style.height = Math.min(this.messageInput.scrollHeight, 150) + 'px';
  }

  private disableInput(): void {
    this.messageInput.disabled = true;
    this.sendButton.disabled = true;
  }

  private enableInput(): void {
    this.messageInput.disabled = false;
    this.sendButton.disabled = false;
    this.messageInput.focus();
  }

  private generateId(): string {
    return `msg_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  }

  // Cleanup
  destroy(): void {
    if (this.unsubscribeStream) {
      this.unsubscribeStream();
    }
  }
}

// Initialize the app
document.addEventListener('DOMContentLoaded', () => {
  new AssistantApp();
});
