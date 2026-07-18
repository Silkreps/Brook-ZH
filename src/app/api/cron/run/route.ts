import { env } from "@/lib/config";
import { isAdminSession } from "@/lib/admin-auth";
import { sendEmail, sendTelegram } from "@/lib/notifications";
import { runProcurementCycle } from "@/lib/scraper";
import { formatUnknownError } from "@/lib/error-utils";

export async function POST(request: Request) {
  const secret = request.headers.get("x-cron-secret");
  if (env.CRON_SECRET && secret !== env.CRON_SECRET && !(await isAdminSession())) return Response.json({ error: "未授权" }, { status: 401 });
  try {
    const result = await runProcurementCycle();
    await sendTelegram(`全球国际工程项目扫描完成：待人工核实 ${result.pendingReview} 条`);
    return Response.json({ ok: true, result });
  } catch (error) {
    await sendEmail("招标预警系统运行失败", formatUnknownError(error));
    return Response.json({ ok: false, error: formatUnknownError(error) }, { status: 500 });
  }
}

export async function GET(request: Request) { return POST(request); }
