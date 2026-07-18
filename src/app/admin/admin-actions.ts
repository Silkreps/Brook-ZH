"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { isAdminSession } from "@/lib/admin-auth";
import { getServiceSupabase } from "@/lib/supabase";

async function requireAdmin() {
  if (!(await isAdminSession())) redirect("/admin/login");
}

export async function updateProjectStatus(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "待人工核实");
  const review = String(formData.get("review_status") ?? "pending");
  const gate = review === "approved" ? "official" : review === "rejected" ? "blocked" : "pending_review";
  const supabase = getServiceSupabase();
  const { error } = await supabase.from("projects").update({ status, review_status: review, gate, updated_at: new Date().toISOString() }).eq("id", id);
  if (error) throw error;
  await supabase.from("project_reviews").insert({ project_id: id, decision: review, note: `后台更新状态为 ${status}` });
  await supabase.from("project_status_history").insert({ project_id: id, status, gate, metadata: { source: "admin" } });
  revalidatePath("/admin");
  revalidatePath("/admin/project-management");
  revalidatePath("/admin/manual-review");
}

export async function reviewProject(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const decision = String(formData.get("decision") ?? "");
  if (!id || !["approved", "rejected"].includes(decision)) throw new Error("无效的审核操作");
  const supabase = getServiceSupabase();
  const { data: project, error: readError } = await supabase.from("projects").select("status,review_status,gate").eq("id", id).single();
  if (readError) throw readError;
  if (project.review_status !== "pending" || project.gate !== "pending_review") throw new Error("项目已被审核，请刷新页面");
  const approved = decision === "approved";
  const status = approved && project.status === "待人工核实" ? "未截止" : project.status;
  const gate = approved ? "official" : "blocked";
  const { error } = await supabase.from("projects").update({ status, review_status: decision, gate, updated_at: new Date().toISOString() }).eq("id", id).eq("review_status", "pending").eq("gate", "pending_review");
  if (error) throw error;
  await supabase.from("project_reviews").insert({ project_id: id, decision, note: approved ? "批准进入正式项目库" : "驳回，不进入正式项目库" });
  await supabase.from("project_status_history").insert({ project_id: id, status, gate, metadata: { source: "pending-review", decision } });
  revalidatePath("/");
  revalidatePath("/projects/pending-review");
  revalidatePath("/projects/tender");
}

export async function toggleFavorite(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const favorite = String(formData.get("favorite")) !== "true";
  const { error } = await getServiceSupabase().from("projects").update({ is_favorite: favorite, updated_at: new Date().toISOString() }).eq("id", id);
  if (error) throw error;
  revalidatePath("/", "layout");
}
