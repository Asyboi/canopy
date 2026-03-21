import fs from 'fs';
import path from 'path';
import ts from 'typescript';
import { Feature, DependencyGraph } from '../types';

function countLinesOfCode(filePath: string): number {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    return content.split('\n').length;
  } catch {
    return 0;
  }
}

function countCyclomaticComplexity(filePath: string): number {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const sourceFile = ts.createSourceFile(
      filePath,
      content,
      ts.ScriptTarget.Latest,
      true
    );

    let complexity = 0;

    function walk(node: ts.Node): void {
      switch (node.kind) {
        case ts.SyntaxKind.IfStatement:
        case ts.SyntaxKind.ForStatement:
        case ts.SyntaxKind.ForInStatement:
        case ts.SyntaxKind.ForOfStatement:
        case ts.SyntaxKind.WhileStatement:
        case ts.SyntaxKind.DoStatement:
        case ts.SyntaxKind.CaseClause:
        case ts.SyntaxKind.ConditionalExpression:
          complexity++;
          break;
        case ts.SyntaxKind.BinaryExpression: {
          const binExpr = node as ts.BinaryExpression;
          if (
            binExpr.operatorToken.kind ===
              ts.SyntaxKind.AmpersandAmpersandToken ||
            binExpr.operatorToken.kind === ts.SyntaxKind.BarBarToken
          ) {
            complexity++;
          }
          break;
        }
      }
      ts.forEachChild(node, walk);
    }

    walk(sourceFile);
    return complexity;
  } catch {
    return 0;
  }
}

function countExternalDeps(
  files: string[],
  depGraph: DependencyGraph
): number {
  const externalDeps = new Set<string>();
  for (const file of files) {
    const deps = depGraph[file] || [];
    for (const dep of deps) {
      // External deps don't start with . or / and aren't in the file list
      if (!dep.startsWith('.') && !dep.startsWith('/') && !files.includes(dep)) {
        // Extract package name (handle scoped packages)
        const parts = dep.split('/');
        const pkgName = dep.startsWith('@') ? `${parts[0]}/${parts[1]}` : parts[0];
        externalDeps.add(pkgName);
      }
    }
  }
  return externalDeps.size;
}

export function scoreComplexity(
  features: Feature[],
  depGraph: DependencyGraph,
  workspacePath: string
): void {
  // Compute raw metrics per feature
  for (const feature of features) {
    let totalLoc = 0;
    let totalCyclomatic = 0;

    for (const file of feature.files) {
      const absPath = path.join(workspacePath, file);
      totalLoc += countLinesOfCode(absPath);
      totalCyclomatic += countCyclomaticComplexity(absPath);
    }

    feature.metrics.loc = totalLoc;
    feature.metrics.cyclomaticComplexity = totalCyclomatic;
    feature.metrics.dependencyCount = countExternalDeps(feature.files, depGraph);
  }

  // Normalize to 0–1 scale
  const maxLoc = Math.max(1, ...features.map((f) => f.metrics.loc));
  const maxDeps = Math.max(1, ...features.map((f) => f.metrics.dependencyCount));
  const maxCyclomatic = Math.max(
    1,
    ...features.map((f) => f.metrics.cyclomaticComplexity)
  );

  for (const feature of features) {
    const normLoc = feature.metrics.loc / maxLoc;
    const normDeps = feature.metrics.dependencyCount / maxDeps;
    const normCyclomatic = feature.metrics.cyclomaticComplexity / maxCyclomatic;

    feature.metrics.complexityScore =
      normLoc * 0.3 + normDeps * 0.3 + normCyclomatic * 0.4;
  }
}
