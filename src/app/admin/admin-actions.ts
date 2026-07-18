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

export async function toggleFavorite(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const favorite = String(formData.get("favorite")) !== "true";
  const { error } = await getServiceSupabase().from("projects").update({ is_favorite: favorite, updated_at: new Date().toISOString() }).eq("id", id);
  if (error) throw error;
  revalidatePath("/", "layout");
}
