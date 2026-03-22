import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { Feature, Suggestion } from '../types';
import { detectPatterns, generateGreenSuggestion } from '../llm/claude';

const CHUNK_THRESHOLD = 16000;

function chunkCode(
  code: string,
  featureName: string
): string[] {
  if (code.length <= CHUNK_THRESHOLD) {
    return [code];
  }

  // Split on function boundaries
  const boundaries = [
    /^export /m,
    /^async function /m,
    /^function /m,
    /^const \w+ = /m,
  ];

  const lines = code.split('\n');
  const chunks: string[] = [];
  let currentChunk: string[] = [];
  let currentLength = 0;

  for (const line of lines) {
    const isBoundary = boundaries.some((re) => re.test(line));

    if (isBoundary && currentLength > 0 && currentLength + line.length > CHUNK_THRESHOLD) {
      chunks.push(currentChunk.join('\n'));
      currentChunk = [];
      currentLength = 0;
    }

    currentChunk.push(line);
    currentLength += line.length + 1;
  }

  if (currentChunk.length > 0) {
    chunks.push(currentChunk.join('\n'));
  }

  // Add chunk headers
  return chunks.map(
    (chunk, i) =>
      `// CHUNK ${i + 1} of ${chunks.length} for feature: ${featureName}\n${chunk}`
  );
}

const FEATURE_CONCURRENCY = 4;

async function processFeature(
  feature: Feature,
  workspacePath: string
): Promise<void> {
  // Concatenate all file contents
  let allCode = '';
  const fileContents = new Map<string, string>();

  for (const file of feature.files) {
    try {
      const absPath = path.join(workspacePath, file);
      const content = fs.readFileSync(absPath, 'utf-8');
      fileContents.set(file, content);
      allCode += `// FILE: ${file}\n${content}\n\n`;
    } catch {
      // Skip unreadable files
    }
  }

  if (!allCode.trim()) {
    feature.suggestions = [];
    return;
  }

  // Detect patterns across all chunks in parallel
  const chunks = chunkCode(allCode, feature.name);
  const chunkResults = await Promise.all(
    chunks.map(async (chunk) => {
      try {
        return await detectPatterns(chunk);
      } catch (err) {
        console.warn(
          `Pattern detection failed for chunk in feature ${feature.name}:`,
          err instanceof Error ? err.message : err
        );
        return [];
      }
    })
  );

  // Deduplicate patterns by location
  const allPatterns = new Map<string, import('../types').DetectedPattern>();
  for (const patterns of chunkResults) {
    for (const pattern of patterns) {
      if (!allPatterns.has(pattern.location)) {
        allPatterns.set(pattern.location, pattern);
      }
    }
  }

  // Generate suggestions for all patterns in parallel
  const suggestionResults = await Promise.all(
    Array.from(allPatterns.values()).map(async (pattern) => {
      let targetFile = feature.files[0];
      let targetContent = '';
      for (const [file, content] of fileContents.entries()) {
        if (content.includes(pattern.currentCode.slice(0, 50))) {
          targetFile = file;
          targetContent = content;
          break;
        }
      }
      if (!targetContent) {
        targetContent = fileContents.get(targetFile) || '';
      }

      const newContent = await generateGreenSuggestion(
        pattern.patternType,
        pattern.currentCode,
        targetContent
      );

      if (!newContent) return null;

      return {
        id: `suggestion_${uuidv4().replace(/-/g, '').slice(0, 12)}`,
        status: 'suggested' as const,
        patternType: pattern.patternType,
        location: pattern.location,
        explanation: pattern.explanation,
        estimatedSavingsPercent: pattern.estimatedSavingsPercent,
        currentCode: pattern.currentCode,
        suggestedFileChanges: [{ filePath: targetFile, newContent }],
      };
    })
  );

  feature.suggestions = suggestionResults.filter((s) => s !== null) as Suggestion[];
}

export async function detectAndSuggest(
  features: Feature[],
  workspacePath: string
): Promise<void> {
  // Process features with a concurrency limit to avoid overwhelming the Claude API
  const queue = [...features];
  const workers = Array.from({ length: FEATURE_CONCURRENCY }, async () => {
    while (queue.length > 0) {
      const feature = queue.shift()!;
      try {
        await processFeature(feature, workspacePath);
      } catch (err) {
        console.warn(
          `Pattern detection failed for feature ${feature.name}:`,
          err instanceof Error ? err.message : err
        );
        feature.suggestions = [];
      }
    }
  });
  await Promise.all(workers);
}
