import fs from 'fs';
import path from 'path';

// BAD PATTERN: AGGRESSIVE POLLING
// Functional Unit R: one polling cycle (every 500ms)
//
// This module polls for unread notifications every 500ms — regardless of
// whether anything has changed. It:
//   1. Re-reads the entire notifications file from disk on every cycle
//   2. Re-parses the full JSON payload every cycle (no caching)
//   3. Compares full arrays by JSON.stringify instead of using IDs
//   4. Never uses exponential backoff or visibility awareness
//   5. Continues polling even when the tab/user is inactive
//
// Greener alternative: replace with SSE or WebSocket push.
// The server emits only when there is actually a new notification.
// Eliminates ~99% of polling cycles under normal usage.

const DATA_PATH = path.join(__dirname, '../../data/notifications.json');

// BAD: re-reads and re-parses the full file on every poll tick
function fetchAllNotifications(): object[] {
  // BAD: readFileSync blocks the event loop on every call
  const raw = fs.readFileSync(DATA_PATH, 'utf-8');
  // BAD: JSON.parse of the full dataset on every cycle
  return JSON.parse(raw) as object[];
}

let previousSnapshot = '';

// BAD: setInterval with a very short interval, no backoff, no unsubscribe
function startNotificationPolling(userId: string): void {
  console.log(`[notifications] Starting polling for user ${userId} every 500ms — BAD PATTERN`);

  setInterval(() => {
    // BAD: fetches ALL notifications for ALL users, then filters client-side
    const all = fetchAllNotifications();
    const forUser = (all as Array<{ userId: string; read: boolean }>)
      .filter(n => n.userId === userId && !n.read);

    // BAD: uses JSON.stringify for change detection instead of ETag / lastSeen ID
    const snapshot = JSON.stringify(forUser);
    if (snapshot !== previousSnapshot) {
      console.log(`[notifications] ${forUser.length} unread notification(s) for ${userId}`);
      previousSnapshot = snapshot;
    }
    // BAD: no else branch — does nothing but waste CPU/IO when nothing changed
  }, 500); // BAD: 500ms interval — 120 network/IO calls per minute per user
}

export { startNotificationPolling };
