import { Pool } from 'pg';
import axios from 'axios';

const notificationDb = new Pool({ connectionString: process.env.NOTIFICATION_DB_URL });
const notificationApi = axios.create({ baseURL: process.env.NOTIFICATION_API_URL });

interface Notification {
  id: string;
  userId: string;
  message: string;
  read: boolean;
  createdAt: Date;
}

let pollingInterval: ReturnType<typeof setInterval> | null = null;

// POLLING PATTERN: Polls the API every 3 seconds for new notifications.
// A WebSocket or SSE connection would be far more efficient.
export function startNotificationPolling(userId: string): void {
  pollingInterval = setInterval(async () => {
    const response = await notificationApi.get(
      `/api/notifications?userId=${userId}&unread=true`
    );
    const notifications: Notification[] = response.data;
    for (const n of notifications) {
      console.log(`Notification: ${n.message}`);
    }
  }, 3000);
}

export function stopNotificationPolling(): void {
  if (pollingInterval) {
    clearInterval(pollingInterval);
    pollingInterval = null;
  }
}

export async function markRead(notificationId: string): Promise<void> {
  await notificationDb.query(
    'UPDATE notifications SET read = true WHERE id = $1',
    [notificationId]
  );
}

export async function getHistory(userId: string): Promise<Notification[]> {
  const result = await notificationDb.query(
    'SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC',
    [userId]
  );
  return result.rows;
}
