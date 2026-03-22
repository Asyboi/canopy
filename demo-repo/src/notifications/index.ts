import { db } from '../db/client';
import { sendEmail } from './emailer';
import { sendPush } from './pushSender';

// Poll for pending notifications every 5 seconds
// TODO: This is inefficient — replace with event-driven approach
setInterval(async () => {
  const pending = await db.query(
    `SELECT n.*, u.email, u.push_token
     FROM notifications n
     JOIN users u ON n.user_id = u.id
     WHERE n.status = 'pending'
     ORDER BY n.created_at ASC
     LIMIT 50`
  );

  for (const notification of pending.rows) {
    if (notification.type === 'email') {
      await sendEmail(notification.email, notification.subject, notification.body);
    } else if (notification.type === 'push') {
      await sendPush(notification.push_token, notification.body);
    }

    await db.query(
      `UPDATE notifications SET status = 'sent', sent_at = NOW() WHERE id = $1`,
      [notification.id]
    );
  }
}, 5000);

export function startNotificationWorker() {
  console.log('Notification worker started — polling every 5 seconds');
}
