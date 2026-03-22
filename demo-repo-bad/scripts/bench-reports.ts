// Benchmark: synchronous blocking report generation
// Generates 20 reports, each re-reading and re-parsing the template from disk

import { generateReport } from '../src/reports/reportGenerator';

console.log('[bench] Generating 20 reports with sync blocking I/O...');
const start = Date.now();

for (let i = 1; i <= 20; i++) {
  const outPath = generateReport(`report-${i}`, `user_${(i % 10) + 1}`);
  console.log(`[bench] Report ${i}/20 → ${outPath}`);
}

const elapsed = Date.now() - start;
console.log(`[bench] Done. 20 reports in ${elapsed}ms — template re-read from disk 20×.`);
