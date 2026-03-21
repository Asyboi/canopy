import Anthropic from '@anthropic-ai/sdk';
import { retry } from '../utils/retry';
import { DetectedPattern } from '../types';

let client: Anthropic | null = null;

function getClient(): Anthropic {
  if (!client) {
    client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });
  }
  return client;
}

export async function detectPatterns(code: string): Promise<DetectedPattern[]> {
  const prompt = `You are a code sustainability analyzer. Analyze the following TypeScript/JavaScript code and identify if it contains any of these three inefficiency patterns:

1. POLLING: setInterval or setTimeout used to repeatedly call an API, database, or endpoint on a timer
2. N_PLUS_ONE: a loop that contains a database query or API call inside it (fetching N records then querying once per record)
3. SYNC_BLOCKING: use of synchronous fs methods (fs.readFileSync, fs.writeFileSync), synchronous HTTP calls, or any .sync() methods that block the event loop

For each pattern found, respond with a JSON array:
[
  {
    "patternType": "POLLING" | "N_PLUS_ONE" | "SYNC_BLOCKING",
    "location": "brief description of where in the code (function name or file)",
    "currentCode": "the relevant code snippet (max 20 lines)",
    "explanation": "one sentence explaining why this is inefficient",
    "estimatedSavingsPercent": number between 10 and 80
  }
]

If no patterns are found, return an empty array []. Return only valid JSON, no other text.

Code:
${code}`;

  const result = await retry(async () => {
    const response = await getClient().messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 4096,
      messages: [{ role: 'user', content: prompt }],
    });

    const text =
      response.content[0].type === 'text' ? response.content[0].text : '';
    // Strip markdown code fences if present (e.g. ```json ... ```)
    const stripped = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '').trim();
    return JSON.parse(stripped) as DetectedPattern[];
  });

  return result;
}

export async function generateGreenSuggestion(
  patternType: string,
  currentCode: string,
  fileContent: string
): Promise<string | null> {
  const prompt = `You are a code sustainability expert. Replace the following inefficient ${patternType} pattern with a greener, more efficient alternative.

Current code:
${currentCode}

Full file context:
${fileContent}

Requirements:
- The replacement must be semantically equivalent (same inputs, outputs, and behavior)
- Match the existing code style (indentation, naming conventions, imports)
- Add a brief comment explaining why the new implementation is more efficient
- For POLLING: replace with WebSocket, server-sent events, or a webhook pattern
- For N_PLUS_ONE: replace with a batched query using Promise.all, JOIN, WHERE IN, or DataLoader
- For SYNC_BLOCKING: replace with the async equivalent (fs.promises, async/await)

Return only the complete updated file content, nothing else.`;

  try {
    const result = await retry(async () => {
      const response = await getClient().messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 8192,
        messages: [{ role: 'user', content: prompt }],
      });

      const text =
        response.content[0].type === 'text' ? response.content[0].text : '';
      // Strip markdown code fences if present (e.g. ```typescript ... ```)
      return text.replace(/^```(?:\w+)?\s*/i, '').replace(/\s*```\s*$/, '').trim();
    });

    // Validate: result should look like source code, not prose
    if (
      result &&
      !result.startsWith('I ') &&
      !result.startsWith('Here ') &&
      !result.startsWith('The ')
    ) {
      return result;
    }
    return null;
  } catch {
    return null;
  }
}
