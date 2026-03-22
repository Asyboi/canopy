import path from 'path';
import { Feature, DependencyGraph } from '../types';
import { labelFeature } from '../llm/gemini';

function fallbackLabel(files: string[]): string {
  // Derive name from most common directory
  const dirCounts = new Map<string, number>();
  for (const file of files) {
    const dir = path.dirname(file).split(path.sep).pop() || '';
    if (dir && dir !== '.' && dir !== 'src') {
      dirCounts.set(dir, (dirCounts.get(dir) || 0) + 1);
    }
  }

  if (dirCounts.size === 0) {
    // Use the first file's name without extension
    const baseName = path.basename(files[0] || 'unknown', path.extname(files[0] || ''));
    return baseName.charAt(0).toUpperCase() + baseName.slice(1);
  }

  let bestDir = '';
  let bestCount = 0;
  for (const [dir, count] of dirCounts.entries()) {
    if (count > bestCount) {
      bestDir = dir;
      bestCount = count;
    }
  }

  return bestDir.charAt(0).toUpperCase() + bestDir.slice(1);
}

export async function labelFeatures(
  features: Feature[],
  depGraph: DependencyGraph
): Promise<void> {
  await Promise.all(
    features.map(async (feature) => {
      const fileList = feature.files.join('\n');
      const importSummary = feature.files
        .map((f) => {
          const deps = depGraph[f];
          return deps && deps.length > 0 ? `${f} → ${deps.join(', ')}` : null;
        })
        .filter(Boolean)
        .join('\n');

      try {
        feature.name = await labelFeature(fileList, importSummary || 'No imports');
      } catch (err) {
        console.warn(
          `Gemini labeling failed for feature ${feature.id}, using fallback:`,
          err instanceof Error ? err.message : err
        );
        feature.name = fallbackLabel(feature.files);
      }
    })
  );
}
