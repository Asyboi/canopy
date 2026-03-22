import fs from 'fs';
import path from 'path';

// BAD PATTERN: REPEATED EXPENSIVE RECOMPUTATION WITH NO CACHING
// Functional Unit R: one feed generation request
//
// This module generates a "trending" activity feed by:
//   1. Re-loading ALL notifications from disk on every request (no cache)
//   2. Re-computing trending scores from scratch on every request
//   3. Re-sorting the full dataset on every request
//   4. Re-serializing and re-parsing JSON mid-computation (deep clone via stringify)
//   5. Running a fake "expensive" scoring function with redundant iterations
//
// In production: 100 requests/min × full recompute = constant max CPU load.
//
// Greener alternative:
//   - Cache the computed feed in memory, invalidate on data change
//   - Use an incremental update strategy (only recompute affected entries)
//   - Debounce / rate-limit feed generation
//   - Store pre-computed trending scores, update on write

const NOTIFICATIONS_PATH = path.join(__dirname, '../../data/notifications.json');

interface Notification {
  id: string;
  userId: string;
  type: string;
  message: string;
  read: boolean;
  priority: string;
  createdAt: string;
}

interface FeedItem {
  id: string;
  message: string;
  trendingScore: number;
  rank: number;
}

// BAD: re-reads and re-parses entire file every time
function loadNotifications(): Notification[] {
  const raw = fs.readFileSync(NOTIFICATIONS_PATH, 'utf-8');
  return JSON.parse(raw) as Notification[];
}

// BAD: fake expensive scoring — iterates the array multiple redundant times
function computeTrendingScore(notif: Notification, allNotifs: Notification[]): number {
  // BAD: counts related notifications with a full scan per item — O(n²) total
  const sameTypeCount = allNotifs.filter(n => n.type === notif.type).length;
  const sameUserCount = allNotifs.filter(n => n.userId === notif.userId).length;
  const unreadCount = allNotifs.filter(n => !n.read).length;

  const priorityWeight = notif.priority === 'high' ? 3 : notif.priority === 'medium' ? 2 : 1;
  const ageMs = Date.now() - new Date(notif.createdAt).getTime();
  const agePenalty = Math.log(ageMs + 1);

  return (sameTypeCount * 0.4 + sameUserCount * 0.3 + unreadCount * 0.2) *
    priorityWeight / agePenalty;
}

// BAD: no cache — recomputes the full feed from scratch on every call
function generateActivityFeed(limit = 10): FeedItem[] {
  // BAD: full disk read + parse on every call
  const notifications = loadNotifications();

  // BAD: deep clone via JSON.stringify/parse — unnecessary copy of full array
  const workingCopy = JSON.parse(JSON.stringify(notifications)) as Notification[];

  // BAD: O(n²) — computeTrendingScore scans full array for each item
  const scored = workingCopy.map(notif => ({
    id: notif.id,
    message: notif.message,
    trendingScore: computeTrendingScore(notif, notifications), // passes full array each time
  }));

  // BAD: re-sorts the full array on every request (no pre-sorted index)
  scored.sort((a, b) => b.trendingScore - a.trendingScore);

  return scored.slice(0, limit).map((item, i) => ({
    ...item,
    rank: i + 1,
  }));
}

export { generateActivityFeed };
