import nodemailer from 'nodemailer';

import { env } from '@julio/api/config/env';

let transporter = null;

export function getMailer() {
  if (transporter) return transporter;

  transporter = nodemailer.createTransport({
    host: env.smtpHost,
    port: env.smtpPort,
    secure: env.smtpPort === 465,
    auth: {
      user: env.smtpUser,
      pass: env.smtpPass
    }
  });

  return transporter;
}

export async function sendEmail({ to, subject, text, html }) {
  const t = getMailer();
  await t.sendMail({
    from: env.smtpUser,
    to,
    subject,
    text,
    html
  });
}
