import fs from 'fs';
import path from 'path';

// BAD PATTERN: MEMORY-HEAVY BUFFERING INSTEAD OF STREAMING
// Functional Unit R: one export batch job
//
// This module exports user + notification data by:
//   1. Loading ALL records into memory at once before writing anything
//   2. Building one giant concatenated string in memory
//   3. Only writing to disk after the entire payload is assembled
//   4. Re-reading the output file to "verify" the export (unnecessary)
//   5. Keeping the entire buffer alive for the lifetime of the function
//
// For large datasets this causes:
//   - High peak memory usage (entire dataset × 2 in RAM simultaneously)
//   - Long latency before first byte is written
//   - No backpressure handling
//
// Greener alternative:
//   - Use fs.createWriteStream and pipe data in chunks
//   - Process and write records incrementally
//   - Release each chunk from memory after writing

const USERS_PATH = path.join(__dirname, '../../data/users.json');
const NOTIFICATIONS_PATH = path.join(__dirname, '../../data/notifications.json');
const EXPORT_DIR = path.join(__dirname, '../../data/exports');

interface ExportRecord {
  userId: string;
  userName: string;
  email: string;
  role: string;
  notificationCount: number;
  unreadCount: number;
  exportedAt: string;
}

// BAD: loads entire dataset into memory, builds giant string, writes all at once
function exportUserSummary(exportId: string): string {
  // BAD: readFileSync blocks event loop; loads everything into RAM
  const users = JSON.parse(fs.readFileSync(USERS_PATH, 'utf-8')) as Array<{
    id: string; name: string; email: string; role: string;
  }>;
  const notifications = JSON.parse(
    fs.readFileSync(NOTIFICATIONS_PATH, 'utf-8')
  ) as Array<{ userId: string; read: boolean }>;

  // BAD: builds entire result array in memory before writing anything
  const records: ExportRecord[] = [];

  for (const user of users) {
    // BAD: full scan of notifications array per user — O(n×m)
    const userNotifs = notifications.filter(n => n.userId === user.id);
    const unread = userNotifs.filter(n => !n.read);

    records.push({
      userId: user.id,
      userName: user.name,
      email: user.email,
      role: user.role,
      notificationCount: userNotifs.length,
      unreadCount: unread.length,
      exportedAt: new Date().toISOString(),
    });
  }

  // BAD: concatenates the entire CSV as one giant in-memory string
  let csvBuffer = 'userId,userName,email,role,notificationCount,unreadCount,exportedAt\n';
  for (const rec of records) {
    // BAD: string concatenation in a loop — O(n²) memory allocations
    csvBuffer += `${rec.userId},${rec.userName},${rec.email},${rec.role},` +
      `${rec.notificationCount},${rec.unreadCount},${rec.exportedAt}\n`;
  }

  fs.mkdirSync(EXPORT_DIR, { recursive: true });
  const outPath = path.join(EXPORT_DIR, `export-${exportId}.csv`);

  // BAD: writeFileSync — blocks event loop; writes entire buffer in one shot
  fs.writeFileSync(outPath, csvBuffer);

  // BAD: reads the file back to count lines — pointless, we already know the count
  const verification = fs.readFileSync(outPath, 'utf-8');
  const lineCount = verification.split('\n').filter(Boolean).length;
  console.log(`[export] Wrote ${lineCount - 1} records to ${outPath}`);

  return outPath;
}

export { exportUserSummary };
