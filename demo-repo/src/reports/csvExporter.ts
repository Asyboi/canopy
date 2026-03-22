export interface TaskRow {
  id: string;
  title: string;
  status: string;
  priority: string;
  assignee: string;
  project: string;
  created_at: Date;
  completed_at: Date | null;
}

function escapeCsvField(value: string | null | undefined): string {
  if (value == null) return '';
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function generateCsv(rows: TaskRow[]): string {
  const headers = ['ID', 'Title', 'Status', 'Priority', 'Assignee', 'Project', 'Created At', 'Completed At'];

  const lines: string[] = [headers.join(',')];

  for (const row of rows) {
    const fields = [
      escapeCsvField(row.id),
      escapeCsvField(row.title),
      escapeCsvField(row.status),
      escapeCsvField(row.priority),
      escapeCsvField(row.assignee),
      escapeCsvField(row.project),
      escapeCsvField(row.created_at?.toISOString()),
      escapeCsvField(row.completed_at?.toISOString()),
    ];
    lines.push(fields.join(','));
  }

  return lines.join('\n');
}
