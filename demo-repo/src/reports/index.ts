import * as fs from 'fs';
import * as path from 'path';
import { db } from '../db/client';
import { generateCsv } from './csvExporter';

export async function generateWeeklyReport(teamId: string): Promise<string> {
  const result = await db.query(
    `SELECT t.id, t.title, t.status, t.priority,
            u.name as assignee,
            p.name as project,
            t.created_at, t.completed_at
     FROM tasks t
     JOIN users u ON t.assignee_id = u.id
     JOIN projects p ON t.project_id = p.id
     WHERE t.team_id = $1
       AND t.created_at > NOW() - INTERVAL '7 days'
     ORDER BY t.created_at DESC`,
    [teamId]
  );

  const csv = generateCsv(result.rows);
  const reportsDir = path.join(process.cwd(), 'reports');
  const filename = `weekly-report-${teamId}-${Date.now()}.csv`;
  const filepath = path.join(reportsDir, filename);

  // Synchronous file operations — blocks the event loop
  // NOTE: Should use fs.promises (async) instead
  if (!fs.existsSync(reportsDir)) {
    fs.mkdirSync(reportsDir, { recursive: true });
  }

  fs.writeFileSync(filepath, csv, 'utf-8');

  const stats = fs.statSync(filepath);
  console.log(`Report written: ${filepath} (${stats.size} bytes)`);

  return filepath;
}
