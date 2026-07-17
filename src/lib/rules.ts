export type GateDecision = "正式项目库" | "待人工核实" | "禁止推送";
export type ProjectCandidate = { isInternationalOpen?: boolean; chinaEligible?: boolean | null; amountUsd?: number | null; amountEstimated?: boolean; deadline?: string | null; awarded?: boolean; cancelled?: boolean; officialLinkValid?: boolean; authentic?: boolean; procurementType?: string; };

export function decideProjectGate(project: ProjectCandidate, thresholdUsd = 30_000_000): GateDecision {
  if (project.awarded || project.cancelled || project.officialLinkValid === false || project.authentic === false) return "禁止推送";
  if (!project.isInternationalOpen || project.chinaEligible !== true) return "待人工核实";
  if (!project.amountUsd || project.amountUsd < thresholdUsd) return "待人工核实";
  if (!project.deadline || new Date(project.deadline).getTime() <= Date.now()) return "待人工核实";
  return "正式项目库";
}

export const aiVerificationPolicy = {
  sourcePriority: ["业主官方网站", "国家政府采购平台", "正式招标文件PDF", "正式资格预审文件", "多边金融机构采购平台", "国家政府公报", "国有企业采购平台", "官方采购计划", "主流新闻媒体", "社交媒体线索"],
  uncertainLabel: "待人工核实",
  forbiddenFinalSources: ["新闻", "X", "Facebook", "LinkedIn", "论坛", "微信公众号", "转载网站"],
};

export function scoreToStars(score: number) {
  const clamped = Math.max(0, Math.min(100, score));
  const filled = Math.max(1, Math.ceil(clamped / 20));
  return "★".repeat(filled) + "☆".repeat(5 - filled);
}
