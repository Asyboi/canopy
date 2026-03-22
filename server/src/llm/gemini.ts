import { GoogleGenerativeAI } from '@google/generative-ai';
import { retry } from '../utils/retry';

let genAI: GoogleGenerativeAI | null = null;

function getClient(): GoogleGenerativeAI {
  if (!genAI) {
    genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
  }
  return genAI;
}

export async function labelFeature(
  fileList: string,
  importSummary: string
): Promise<string> {
  const model = getClient().getGenerativeModel({ model: 'gemini-2.0-flash' });

  const prompt = `You are analyzing a TypeScript codebase. Given the following list of files and their import relationships, assign a short human-readable feature name (2-4 words, title case) that describes what this group of files does together. Reply with only the feature name, nothing else.

Files: ${fileList}
Import relationships: ${importSummary}`;

  const result = await retry(async () => {
    const response = await model.generateContent(prompt);
    return response.response.text().trim();
  });

  return result;
}
