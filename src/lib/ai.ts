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
function fallback(candidate: ProjectCandidate) { const score = 45; return { titleZh: candidate.titleEn, summaryZh: "未配置 OpenAI，已保存官方原始项并等待人工审核。", scopeZh: "待人工核实", qualificationRequirementsZh: "待人工核实", riskTipsZh: ["待人工核实"], credibility: 40, score, stars: scoreToStars(score), chinaParticipation: "待人工核实" as const, jointVentureRequirement: "待人工核实", localRegistrationRequirement: "待人工核实" }; }
