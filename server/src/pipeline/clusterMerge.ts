import { v4 as uuidv4 } from 'uuid';
import { DependencyGraph, CoChangeCluster, Feature } from '../types';
import { UnionFind } from '../utils/unionFind';

export function mergeClusters(
  depGraph: DependencyGraph,
  coChangeClusters: CoChangeCluster[]
): Feature[] {
  const uf = new UnionFind();

  // Add all files from the dependency graph
  for (const [file, deps] of Object.entries(depGraph)) {
    uf.makeSet(file);
    for (const dep of deps) {
      uf.makeSet(dep);
      uf.union(file, dep);
    }
  }

  // Merge co-change clusters
  for (const cluster of coChangeClusters) {
    for (let i = 1; i < cluster.files.length; i++) {
      uf.makeSet(cluster.files[0]);
      uf.makeSet(cluster.files[i]);
      uf.union(cluster.files[0], cluster.files[i]);
    }
  }

  const groups = uf.getGroups();
  const features: Feature[] = [];

  for (const files of groups.values()) {
    features.push({
      id: `feature_${uuidv4().replace(/-/g, '').slice(0, 12)}`,
      name: '',
      files,
      metrics: {
        loc: 0,
        dependencyCount: 0,
        cyclomaticComplexity: 0,
        complexityScore: 0,
      },
      sustainability: {
        electricityKwh: 0,
        carbonKgCo2e: 0,
        isEstimated: true,
        infrastructureTag: null,
        sci: { score: 0, unit: '', components: { E_per_R: 0, I: 0, M_per_R: 0 }, functionalUnit: '' },
      },
      sustainabilityTier: 'low',
      suggestions: [],
    });
  }

  return features;
}
