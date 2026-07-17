import { cookies } from "next/headers";
import { COOKIE } from "@/lib/admin-auth";

export async function POST(request: Request) {
  const form = await request.formData();
  if (!process.env.ADMIN_PASSWORD || !process.env.ADMIN_SESSION_TOKEN) return Response.json({ error: "管理员密码或会话令牌未配置" }, { status: 503 });
  if (form.get("password") !== process.env.ADMIN_PASSWORD) return Response.json({ error: "密码错误" }, { status: 401 });
  (await cookies()).set(COOKIE, process.env.ADMIN_SESSION_TOKEN, { httpOnly: true, sameSite: "lax", secure: true, path: "/", maxAge: 60 * 60 * 8 });
  return Response.redirect(new URL("/admin", request.url));
}
