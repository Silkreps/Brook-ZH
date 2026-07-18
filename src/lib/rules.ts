export type GateDecision = "正式项目库" | "待人工核实" | "禁止推送";
export type ProjectCandidate = { isInternationalOpen?: boolean; chinaEligible?: boolean | null; amountUsd?: number | null; amountEstimated?: boolean; deadline?: string | null; awarded?: boolean; cancelled?: boolean; officialLinkValid?: boolean; authentic?: boolean; procurementType?: string; country?: string | null; region?: string | null; stage?: string | null; title?: string | null; noticeText?: string | null; };

const CARIBBEAN = /caribbean|antigua|bahamas|barbados|belize|cuba|dominica|dominican|grenada|guyana|haiti|jamaica|saint kitts|st kitts|saint lucia|st lucia|saint vincent|trinidad|tobago|suriname/i;
export const FORBIDDEN_PROCUREMENT = /consult(?:ing|ancy|ant)?|supervision|advisory|technical assistance|project management|implementation support|research|study|training|audit|goods only|equipment only|awarded|contract(?:ed| signed)?|signed|cancelled|canceled|closed|expired|completed|limited to national|domestic bidders only|national bidders only|仅限本国|监理|咨询|顾问|研究|培训|技术援助|项目管理|实施支持|非工程|已授标|已签约|已成交|已完成|已截止|已关闭|已取消|已过期/i;
const ALLOWED = /international competitive|open international|request for bids|request for prequalification|invitation for bids|works|construction|civil|design-build|plant|road|bridge|rail|water|wastewater|power|transmission|port|airport|工程|土建|资格预审|招标/i;

export function amountThresholdFor(project: ProjectCandidate) {
  const haystack = `${project.country ?? ""} ${project.region ?? ""}`;
  return CARIBBEAN.test(haystack) ? 4_000_000 : 10_000_000;
}
export function isEngineeringProcurement(project: ProjectCandidate) {
  const text = `${project.procurementType ?? ""} ${project.stage ?? ""} ${project.title ?? ""} ${project.noticeText ?? ""}`;
  return ALLOWED.test(text) && !FORBIDDEN_PROCUREMENT.test(text);
}
export function decideProjectGate(project: ProjectCandidate): GateDecision {
  const text = `${project.procurementType ?? ""} ${project.stage ?? ""} ${project.title ?? ""} ${project.noticeText ?? ""}`;
  if (project.awarded || project.cancelled || project.officialLinkValid === false || project.authentic === false || FORBIDDEN_PROCUREMENT.test(text)) return "禁止推送";
  if (project.deadline && new Date(project.deadline).getTime() <= Date.now()) return "禁止推送";
  if (!project.isInternationalOpen || project.chinaEligible !== true) return "待人工核实";
  if (!isEngineeringProcurement(project)) return "禁止推送";
  return "正式项目库";
}
export const aiVerificationPolicy = { sourcePriority: ["业主官方网站", "国家政府采购平台", "正式招标文件PDF", "正式资格预审文件", "多边金融机构采购平台", "国家政府公报", "国有企业采购平台", "官方采购计划", "主流新闻媒体", "社交媒体线索"], uncertainLabel: "待人工核实", forbiddenFinalSources: ["新闻", "X", "Facebook", "LinkedIn", "论坛", "微信公众号", "转载网站"] };
export function scoreToStars(score: number) { const clamped = Math.max(0, Math.min(100, score)); const filled = Math.max(1, Math.ceil(clamped / 20)); return "★".repeat(filled) + "☆".repeat(5 - filled); }
