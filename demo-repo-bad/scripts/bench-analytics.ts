// Benchmark: repeated feed recomputation with no caching
// Calls generateActivityFeed() 50 times — each is a full O(n²) recompute

import { generateActivityFeed } from '../src/analytics/feedGenerator';

console.log('[bench] Generating activity feed 50 times with no caching...');
const start = Date.now();

for (let i = 0; i < 50; i++) {
  const feed = generateActivityFeed(10);
  if (i === 0 || i === 49) {
    console.log(`[bench] Run ${i + 1}: top item = "${feed[0]?.message}" (score ${feed[0]?.trendingScore.toFixed(2)})`);
  }
}

const elapsed = Date.now() - start;
console.log(`[bench] Done. 50 identical recomputes in ${elapsed}ms — result never changed.`);
