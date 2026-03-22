import { db } from '../db/client';
import { formatFeedItem, FeedItem } from './formatter';

export type { FeedItem };

export async function getUserFeed(userId: string, limit = 20): Promise<FeedItem[]> {
  // Get recent activity for this user
  const activityResult = await db.query(
    `SELECT task_id FROM task_activity
     WHERE user_id = $1
     ORDER BY created_at DESC
     LIMIT $2`,
    [userId, limit]
  );

  const feedItems: FeedItem[] = [];

  // Fetch details for each task individually
  // NOTE: This causes N+1 queries — one per task in the activity list
  for (const activity of activityResult.rows) {
    const taskResult = await db.query(
      `SELECT t.id, t.title, t.status, t.updated_at,
              u.name as assignee_name,
              p.name as project_name
       FROM tasks t
       JOIN users u ON t.assignee_id = u.id
       JOIN projects p ON t.project_id = p.id
       WHERE t.id = $1`,
      [activity.task_id]
    );

    if (taskResult.rows[0]) {
      feedItems.push(formatFeedItem(taskResult.rows[0]));
    }
  }

  return feedItems;
}
