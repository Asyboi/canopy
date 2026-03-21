import fs from 'fs';
import path from 'path';
import simpleGit from 'simple-git';
import { CoChangeCluster } from '../types';

export async function runGitClustering(workspacePath: string): Promise<CoChangeCluster[]> {
  const gitDir = path.join(workspacePath, '.git');
  if (!fs.existsSync(gitDir)) {
    console.log('No git history found — skipping co-change analysis');
    return [];
  }

  const git = simpleGit(workspacePath);
  const log = await git.log(['--name-only', '--pretty=format:""']);

  // Parse commits: each commit's changed files are grouped between blank lines
  const commits: string[][] = [];
  let currentFiles: string[] = [];

  for (const line of log.all.flatMap((entry) => {
    const parts: string[] = [];
    if (entry.diff?.files) {
      for (const f of entry.diff.files) {
        parts.push(f.file);
      }
    }
    return parts;
  })) {
    currentFiles.push(line);
  }

  // Fallback: parse raw log output
  if (currentFiles.length === 0) {
    try {
      const rawLog = await git.raw(['log', '--name-only', '--pretty=format:']);
      const lines = rawLog.split('\n');
      let batch: string[] = [];
      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed === '') {
          if (batch.length > 0) {
            commits.push(batch);
            batch = [];
          }
        } else {
          batch.push(trimmed);
        }
      }
      if (batch.length > 0) {
        commits.push(batch);
      }
    } catch {
      return [];
    }
  } else {
    commits.push(currentFiles);
  }

  if (commits.length === 0) return [];

  // Build co-change frequency matrix
  const fileCommitCount = new Map<string, number>();
  const pairCount = new Map<string, number>();

  for (const files of commits) {
    for (const file of files) {
      fileCommitCount.set(file, (fileCommitCount.get(file) || 0) + 1);
    }
    // Count pairs
    for (let i = 0; i < files.length; i++) {
      for (let j = i + 1; j < files.length; j++) {
        const key = [files[i], files[j]].sort().join('::');
        pairCount.set(key, (pairCount.get(key) || 0) + 1);
      }
    }
  }

  // Build clusters: files that co-change in more than 30% of their commits
  const related = new Map<string, Set<string>>();
  const threshold = 0.3;

  for (const [key, count] of pairCount.entries()) {
    const [fileA, fileB] = key.split('::');
    const minCommits = Math.min(
      fileCommitCount.get(fileA) || 1,
      fileCommitCount.get(fileB) || 1
    );
    if (count / minCommits >= threshold) {
      if (!related.has(fileA)) related.set(fileA, new Set());
      if (!related.has(fileB)) related.set(fileB, new Set());
      related.get(fileA)!.add(fileB);
      related.get(fileB)!.add(fileA);
    }
  }

  // Build connected components from related pairs
  const visited = new Set<string>();
  const clusters: CoChangeCluster[] = [];

  for (const file of related.keys()) {
    if (visited.has(file)) continue;
    const cluster: string[] = [];
    const stack = [file];
    while (stack.length > 0) {
      const current = stack.pop()!;
      if (visited.has(current)) continue;
      visited.add(current);
      cluster.push(current);
      const neighbors = related.get(current);
      if (neighbors) {
        for (const neighbor of neighbors) {
          if (!visited.has(neighbor)) {
            stack.push(neighbor);
          }
        }
      }
    }
    if (cluster.length > 1) {
      clusters.push({ files: cluster, strength: 1 });
    }
  }

  return clusters;
}
