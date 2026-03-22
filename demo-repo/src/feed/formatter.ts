export interface RawTaskRow {
  id: string;
  title: string;
  status: string;
  updated_at: Date;
  assignee_name: string;
  project_name: string;
}

export interface FeedItem {
  taskId: string;
  title: string;
  assignee: string;
  status: string;
  updatedAt: Date;
  projectName: string;
}

export function formatFeedItem(row: RawTaskRow): FeedItem {
  return {
    taskId: row.id,
    title: row.title,
    assignee: row.assignee_name,
    status: row.status,
    updatedAt: new Date(row.updated_at),
    projectName: row.project_name,
  };
}

export function formatStatus(status: string): string {
  const labels: Record<string, string> = {
    todo: 'To Do',
    in_progress: 'In Progress',
    in_review: 'In Review',
    done: 'Done',
    cancelled: 'Cancelled',
  };
  return labels[status] ?? status;
}
