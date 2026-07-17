import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { isAdminSession } from "@/lib/admin-auth";
import { getServiceSupabase } from "@/lib/supabase";
import { officialSourceAdapters } from "@/lib/official-sources";
import { updateProjectStatus } from "../admin-actions";

import { adminModules } from "@/lib/admin-modules";
import { RecrawlButton } from "./recrawl-button";

type PageProps = { params: Promise<{ module: string }> };

export default async function AdminModulePage({ params }: PageProps) {
  if (!(await isAdminSession())) redirect("/admin/login");
  const { module } = await params;
  const current = adminModules.find((m) => m.slug === module);
  if (!current) notFound();
  const supabase = getServiceSupabase();
  return <main className="shell"><p><Link href="/admin">← 返回后台首页</Link></p><h1>{current.label}</h1><p>{current.desc}</p>{await renderModule(module, supabase)}</main>;
}

async function renderModule(module: string, supabase: ReturnType<typeof getServiceSupabase>) {
  if (module === "recrawl") return <Recrawl />;
  if (module === "run-logs") { const { data } = await supabase.from("run_logs").select("*").order("started_at", { ascending: false }).limit(50); return <LogTable rows={data ?? []} columns={["started_at","finished_at","status","scanned_sources","new_count","error"]} />; }
  if (module === "error-logs") { const { data } = await supabase.from("error_logs").select("*").order("created_at", { ascending: false }).limit(100); return <LogTable rows={data ?? []} columns={["created_at","source_key","message","stack","resolved_at"]} />; }
  if (module === "data-sources") { const { data } = await supabase.from("data_sources").select("*").order("agency_name"); return <><SourceCards rows={data ?? []} /><section className="card"><h2>代码内置官方适配器</h2><ul>{officialSourceAdapters.map((s)=><li key={s.key}><strong>{s.agencyName}</strong>：{s.crawlEntry}；{s.enabled?"启用":"停用"}</li>)}</ul></section></>; }
  if (["project-management","manual-review","pending-verification","favorites","key-projects","awarded","completed","abandoned"].includes(module)) return <ProjectTable module={module} supabase={supabase} />;
  if (module === "push-logs") { const { data } = await supabase.from("notifications").select("*").order("sent_at", { ascending: false }).limit(100); return <LogTable rows={data ?? []} columns={["sent_at","channel","subject","status","body"]} />; }
  if (module === "link-check") { const { data } = await supabase.from("project_links").select("*, projects(title_zh)").order("last_checked_at", { ascending: false }).limit(100); return <LogTable rows={data ?? []} columns={["link_type","url","http_status","is_official","is_pdf","last_checked_at"]} />; }
  if (module === "ai-logs") return <ProjectTable module="ai-logs" supabase={supabase} />;
  return <GenericModule module={module} supabase={supabase} />;
}

function Recrawl() { return <section className="card"><h2>立即重新抓取</h2><p>点击按钮会向 <code>/api/cron/run</code> 发起 POST 请求，结果会显示在当前页面，并写入运行日志/错误日志。</p><RecrawlButton /></section>; }

async function ProjectTable({ module, supabase }: { module: string; supabase: ReturnType<typeof getServiceSupabase> }) {
  let query = supabase.from("projects").select("id,title_zh,title_en,country,financier,status,review_status,gate,ai_score,credibility,deadline_at,updated_at").order("updated_at", { ascending: false }).limit(100);
  if (module === "manual-review" || module === "pending-verification") query = query.or("review_status.eq.pending,status.eq.待人工核实,gate.eq.pending_review");
  if (module === "favorites") query = query.eq("is_favorite", true);
  if (module === "key-projects") query = query.gte("ai_score", 80);
  if (module === "awarded") query = query.eq("status", "已授标");
  if (module === "completed") query = query.eq("status", "已完成");
  if (module === "abandoned") query = query.eq("status", "已放弃");
  const { data } = await query;
  return <div className="wide-table"><table className="table compact"><thead><tr><th>项目</th><th>国家/资金方</th><th>状态</th><th>评分</th><th>截止</th><th>审核/修改</th></tr></thead><tbody>{(data ?? []).map((p:any)=><tr key={p.id}><td><strong>{p.title_zh}</strong><br />{p.title_en}</td><td>{p.country}<br />{p.financier}</td><td>{p.status}<br />{p.review_status}/{p.gate}</td><td>{p.ai_score ?? "-"} / {p.credibility ?? "-"}</td><td>{p.deadline_at?.slice(0,10) ?? "-"}</td><td><form action={updateProjectStatus} className="inline-form"><input type="hidden" name="id" value={p.id} /><select name="status" defaultValue={p.status}>{["未截止","延期","补遗","澄清","已授标","已取消","待人工核实","已完成","已放弃"].map(s=><option key={s}>{s}</option>)}</select><select name="review_status" defaultValue={p.review_status}>{["approved","pending","rejected"].map(s=><option key={s}>{s}</option>)}</select><button className="button small">保存</button></form></td></tr>)}</tbody></table></div>;
}

function LogTable({ rows, columns }: { rows: any[]; columns: string[] }) { return <div className="wide-table"><table className="table compact"><thead><tr>{columns.map(c=><th key={c}>{c}</th>)}</tr></thead><tbody>{rows.map((r,i)=><tr key={r.id ?? i}>{columns.map(c=><td key={c}>{formatCell(r[c])}</td>)}</tr>)}</tbody></table>{rows.length===0 && <p className="card">暂无记录或 Supabase 尚未配置数据。</p>}</div>; }
function SourceCards({ rows }: { rows: any[] }) { return <section className="grid">{rows.map((s)=><div className={`card ${s.consecutive_failures ? "warning" : "success"}`} key={s.id}><h3>{s.agency_name}</h3><p>{s.crawl_entry}</p><p>状态：{s.enabled ? "启用" : "停用"}；失败次数：{s.consecutive_failures ?? 0}</p><p>成功：{fmt(s.last_success_at)}；失败：{fmt(s.last_failure_at)}</p></div>)}</section>; }
async function GenericModule({ module, supabase }: { module: string; supabase: ReturnType<typeof getServiceSupabase> }) { const { count } = await supabase.from("projects").select("id", { count: "exact", head: true }); return <section className="card"><h2>功能入口已启用</h2><p>该栏目不再是静态文字，可独立进入。当前项目总数：{count ?? 0}。</p><p>栏目代码：{module}</p></section>; }
function formatCell(v: any) { if (v == null) return "-"; if (typeof v === "object") return <pre>{JSON.stringify(v, null, 2)}</pre>; return String(v).slice(0, 800); }
function fmt(v?: string) { return v ? new Date(v).toLocaleString("zh-CN") : "-"; }
