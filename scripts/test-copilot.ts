#!/usr/bin/env npx tsx
/**
 * Test script for GitHub Copilot SDK integration
 * 
 * Run with: npx tsx scripts/test-copilot.ts
 */

import { CopilotClient, CopilotSession } from '@github/copilot-sdk';

const TEST_QUESTION = 'What is a moss wall?';

async function log(message: string, data?: unknown): Promise<void> {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${message}`);
  if (data !== undefined) {
    console.log(JSON.stringify(data, null, 2));
  }
}

async function logError(message: string, error: unknown): Promise<void> {
  const timestamp = new Date().toISOString();
  console.error(`[${timestamp}] ERROR: ${message}`);
  if (error instanceof Error) {
    console.error(`  Name: ${error.name}`);
    console.error(`  Message: ${error.message}`);
    console.error(`  Stack: ${error.stack}`);
    if ('cause' in error) {
      console.error(`  Cause:`, error.cause);
    }
  } else {
    console.error(`  Error:`, error);
  }
}

async function testCopilotSDK(): Promise<void> {
  console.log('='.repeat(60));
  console.log('GitHub Copilot SDK Test');
  console.log('='.repeat(60));
  console.log(`Test question: "${TEST_QUESTION}"`);
  console.log('');

  let client: CopilotClient | null = null;
  let session: CopilotSession | null = null;

  try {
    // Step 1: Create client
    await log('Step 1: Creating CopilotClient...');
    client = new CopilotClient({ logLevel: 'debug' });
    await log('CopilotClient created successfully');

    // Step 2: Create session
    await log('Step 2: Creating session...');
    session = await client.createSession({
      systemMessage: {
        content: 'You are a helpful assistant that answers questions about moss walls.',
      },
    });
    await log('Session created', { sessionId: session.sessionId });

    // Step 3: Send message and wait for response
    await log('Step 3: Sending message with sendAndWait...');
    const response = await session.sendAndWait(
      { prompt: TEST_QUESTION },
      30000 // 30 second timeout
    );
    
    await log('Response received', {
      hasResponse: !!response,
      hasData: !!response?.data,
      hasContent: !!response?.data?.content,
      contentLength: response?.data?.content?.length,
    });

    if (response?.data?.content) {
      console.log('');
      console.log('='.repeat(60));
      console.log('RESPONSE:');
      console.log('='.repeat(60));
      console.log(response.data.content);
      console.log('='.repeat(60));
    } else {
      await log('No content in response', response);
    }

  } catch (error) {
    await logError('Test failed', error);
    process.exitCode = 1;
  } finally {
    // Cleanup
    await log('Cleaning up...');
    try {
      if (session) {
        await session.destroy();
        await log('Session destroyed');
      }
      if (client) {
        await client.stop();
        await log('Client stopped');
      }
    } catch (cleanupError) {
      await logError('Cleanup error', cleanupError);
    }
  }

  console.log('');
  console.log('Test complete.');
}

// Run the test
testCopilotSDK();
