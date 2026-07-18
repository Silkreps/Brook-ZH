import { isAdminSession } from "@/lib/admin-auth";
import { formatSupabaseError, formatUnknownError } from "@/lib/error-utils";
import { getServiceSupabase } from "@/lib/supabase";

export async function POST() {
  if (!(await isAdminSession())) return Response.json({ ok: false, error: "未授权" }, { status: 401 });
  try {
    const { data, error } = await getServiceSupabase().rpc("admin_cleanup_and_reclassify");
    if (error) throw new Error(formatSupabaseError(error));
    return Response.json({ ok: true, result: data });
  } catch (error) {
    return Response.json({ ok: false, error: formatUnknownError(error) }, { status: 500 });
  }
}
