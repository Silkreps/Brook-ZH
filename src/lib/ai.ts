import { env } from "./config";
import { scoreToStars } from "./rules";
import type { ProjectCandidate, TenderProject } from "./types";

export async function analyzeProject(candidate: ProjectCandidate): Promise<Pick<TenderProject, "titleZh"|"summaryZh"|"scopeZh"|"qualificationRequirementsZh"|"riskTipsZh"|"credibility"|"score"|"stars"|"chinaParticipation"|"jointVentureRequirement"|"localRegistrationRequirement">> {
  if (!env.OPENAI_API_KEY) return fallback(candidate);
  const res = await fetch("https://api.openai.com/v1/chat/completions", { method: "POST", headers: { authorization: `Bearer ${env.OPENAI_API_KEY}`, "content-type": "application/json" }, body: JSON.stringify({ model: "gpt-4o-mini", temperature: 0, response_format: { type: "json_object" }, messages: [{ role: "system", content: "只基于输入的官方公告文本分析，不得编造缺失字段。输出JSON：titleZh,summaryZh,scopeZh,qualificationRequirementsZh,riskTipsZh数组,credibility,score,chinaParticipation,jointVentureRequirement,localRegistrationRequirement。" }, { role: "user", content: JSON.stringify(candidate).slice(0, 12000) }] }) });
  if (!res.ok) throw new Error(`OpenAI分析失败 ${res.status}`);
  const json = await res.json();
  const parsed = JSON.parse(json.choices?.[0]?.message?.content ?? "{}");
  return { ...fallback(candidate), ...parsed, stars: scoreToStars(Number(parsed.score ?? 50)) };
}
function fallback(candidate: ProjectCandidate) { const score = 45; return { titleZh: fallbackChineseTitle(candidate.titleEn, candidate.country), summaryZh: "未配置 OpenAI，已保存官方原始项并等待人工审核。", scopeZh: "待人工核实", qualificationRequirementsZh: "待人工核实", riskTipsZh: ["待人工核实"], credibility: 40, score, stars: scoreToStars(score), chinaParticipation: "待人工核实" as const, jointVentureRequirement: "待人工核实", localRegistrationRequirement: "待人工核实" }; }

function fallbackChineseTitle(title: string, country?: string) {
  const text = title.toLowerCase();
  const kind = /bridge/.test(text) ? "桥梁" : /road|highway/.test(text) ? "道路" : /rail/.test(text) ? "铁路" : /water|wastewater/.test(text) ? "供排水" : /power|transmission/.test(text) ? "电力" : /port/.test(text) ? "港口" : /airport/.test(text) ? "机场" : "工程建设";
  const action = /rehabilitat|upgrade/.test(text) ? "改造" : /design.?build/.test(text) ? "设计施工" : "施工";
  return `${country && country !== "待人工核实" ? country : "海外"}${kind}${action}项目（中文待校核）`;
}
