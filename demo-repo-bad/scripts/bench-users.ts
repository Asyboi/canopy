// Benchmark: N+1 user aggregation
// Calls getUsersWithTeams() 10 times, each triggering ~150 individual lookups

import { getUsersWithTeams } from '../src/users/userAggregator';

console.log('[bench] Running N+1 user aggregation 10 times...');
const start = Date.now();

for (let i = 0; i < 10; i++) {
  const result = getUsersWithTeams();
  console.log(`[bench] Run ${i + 1}: aggregated ${result.length} users`);
}

const elapsed = Date.now() - start;
console.log(`[bench] Done in ${elapsed}ms. Each run triggered ~150 individual file lookups.`);
