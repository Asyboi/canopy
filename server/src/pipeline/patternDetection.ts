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

export async function detectAndSuggest(
  features: Feature[],
  workspacePath: string
): Promise<void> {
  for (const feature of features) {
    try {
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
        continue;
      }

      // Chunk if needed and detect patterns
      const chunks = chunkCode(allCode, feature.name);
      const allPatterns = new Map<string, import('../types').DetectedPattern>();

      for (const chunk of chunks) {
        try {
          const patterns = await detectPatterns(chunk);
          for (const pattern of patterns) {
            if (!allPatterns.has(pattern.location)) {
              allPatterns.set(pattern.location, pattern);
            }
          }
        } catch (err) {
          console.warn(
            `Pattern detection failed for chunk in feature ${feature.name}:`,
            err instanceof Error ? err.message : err
          );
        }
      }

      // Generate green suggestions for each pattern
      const suggestions: Suggestion[] = [];

      for (const pattern of allPatterns.values()) {
        // Find which file contains this pattern
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

        if (newContent) {
          suggestions.push({
            id: `suggestion_${uuidv4().replace(/-/g, '').slice(0, 12)}`,
            status: 'suggested',
            patternType: pattern.patternType,
            location: pattern.location,
            explanation: pattern.explanation,
            estimatedSavingsPercent: pattern.estimatedSavingsPercent,
            currentCode: pattern.currentCode,
            suggestedFileChanges: [
              {
                filePath: targetFile,
                newContent,
              },
            ],
          });
        }
      }

      feature.suggestions = suggestions;
    } catch (err) {
      console.warn(
        `Pattern detection failed for feature ${feature.name}:`,
        err instanceof Error ? err.message : err
      );
      feature.suggestions = [];
    }
  }
}
