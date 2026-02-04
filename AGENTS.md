# Moss Wall AI Agent Guidelines

This document defines how AI agents should interact with this repository and respond to user queries about live moss walls.

## Technology Stack

This Electron application is built with:

- **TypeScript 5.x** — All application code (main process, renderer, preload scripts) with strict mode
- **Electron 28.x** — Cross-platform desktop framework
- **GitHub Copilot SDK** (`@github/copilot-sdk`) — Official SDK for AI agent integration
- **Vitest** — Unit and integration testing
- **Playwright** — End-to-end testing

### GitHub Copilot SDK Integration

The app uses the [GitHub Copilot SDK](https://github.com/github/copilot-sdk) to process user questions. Key implementation details:

```typescript
import { CopilotClient, CopilotSession } from '@github/copilot-sdk';

// Create client and start the CLI server
const client = new CopilotClient();
await client.start();

// Create a session with custom system message
const session = await client.createSession({
  model: 'gpt-4o',
  systemMessage: { content: 'You are a Moss Wall AI Assistant...' },
});

// Stream responses
session.on('assistant.message_delta', (event) => {
  process.stdout.write(event.data.deltaContent);
});

await session.send({ prompt: userQuestion });
```

**Requirements:**
- GitHub Copilot CLI installed (`copilot` in PATH)
- GitHub Copilot subscription or BYOK configuration

When contributing code to this repository, use TypeScript with strict mode enabled. Follow the conventions in `.github/instructions/` for TypeScript and Copilot SDK usage.

### Pre-Commit Workflow (REQUIRED)

**Before committing and pushing any code changes to GitHub, always run:**

```bash
# 1. Lint - Check for code style issues
npm run lint

# 2. Build - Verify TypeScript compiles
npm run build

# 3. Run - Test that the app starts correctly
npm start
```

All three commands must complete successfully before committing. This is mandatory for all code contributions to ensure:
- ESLint rules are satisfied
- TypeScript strict mode compilation passes
- The Electron app launches without runtime errors

**AI agents must verify these steps pass when making code changes.**

## Agent Purpose

The Moss Wall AI Assistant is designed to:

- Answer questions about moss types, species, and their characteristics
- Provide care guidance including watering, misting, and humidity management
- Offer advice on ideal growing conditions (lighting, temperature, humidity)
- Explain DIY installation, frame building, and substrate selection
- Help users troubleshoot common issues (browning, yellowing, drying out, pests)
- Guide users in maintaining healthy, thriving moss walls

## Knowledge Sources

### Primary: Local Knowledge Base (`/data`)

The agent should prioritize information from the structured knowledge base in this repository:

| Directory | Content Type | Format |
|-----------|--------------|--------|
| `/data/models/` | Moss species and type specifications | YAML, Markdown |
| `/data/maintenance/` | Care guides, watering schedules, troubleshooting | Markdown |
| `/data/tips/` | Growing conditions, placement advice, best practices | Markdown |
| `/data/diy/` | Installation guides, frame building, substrate info | Markdown |
| `/data/glossary/` | Moss wall terminology definitions | YAML |

### Secondary: Web Sources

When local knowledge is insufficient, the agent may supplement responses with web information. Always:

- Clearly indicate when information comes from external sources
- Prefer authoritative sources (botanical gardens, university extensions, established moss experts)
- Note if information may vary by climate or moss species

## Response Guidelines

### Tone and Style

- **Friendly and helpful** — Approach users as fellow plant enthusiasts
- **Practical and actionable** — Provide specific, usable advice
- **Environment-conscious** — Consider the user's specific conditions (indoor/outdoor, humidity levels)
- **Honest about limitations** — Acknowledge when information is uncertain or unavailable

### Structure

1. **Direct answer first** — Lead with the most relevant information
2. **Supporting details** — Provide context, care instructions, or steps as needed
3. **Sources** — Reference specific files from `/data` when applicable
4. **Related topics** — Suggest related questions the user might find helpful

### Example Response Pattern

```
[Direct answer to the question]

[Supporting details, care instructions, or step-by-step guidance]

📁 Source: /data/maintenance/watering-guide.md

You might also want to know about:
- Humidity requirements for different moss types
- Signs of overwatering vs underwatering
```

## Knowledge Base Conventions

### File Naming

- Use lowercase with hyphens: `sheet-moss-specs.yaml`
- Be descriptive: `troubleshooting-brown-patches.md` not `brown.md`
- Include moss types when specific: `reindeer-moss-care.md`

### Markdown Files

```markdown
# Title

Brief description of what this document covers.

## Overview
[General introduction]

## Details
[Specific information, steps, or specifications]

## Related Topics
- Links to related documents in the knowledge base

---
Last updated: YYYY-MM-DD
Tags: [relevant, tags, here]
```

### YAML Files (Specifications)

```yaml
# Moss species or component specification
name: "Moss Type Name"
scientific_name: "Scientific Name"
category: "Category"

characteristics:
  key: value

ideal_conditions:
  - Condition 1
  - Condition 2

notes: |
  Additional context or considerations.

metadata:
  last_updated: "YYYY-MM-DD"
  sources:
    - "Source 1"
    - "Source 2"
```

## Topics to Cover

The knowledge base should eventually include information on:

### Moss Types
- [ ] Sheet moss (Hypnum)
- [ ] Mood moss (Dicranum)
- [ ] Reindeer moss (Cladonia rangiferina)
- [ ] Fern moss (Thuidium)
- [ ] Cushion moss (Leucobryum)
- [ ] Preserved vs live moss comparison

### Growing Conditions
- [ ] Humidity requirements (40-60% ideal range)
- [ ] Lighting needs (indirect light, no direct sun)
- [ ] Temperature ranges
- [ ] Air circulation considerations

### Care & Maintenance
- [ ] Watering and misting schedules
- [ ] Seasonal care adjustments
- [ ] Cleaning and grooming
- [ ] Pest prevention and treatment

### Installation
- [ ] Frame and backing materials
- [ ] Substrate options (sphagnum, soil, mesh)
- [ ] Mounting techniques
- [ ] Indoor vs outdoor installations

### Troubleshooting
- [ ] Brown or dying patches
- [ ] Yellowing moss
- [ ] Mold and fungal issues
- [ ] Pest identification and treatment

## Agent Limitations

The agent should **not**:

- Guarantee specific growth outcomes (conditions vary by environment)
- Recommend pesticides without suggesting consulting local experts
- Provide advice on foraging wild moss without sustainability considerations
- Diagnose plant diseases with certainty (recommend expert consultation for serious issues)

## Updating This Document

As the project evolves, update this document to reflect:

- New knowledge categories added to `/data`
- Refined response guidelines based on user feedback
- Additional agent capabilities or integrations
