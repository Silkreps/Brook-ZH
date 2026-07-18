import { env } from "./config";
import { scoreToStars } from "./rules";
import type { ProjectCandidate, TenderProject } from "./types";

type Analysis = Pick<TenderProject, "titleZh"|"summaryZh"|"scopeZh"|"qualificationRequirementsZh"|"riskTipsZh"|"credibility"|"score"|"stars"|"chinaParticipation"|"jointVentureRequirement"|"localRegistrationRequirement"> & { aiAnalysisStatus: "success"|"pending"|"failed"; translationStatus: "translated"|"pending"|"failed" };
export async function analyzeProject(candidate: ProjectCandidate): Promise<Analysis> {
  if (!env.OPENAI_API_KEY) return fallback(candidate);
  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", { method: "POST", headers: { authorization: `Bearer ${env.OPENAI_API_KEY}`, "content-type": "application/json" }, body: JSON.stringify({ model: "gpt-4o-mini", temperature: 0, response_format: { type: "json_object" }, messages: [{ role: "system", content: "只基于输入的官方公告文本分析，不得编造缺失字段。英文标题须翻译成自然准确的中文，不得复制英文。输出JSON：titleZh,summaryZh,scopeZh,qualificationRequirementsZh,riskTipsZh数组,credibility,score,chinaParticipation,jointVentureRequirement,localRegistrationRequirement。" }, { role: "user", content: JSON.stringify(candidate).slice(0, 12000) }] }) });
    if (!res.ok) throw new Error(`OpenAI分析失败 ${res.status}`);
    const json = await res.json();
    const parsed = JSON.parse(json.choices?.[0]?.message?.content ?? "{}");
    const translated = /[\u3400-\u9fff]/.test(String(parsed.titleZh ?? "")) && String(parsed.titleZh).trim() !== candidate.titleEn.trim();
    if (!translated) throw new Error("中文标题翻译无效");
    return { ...fallback(candidate), ...parsed, titleZh: String(parsed.titleZh).trim(), stars: scoreToStars(Number(parsed.score ?? 50)), aiAnalysisStatus: "success", translationStatus: "translated" };
  } catch {
    return { ...fallback(candidate), aiAnalysisStatus: "failed", translationStatus: "failed" };
  }
}
function fallback(_candidate: ProjectCandidate): Analysis { const score = 45; return { titleZh: "待翻译", summaryZh: "等待真实 AI 分析或人工审核。", scopeZh: "待人工核实", qualificationRequirementsZh: "待人工核实", riskTipsZh: ["待人工核实"], credibility: 40, score, stars: scoreToStars(score), chinaParticipation: "待人工核实", jointVentureRequirement: "待人工核实", localRegistrationRequirement: "待人工核实", aiAnalysisStatus: "pending", translationStatus: "pending" }; }
