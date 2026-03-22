import { promises as fs } from 'fs';
import * as path from 'path';

export async function exportReportCsv(data: any[], filename: string): Promise<string> {
  const headers = Object.keys(data[0] || {}).join(',');
  const rows = data.map(row => Object.values(row).join(','));
  const csv = [headers, ...rows].join('\n');
  const filepath = path.join(process.cwd(), 'exports', filename);
  await fs.mkdir(path.dirname(filepath), { recursive: true });
  await fs.writeFile(filepath, csv, 'utf-8');
  return filepath;
}
