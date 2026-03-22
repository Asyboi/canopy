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

// Uses fs.promises with async/await instead of synchronous fs methods, freeing
// the Node.js event loop to handle other requests while I/O operations complete.
export async function generateReport(reportId: string, config: ReportConfig): Promise<string> {
  // Non-blocking async read: event loop remains available during disk I/O
  const template = await fs.promises.readFile(
    path.join(__dirname, '../../templates', config.template),
    'utf-8'
  );

  const content = template.replace('{{reportId}}', reportId);

  // Non-blocking async write: event loop remains available during disk I/O
  const outputPath = path.join(config.outputPath, `${reportId}.${config.format}`);
  await fs.promises.writeFile(outputPath, content, 'utf-8');

  // Non-blocking async read: event loop remains available during disk I/O
  return fs.promises.readFile(outputPath, 'utf-8');
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