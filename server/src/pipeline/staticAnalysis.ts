import madge from 'madge';
import { DependencyGraph } from '../types';

export async function runStaticAnalysis(workspacePath: string): Promise<DependencyGraph> {
  const result = await madge(workspacePath, {
    fileExtensions: ['ts', 'tsx', 'js', 'jsx'],
    excludeRegExp: [/node_modules/, /\.d\.ts$/],
  });
  return result.obj() as DependencyGraph;
}
