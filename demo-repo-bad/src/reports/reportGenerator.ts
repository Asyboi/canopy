import fs from 'fs';
import path from 'path';

// BAD PATTERN: SYNCHRONOUS BLOCKING FILE I/O + REPEATED JSON PARSING
// Functional Unit R: one report generation job
//
// This module generates reports by:
//   1. Re-reading the template file from disk on every single report (no cache)
//   2. Using readFileSync — blocks the entire Node.js event loop during I/O
//   3. Re-parsing the full JSON template on every call
//   4. Writing the result with writeFileSync — another blocking call
//   5. Reading it back with readFileSync to "verify" — completely unnecessary
//
// Greener alternative:
//   - Load template once at startup and cache in memory
//   - Use fs.promises.readFile / writeFile (non-blocking)
//   - Stream large output instead of buffering the entire result
//   - Skip the read-back verification — trust the write

const TEMPLATE_PATH = path.join(__dirname, '../../data/report-template.json');
const OUTPUT_DIR = path.join(__dirname, '../../data/reports-out');

// BAD: template is loaded from disk on every call instead of once at startup
function loadTemplate(): object {
  // BAD: readFileSync blocks the event loop
  const raw = fs.readFileSync(TEMPLATE_PATH, 'utf-8');
  // BAD: re-parses JSON on every report instead of caching the parsed object
  return JSON.parse(raw) as object;
}

function generateReport(reportId: string, userId: string): string {
  // BAD: disk read + JSON parse on every single invocation
  const template = loadTemplate();

  const report = {
    ...(template as object),
    reportId,
    generatedBy: userId,
    generatedAt: new Date().toISOString(),
    // BAD: re-serializes the entire template into the report body on every call
    rawTemplateSnapshot: JSON.stringify(template),
  };

  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  const outPath = path.join(OUTPUT_DIR, `report-${reportId}.json`);

  // BAD: writeFileSync blocks the event loop
  fs.writeFileSync(outPath, JSON.stringify(report, null, 2));

  // BAD: reads the file back immediately — pointless verification, another blocking call
  const written = fs.readFileSync(outPath, 'utf-8');
  const parsed = JSON.parse(written) as { reportId: string };
  if (parsed.reportId !== reportId) {
    throw new Error('Report write verification failed');
  }

  return outPath;
}

export { generateReport };
