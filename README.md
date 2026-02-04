# Moss Wall AI Assistant

An Electron-based desktop application powered by the GitHub Copilot SDK that serves as your intelligent moss wall knowledge assistant. Available for Windows and macOS.

## Overview

This application provides a conversational interface where users can ask questions about all things related to live moss walls—from moss types and care requirements to installation tips and troubleshooting. The AI agent combines structured knowledge stored in this repository with information from the web to deliver comprehensive, helpful answers.

## Tech Stack

- **Electron 28.x** — Cross-platform desktop application framework
- **TypeScript 5.x** — Primary language for all application code (strict mode)
- **GitHub Copilot SDK** (`@github/copilot-sdk`) — Official SDK for programmatic access to GitHub Copilot's agentic workflows via JSON-RPC
- **Vitest** — Unit and integration testing
- **Playwright** — End-to-end testing

### GitHub Copilot SDK

This application uses the [GitHub Copilot SDK](https://github.com/github/copilot-sdk) to power AI responses. The SDK communicates with the Copilot CLI in server mode, providing:

- **Streaming responses** — Real-time token-by-token output
- **Session management** — Persistent conversation context
- **Multiple models** — Access to GPT-4o, Claude, and other models
- **Custom system prompts** — Tailored moss wall assistant persona

**SDK Documentation:**
- [GitHub Copilot SDK](https://github.com/github/copilot-sdk) — Official SDK repository
- [Node.js/TypeScript SDK](https://github.com/github/copilot-sdk/tree/main/nodejs) — SDK documentation and API reference
- [SDK Cookbook](https://github.com/github/awesome-copilot/tree/main/cookbook/copilot-sdk/nodejs) — Practical recipes and examples

**Requirements:**
- GitHub Copilot CLI installed and in PATH (`copilot` command available)
- GitHub Copilot subscription (free tier available with limited usage)

## Features

- **Cross-Platform Desktop App** — Built with Electron for Windows and macOS
- **TypeScript Throughout** — Fully typed codebase for reliability and maintainability
- **GitHub Copilot SDK Integration** — Leverages advanced AI capabilities for natural conversation
- **Structured Knowledge Base** — Local repository of moss wall information the agent can reference
- **Web-Enhanced Responses** — Supplements local knowledge with up-to-date web information

## Project Structure

```
mosswall/
├── src/                    # Electron application source code
│   ├── main/               # Main process (Node.js)
│   ├── renderer/           # Renderer process (UI)
│   └── preload/            # Preload scripts
├── data/                   # Structured moss wall knowledge base
│   ├── models/             # Moss types and species specifications
│   ├── maintenance/        # Care guides and watering schedules
│   ├── tips/               # Growing conditions and best practices
│   ├── diy/                # Installation and frame building guides
│   └── glossary/           # Moss wall terminology definitions
├── AGENTS.md               # AI agent guidelines and configuration
├── README.md
└── LICENSE
```

## Knowledge Base

The `/data` directory contains structured information about moss walls in Markdown and YAML formats:

- **Markdown files** — Articles, guides, and descriptive content
- **YAML files** — Structured specifications, checklists, and metadata

This dual approach allows the AI agent to access both human-readable content and machine-parseable data for accurate responses.

## Getting Started

*Coming soon — Installation and development instructions will be added once the Electron app scaffolding is in place.*

### Prerequisites

- Node.js 18+
- npm or yarn
- TypeScript 5.x
- GitHub Copilot CLI installed and authenticated

### Installation

```bash
# Clone the repository
git clone https://github.com/sekka1/mosswall.git
cd mosswall

# Install dependencies
npm install

# Start the application
npm start
```

## Documentation

- [AGENTS.md](AGENTS.md) — Guidelines for how the AI agent uses the knowledge base and responds to queries
- [DEVELOPMENT.md](DEVELOPMENT.md) — Development best practices, testing strategies, and security guidelines

## FAQ

### How does the app use the knowledge in the `/data` directory?

When a user asks a question, the app follows this process:

1. **User asks a question** — The message is sent to the IPC handler in the main process
2. **Knowledge search** — `KnowledgeService.search()` searches all `.md` and `.yaml` files in `/data` for relevant content using keyword matching
3. **Context building** — The top 3 most relevant documents are combined into context for the AI
4. **Copilot query** — The user's question + local knowledge context is sent to GitHub Copilot
5. **Response** — Copilot generates an answer informed by both its training AND the local knowledge base

**Example:** If a user asks "How do I water my moss?", the app will:
- Find relevant documents like `data/maintenance/watering-moss-guide.md`
- Include that content as context for Copilot
- Return an answer that incorporates the specific watering schedules and tips from your knowledge base
- **Display source attribution** showing which documents were referenced

This means all species profiles, maintenance guides, and glossary terms in `/data` are actively used to provide accurate, project-specific answers.

### Does the app show where answers come from?

**Yes!** Every response includes source attribution in a collapsible "📚 Sources referenced" section. This shows:

- **Document title** — Clickable link (copies the file path to clipboard)
- **File path** — Location in the `/data` directory
- **Snippet** — Relevant excerpt that was used as context

This transparency helps users:
- Verify information accuracy
- Find more detailed information in the source documents
- Understand which knowledge base content is being used

---

## Contributing

Contributions are welcome! You can help by:

1. **Adding moss wall knowledge** — Submit Markdown or YAML files to the `/data` directory
2. **Improving the app** — Enhance the Electron application and AI integration
3. **Reporting issues** — File bugs or suggest features via GitHub Issues

Please review [DEVELOPMENT.md](DEVELOPMENT.md) for coding standards and [AGENTS.md](AGENTS.md) for knowledge base conventions.

### Pre-Commit Checklist

**Always run the following commands before committing and pushing to GitHub:**

```bash
# 1. Run linting to catch code style issues
npm run lint

# 2. Build the application to verify compilation
npm run build

# 3. Start the app to verify it runs correctly
npm start
```

All three steps must pass without errors before committing. This ensures:
- Code follows project style guidelines (ESLint)
- TypeScript compiles without errors
- The application launches and functions correctly

## Releases

Releases are automatically built and published when a version tag is pushed:

```bash
# Create and push a version tag
git tag v1.0.0
git push origin v1.0.0
```

The GitHub Actions workflow will:
1. Build the app for both macOS and Windows
2. Create installers (DMG/ZIP for macOS, EXE for Windows)
3. Attach the installers to a GitHub Release

## License

This project is licensed under the Apache License 2.0 — see the [LICENSE](LICENSE) file for details.