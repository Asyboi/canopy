// Benchmark: memory-heavy bulk export
// Runs 5 export jobs, each buffering the entire dataset in memory

import { exportUserSummary } from '../src/export/dataExporter';

console.log('[bench] Running 5 memory-heavy export jobs...');
const start = Date.now();

for (let i = 1; i <= 5; i++) {
  const outPath = exportUserSummary(`batch-${i}`);
  console.log(`[bench] Export ${i}/5 → ${outPath}`);
}

const elapsed = Date.now() - start;
console.log(`[bench] Done in ${elapsed}ms. Each job loaded all data into RAM before writing.`);
