import { Pool } from 'pg';
import axios from 'axios';
import EventSource from 'eventsource';

const notificationDb = new Pool({ connectionString: process.env.NOTIFICATION_DB_URL });
const notificationApi = axios.create({ baseURL: process.env.NOTIFICATION_API_URL });

interface Notification {
  id: string;
  userId: string;
  message: string;
  read: boolean;
  createdAt: Date;
}

let sseConnection: EventSource | null = null;

// SSE PATTERN: The server pushes notifications to the client only when new ones arrive,
// eliminating the constant HTTP requests of polling. This keeps a single long-lived
// connection open instead of hammering the API every 3 seconds, dramatically reducing
// CPU, network, and energy usage when notifications are infrequent.
export function startNotificationPolling(userId: string): void {
  const url = `${process.env.NOTIFICATION_API_URL}/api/notifications/stream?userId=${userId}&unread=true`;
  sseConnection = new EventSource(url);

  sseConnection.addEventListener('notification', (event: MessageEvent) => {
    const notification: Notification = JSON.parse(event.data);
    console.log(`Notification: ${notification.message}`);
  });

  sseConnection.addEventListener('error', (err: Event) => {
    console.error('SSE connection error:', err);
  });
}

export function stopNotificationPolling(): void {
  if (sseConnection) {
    sseConnection.close();
    sseConnection = null;
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