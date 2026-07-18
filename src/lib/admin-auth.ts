import { cookies } from "next/headers";

const COOKIE = "brook_admin";
export async function isAdminSession() { const token = process.env.ADMIN_SESSION_TOKEN; return Boolean(token) && (await cookies()).get(COOKIE)?.value === token; }
export function adminConfigStatus() { return { adminPassword: Boolean(process.env.ADMIN_PASSWORD), sessionToken: Boolean(process.env.ADMIN_SESSION_TOKEN), telegram: Boolean(process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID), email: Boolean(process.env.SMTP_URL && process.env.ALERT_EMAIL_TO), openai: Boolean(process.env.OPENAI_API_KEY), supabase: Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) }; }
export { COOKIE };
