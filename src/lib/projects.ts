import { unstable_noStore as noStore } from "next/cache";
import { FORBIDDEN_PROCUREMENT, isEngineeringProcurement, scoreToStars } from "./rules";
import { getServiceSupabase } from "./supabase";
import type { DashboardMetric, ProcurementSection, TenderProject } from "./types";
import { canAppearInProjectLists, UNKNOWN_COUNTRY } from "./countries";

export const sectionLabels: Record<ProcurementSection, string> = { prequalification: "资格预审", tender: "正式招标", pipeline: "前瞻项目" };
export type ProjectFilters = { q?: string; country?: string; region?: string; industry?: string; stage?: string; amountMin?: number; publishedFrom?: string; publishedTo?: string; deadlineFrom?: string; deadlineTo?: string; financier?: string; chinaParticipation?: string; status?: string; sort?: string; page?: number; pageSize?: number; today?: boolean; upcoming?: boolean; pending?: boolean };
const PUBLICLY_CLOSED = /已签约|已授标|已成交|已完成|已取消|已截止|已关闭|closed|awarded|contract(?:ed| signed)?|signed|completed|cancel(?:led|ed)|expired/i;
const DAY = 86_400_000;

export function londonDate(date = new Date()) { return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/London", year: "numeric", month: "2-digit", day: "2-digit" }).format(date); }
export function hasPublishedChineseTitle(p: TenderProject) { return p.translationStatus === "translated" && /[\u3400-\u9fff]/.test(p.titleZh) && p.titleZh !== "待翻译"; }
export function isPendingReview(p: TenderProject) { return p.reviewStatus === "pending" && p.gate === "pending_review"; }
export function isApprovedProject(p: TenderProject) { return p.reviewStatus === "approved" && p.gate === "official"; }
/** The one public-query rule shared by lists, pagination, dashboard and recommendations. */
export function isPublicProject(p: TenderProject) {
  const text = `${p.titleEn} ${p.titleZh} ${p.procurementMethod} ${p.stage} ${p.status}`;
  const deadlineIsValid = !p.deadlineAt || new Date(p.deadlineAt).getTime() > Date.now();
  return isApprovedProject(p) && hasPublishedChineseTitle(p) && canAppearInProjectLists(p.country, p.titleEn) && p.country !== UNKNOWN_COUNTRY
    && p.links.some((link) => link.isOfficial && link.isValid)
    && !FORBIDDEN_PROCUREMENT.test(text) && !PUBLICLY_CLOSED.test(text)
    && deadlineIsValid && (p.section === "pipeline" || Boolean(p.deadlineAt))
    && p.chinaParticipation !== "不可参与"
    && (p.section === "pipeline" || isEngineeringProcurement({ title: p.titleEn, procurementType: p.procurementMethod, stage: p.stage }));
}
export const isActiveProcurement = isPublicProject;
export function isEligibleTender(p: TenderProject) { return p.section === "tender" && isPublicProject(p); }

export async function getProjectsBySection(section: ProcurementSection, filters: ProjectFilters = {}) {
  return filterAndSortProjects((await loadProjects()).filter((p) => p.section === section).filter(isPublicProject), filters);
}
export async function getPendingReviewProjects(filters: ProjectFilters = {}) {
  return filterAndSortProjects((await loadProjects()).filter(isPendingReview).filter((p) => canAppearInProjectLists(p.country, p.titleEn)), filters);
}
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
    if (filters.status && displayStatus(p) !== filters.status) return false;
    if (filters.pending && !isPendingReview(p)) return false;
    if (filters.today && (!p.createdAt || londonDate(new Date(p.createdAt)) !== londonDate())) return false;
    if (filters.upcoming && (!p.deadlineAt || new Date(p.deadlineAt).getTime() > Date.now() + 7 * DAY)) return false;
    if (filters.amountMin && (!p.amountUsd || p.amountUsd < filters.amountMin)) return false;
    if (filters.publishedFrom && (!p.publishedAt || p.publishedAt < filters.publishedFrom)) return false;
    if (filters.publishedTo && (!p.publishedAt || p.publishedAt > filters.publishedTo)) return false;
    if (filters.deadlineFrom && (!p.deadlineAt || p.deadlineAt < filters.deadlineFrom)) return false;
    if (filters.deadlineTo && (!p.deadlineAt || p.deadlineAt > filters.deadlineTo)) return false;
    return true;
  });
  rows = rows.sort((a, b) => filters.sort === "deadline" ? String(a.deadlineAt ?? "9999").localeCompare(String(b.deadlineAt ?? "9999")) : filters.sort === "published" ? String(b.publishedAt ?? "").localeCompare(String(a.publishedAt ?? "")) : filters.sort === "amount" ? (b.amountUsd ?? 0) - (a.amountUsd ?? 0) : b.score - a.score);
  const page = Math.max(1, filters.page ?? 1), pageSize = Math.min(100, Math.max(1, filters.pageSize ?? 20));
  return { rows: rows.slice((page - 1) * pageSize, page * pageSize), total: rows.length, page, pageSize };
}
export function displayStatus(p: TenderProject) { if (isPendingReview(p)) return "待人工核实"; if (p.deadlineAt && new Date(p.deadlineAt).getTime() - Date.now() <= 7 * DAY) return "即将截止"; return "正在招标"; }
export async function getProjectById(id: string) { return (await loadProjects()).find((p) => p.id === id); }
export async function loadProjects(): Promise<TenderProject[]> { noStore(); try { const { data, error } = await getServiceSupabase().from("projects").select("*, project_links(*)").order("created_at", { ascending: false }).limit(5000); if (error) throw error; return (data ?? []).map(mapProject); } catch { return []; } }
export function dashboardMetrics(projects: TenderProject[]): DashboardMetric[] {
  const added = (p: TenderProject) => Boolean(p.createdAt) && londonDate(new Date(p.createdAt!)) === londonDate();
  const publicProjects = projects.filter(isPublicProject);
  return [
    { label: "今日新增项目数量", value: publicProjects.filter(added).length },
    { label: "今日符合条件项目数量", value: publicProjects.filter(added).length, tone: "success" },
    { label: "今日新增资格预审数量", value: publicProjects.filter((p) => p.section === "prequalification" && added(p)).length },
    { label: "今日新增正式招标数量", value: publicProjects.filter((p) => p.section === "tender" && added(p)).length },
    { label: "今日新增前瞻项目数量", value: publicProjects.filter((p) => p.section === "pipeline" && added(p)).length },
    { label: "即将截止项目数量", value: publicProjects.filter((p) => p.deadlineAt && new Date(p.deadlineAt).getTime() <= Date.now() + 7 * DAY).length, tone: "warning" },
    { label: "待人工核实数量", value: projects.filter(isPendingReview).length, tone: "warning" },
  ];
}
function mapProject(row: any): TenderProject {
  const score = Number(row.ai_score ?? 0);
  return { id: row.id, section: row.section, titleZh: String(row.title_zh ?? "待翻译"), titleEn: row.title_en, country: row.country && row.country !== "待人工核实" ? row.country : UNKNOWN_COUNTRY, region: row.region ?? "官方未公布", industry: row.industry ?? "官方未公布", owner: row.owner ?? "官方未公布", financier: row.financier ?? "官方未公布", procurementNo: row.procurement_no, contractNo: row.contract_no, packageNo: row.package_no, amountUsd: row.amount_usd ? Number(row.amount_usd) : undefined, amountCurrency: row.amount_currency, amountSource: row.amount_is_official ? "官方金额" : "待人工核实", publishedAt: row.published_at, deadlineAt: row.deadline_at, procurementMethod: row.procurement_method ?? "官方未公布", stage: row.stage ?? "官方未公布", jointVentureRequirement: row.joint_venture_requirements ?? "官方未公布", localRegistrationRequirement: row.local_registration_requirements ?? "官方未公布", chinaParticipation: row.china_eligible === true ? "可以参与" : row.china_eligible === false ? "不可参与" : "待人工核实", qualificationRequirementsZh: row.qualification_requirements_zh ?? "官方未公布", scopeZh: row.scope_zh ?? "官方未公布", summaryZh: row.summary_zh ?? "官方未公布", riskTipsZh: row.risks_zh ?? [], score, stars: scoreToStars(score), credibility: row.credibility ?? 0, aiUpdatedAt: row.ai_analyzed_at ?? "", status: row.status, gate: row.gate, links: (row.project_links ?? []).map((link: any) => ({ label: link.link_type, type: link.link_type, url: link.url, isOfficial: link.is_official, isValid: (link.http_status ?? 200) < 400, isPdf: link.is_pdf, httpStatus: link.http_status })), addendaCount: 0, clarificationCount: 0, isFavorite: row.is_favorite, participatedCompanyName: row.participated_company_name, completedAt: row.completed_at, reviewStatus: row.review_status, createdAt: row.created_at, translationStatus: row.translation_status ?? (/[\u3400-\u9fff]/.test(String(row.title_zh ?? "")) ? "translated" : "pending"), aiAnalysisStatus: row.ai_analysis_status ?? (row.ai_analyzed_at ? "success" : "pending") };
}
