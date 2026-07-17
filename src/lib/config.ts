import { z } from "zod";

const scheduleSchema = z.object({
  CRON_SECRET: z.string().min(20).optional(),
  SUPABASE_URL: z.string().url().optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(20).optional(),
  OPENAI_API_KEY: z.string().min(20).optional(),
  TELEGRAM_BOT_TOKEN: z.string().optional(),
  TELEGRAM_CHAT_ID: z.string().optional(),
  SMTP_URL: z.string().optional(),
  ALERT_EMAIL_TO: z.string().email().optional(),
});

export const env = scheduleSchema.parse(process.env);
export const defaultRunTimesLondon = ["00:00", "06:00", "12:00", "18:00"];
export const amountThresholdsUsd = [10_000_000, 20_000_000, 30_000_000, 50_000_000, 100_000_000];
