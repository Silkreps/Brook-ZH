import nodemailer from "nodemailer";
import { env } from "./config";

export async function sendTelegram(text: string) {
  if (!env.TELEGRAM_BOT_TOKEN || !env.TELEGRAM_CHAT_ID) return { skipped: true };
  const res = await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ chat_id: env.TELEGRAM_CHAT_ID, text, parse_mode: "HTML" }) });
  if (!res.ok) throw new Error(`Telegram 推送失败: ${res.status}`);
  return { skipped: false };
}

export async function sendEmail(subject: string, text: string) {
  if (!env.SMTP_URL || !env.ALERT_EMAIL_TO) return { skipped: true };
  const transporter = nodemailer.createTransport(env.SMTP_URL);
  await transporter.sendMail({ to: env.ALERT_EMAIL_TO, subject, text });
  return { skipped: false };
}
