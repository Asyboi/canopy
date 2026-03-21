import * as fs from 'fs';
import * as path from 'path';
import { Pool } from 'pg';

const reportDb = new Pool({ connectionString: process.env.REPORT_DB_URL });

interface Report {
  id: string;
  title: string;
  content: string;
  generatedAt: Date;
}

interface ReportConfig {
  outputPath: string;
  template: string;
  format: 'pdf' | 'csv' | 'json';
}

// SYNC_BLOCKING PATTERN: Uses synchronous fs methods in a request handler,
// blocking the Node.js event loop on every call.
// Should use fs.promises (async) instead.
export function generateReport(reportId: string, config: ReportConfig): string {
  // Blocks event loop reading template
  const template = fs.readFileSync(
    path.join(__dirname, '../../templates', config.template),
    'utf-8'
  );

  const content = template.replace('{{reportId}}', reportId);

  // Blocks event loop writing output
  const outputPath = path.join(config.outputPath, `${reportId}.${config.format}`);
  fs.writeFileSync(outputPath, content, 'utf-8');

  // Blocks event loop reading back to verify
  return fs.readFileSync(outputPath, 'utf-8');
}

export async function getReport(id: string): Promise<Report | null> {
  const result = await reportDb.query('SELECT * FROM reports WHERE id = $1', [id]);
  return result.rows[0] || null;
}

export async function listReports(): Promise<Report[]> {
  const result = await reportDb.query(
    'SELECT * FROM reports ORDER BY generated_at DESC'
  );
  return result.rows;
}

export async function saveReport(report: Omit<Report, 'id' | 'generatedAt'>): Promise<Report> {
  const result = await reportDb.query(
    'INSERT INTO reports (title, content, generated_at) VALUES ($1, $2, NOW()) RETURNING *',
    [report.title, report.content]
  );
  return result.rows[0];
}
