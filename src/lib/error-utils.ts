export function formatUnknownError(error: unknown): string {
  if (error instanceof Error) return [error.name, error.message, error.stack].filter(Boolean).join("\n");
  if (typeof error === "string") return error;
  try {
    return JSON.stringify(error, Object.getOwnPropertyNames(error), 2);
  } catch {
    return String(error);
  }
}

export function formatSupabaseError(error: unknown): string {
  if (!error) return "未知 Supabase 错误";
  if (typeof error === "object") {
    const record = error as Record<string, unknown>;
    const parts = [
      record.message && `message=${String(record.message)}`,
      record.code && `code=${String(record.code)}`,
      record.details && `details=${String(record.details)}`,
      record.hint && `hint=${String(record.hint)}`,
    ].filter(Boolean);
    if (parts.length) return parts.join("; ");
  }
  return formatUnknownError(error);
}
