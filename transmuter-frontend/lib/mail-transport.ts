import nodemailer from "nodemailer";
import type SMTPTransport from "nodemailer/lib/smtp-transport";

export type MailConfig = {
  toEmail: string;
  fromEmail: string;
  transport: nodemailer.Transporter<SMTPTransport.SentMessageInfo>;
};

export function getMailConfig(): MailConfig | null {
  const host = process.env.SMTP_HOST?.trim();
  const port = Number(process.env.SMTP_PORT ?? "587");
  const user = process.env.SMTP_USER?.trim();
  const pass = process.env.SMTP_PASS?.trim();
  const toEmail = process.env.ACCESS_FORM_TO_EMAIL?.trim();
  const fromEmail = process.env.SMTP_FROM?.trim() ?? user;

  if (!host || !user || !pass || !toEmail || !fromEmail || Number.isNaN(port)) {
    return null;
  }

  const transport = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });

  return { toEmail, fromEmail, transport };
}
