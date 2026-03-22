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

// SSE connection reference replaces the polling interval handle.
// SSE is far more efficient than polling: the server pushes events only when
// new notifications exist, eliminating hundreds of unnecessary HTTP round-trips
// per hour and reducing CPU, bandwidth, and battery consumption on both client
// and server.
let sseConnection: EventSource | null = null;

export function startNotificationPolling(userId: string): void {
  // SSE PATTERN: Opens a single persistent HTTP connection; the server streams
  // events only when new notifications are available, instead of the client
  // hammering the API every 3 seconds regardless of whether anything changed.
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