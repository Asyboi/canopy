import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.mailtrap.io',
  port: parseInt(process.env.SMTP_PORT || '587'),
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export interface EmailOptions {
  to: string;
  subject: string;
  body: string;
}

export async function sendEmail(to: string, subject: string, body: string): Promise<void> {
  await transporter.sendMail({
    from: process.env.MAIL_FROM || 'notifications@taskly.io',
    to,
    subject,
    text: body,
    html: `<p>${body}</p>`,
  });
}
