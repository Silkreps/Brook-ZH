import { scoreToStars } from "./rules";
import { getServiceSupabase } from "./supabase";
import type { DashboardMetric, ProcurementSection, TenderProject } from "./types";
export const sectionLabels: Record<ProcurementSection, string> = { prequalification: "资格预审", tender: "正式招标", pipeline: "前瞻项目" };
export const demoProjects: TenderProject[] = [];

export type ProjectFilters = { q?: string; country?: string; region?: string; industry?: string; stage?: string; amountMin?: number; publishedFrom?: string; publishedTo?: string; deadlineFrom?: string; deadlineTo?: string; financier?: string; chinaParticipation?: string; status?: string; sort?: string; page?: number; pageSize?: number };
export async function getProjectsBySection(section: ProcurementSection, filters: ProjectFilters = {}) { return filterAndSortProjects((await loadProjects()).filter((p) => p.section === section), filters); }
export function filterAndSortProjects(projects: TenderProject[], filters: ProjectFilters) {
  let rows = projects.filter((p) => {
    const q = filters.q?.toLowerCase().trim();
    if (q && !`${p.titleZh} ${p.titleEn} ${p.country} ${p.owner} ${p.financier} ${p.procurementNo ?? ""}`.toLowerCase().includes(q)) return false;
    if (filters.country && p.country !== filters.country) return false;
    if (filters.region && p.region !== filters.region) return false;
    if (filters.industry && p.industry !== filters.industry) return false;
    if (filters.stage && p.stage !== filters.stage) return false;
    if (filters.financier && p.financier !== filters.financier) return false;
    if (filters.chinaParticipation && p.chinaParticipation !== filters.chinaParticipation) return false;
    if (filters.status && p.status !== filters.status) return false;
    if (filters.amountMin && (!p.amountUsd || p.amountUsd < filters.amountMin)) return false;
    if (filters.publishedFrom && (!p.publishedAt || p.publishedAt < filters.publishedFrom)) return false;
    if (filters.publishedTo && (!p.publishedAt || p.publishedAt > filters.publishedTo)) return false;
    if (filters.deadlineFrom && (!p.deadlineAt || p.deadlineAt < filters.deadlineFrom)) return false;
    if (filters.deadlineTo && (!p.deadlineAt || p.deadlineAt > filters.deadlineTo)) return false;
    return true;
  });
  rows = rows.sort((a,b)=> filters.sort === "deadline" ? String(a.deadlineAt ?? "9999").localeCompare(String(b.deadlineAt ?? "9999")) : filters.sort === "published" ? String(b.publishedAt ?? "").localeCompare(String(a.publishedAt ?? "")) : filters.sort === "amount" ? (b.amountUsd ?? 0)-(a.amountUsd ?? 0) : b.score-a.score);
  const page = Math.max(1, filters.page ?? 1), size = Math.min(100, Math.max(1, filters.pageSize ?? 20));
  return { rows: rows.slice((page-1)*size, page*size), total: rows.length, page, pageSize: size };
}
export async function getProjectById(id: string) { return (await loadProjects()).find((p) => p.id === id); }
export async function loadProjects(): Promise<TenderProject[]> { try { const supabase = getServiceSupabase(); const { data, error } = await supabase.from("projects").select("*, project_links(*)").neq("gate", "blocked").order("created_at", { ascending: false }).limit(200); if (error) throw error; return (data ?? []).map(mapProject).filter((p) => p.links.some((l) => l.isOfficial && l.isValid) && p.status !== "已完成"); } catch { return []; } }
export function dashboardMetrics(projects: TenderProject[] = []): DashboardMetric[] { const today = new Date().toISOString().slice(0,10); return [{ label:"今日新增项目数量", value:projects.filter(p=>p.publishedAt===today).length },{ label:"今日符合条件项目数量", value:projects.filter(p=>p.chinaParticipation==="可以参与"&&!["已取消","已授标","已完成"].includes(p.status)).length, tone:"success" },{ label:"今日新增资格预审数量", value:projects.filter(p=>p.section==="prequalification"&&p.publishedAt===today).length },{ label:"今日新增正式招标数量", value:projects.filter(p=>p.section==="tender"&&p.publishedAt===today).length },{ label:"今日新增前瞻项目数量", value:projects.filter(p=>p.section==="pipeline"&&p.publishedAt===today).length },{ label:"即将截止项目数量", value:projects.filter(p=>p.deadlineAt&&new Date(p.deadlineAt).getTime()-Date.now()<7*864e5).length, tone:"warning" },{ label:"待人工核实", value:projects.filter(p=>p.reviewStatus==="pending"||p.status==="待人工核实").length, tone:"warning" },{ label:"数据源运行状态", value:"等待真实抓取" },{ label:"AI运行状态", value:process.env.OPENAI_API_KEY?"已配置":"未配置" }]; }
function mapProject(row: any): TenderProject { const score = Number(row.ai_score ?? 0); return { id: row.id, section: row.section, titleZh: row.title_zh, titleEn: row.title_en, country: row.country ?? "待人工核实", region: row.region ?? "待人工核实", industry: row.industry ?? "待人工核实", owner: row.owner ?? "待人工核实", financier: row.financier ?? "待人工核实", procurementNo: row.procurement_no, contractNo: row.contract_no, packageNo: row.package_no, amountUsd: row.amount_usd ? Number(row.amount_usd) : undefined, amountSource: row.amount_is_official ? "官方金额" : row.amount_is_ai_estimate ? "AI估算" : "待人工核实", publishedAt: row.published_at?.slice(0,10), deadlineAt: row.deadline_at?.slice(0,10), procurementMethod: row.procurement_method ?? "待人工核实", stage: row.stage ?? "待人工核实", jointVentureRequirement: row.joint_venture_requirements ?? "待人工核实", localRegistrationRequirement: row.local_registration_requirements ?? "待人工核实", chinaParticipation: row.china_eligible === true ? "可以参与" : row.china_eligible === false ? "不可参与" : "待人工核实", qualificationRequirementsZh: row.qualification_requirements_zh ?? "待人工核实", scopeZh: row.scope_zh ?? "待人工核实", summaryZh: row.summary_zh ?? "待人工核实", riskTipsZh: row.risks_zh ?? [], score, stars: scoreToStars(score), credibility: row.credibility ?? 0, aiUpdatedAt: row.ai_analyzed_at ?? "", status: row.status, links: (row.project_links ?? []).map((l:any)=>({ label:l.link_type, type:l.link_type, url:l.url, isOfficial:l.is_official, isValid:(l.http_status??200)<400, isPdf:l.is_pdf, httpStatus:l.http_status })), addendaCount: 0, clarificationCount: 0, isFavorite: row.is_favorite, participatedCompanyName: row.participated_company_name, completedAt: row.completed_at, reviewStatus: row.review_status }; }
