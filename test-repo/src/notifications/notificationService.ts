import { sendEmail } from './emailService';

export async function sendNotification(userId: string, subject: string, body: string): Promise<void> {
  await sendEmail(userId, subject, body);
}
