import { analyzeProject } from "./ai";
import { decideProjectGate, isEngineeringProcurement } from "./rules";
import { getServiceSupabase } from "./supabase";
import { officialSourceAdapters } from "./official-sources";
import type { ProjectCandidate, RunSummary } from "./types";
import { formatSupabaseError, formatUnknownError } from "./error-utils";
import { resolveCountry } from "./countries";

const CLOSED = /closed|awarded|cancelled|canceled|授标|取消|截止/i;
const LOCAL_ONLY = /national bidders only|domestic bidders only|local bidders only|仅限本国/i;

export async function runProcurementCycle(): Promise<RunSummary> {
  const startedAt = new Date().toISOString(); const supabase = getServiceSupabase();
  const { data: run } = await supabase.from("run_logs").insert({ status: "running", scanned_sources: 0 }).select("id").single();
  let fetched = 0, filtered = 0, inserted = 0, updated = 0, pendingReview = 0, failed = 0; const errors: string[] = []; const records: RunSummary["records"] = []; const sources: RunSummary["sources"] = [];
  for (const source of officialSourceAdapters.filter(s=>s.enabled)) {
    try { await supabase.from("data_sources").upsert({ agency_name: source.agencyName, homepage: source.homepage, crawl_entry: source.crawlEntry, crawl_method: source.kind, enabled: true, updated_at: new Date().toISOString() }, { onConflict: "agency_name" });
      const rawCandidates = await withRetry(() => source.fetchCandidates(), 2); const candidates = rawCandidates.map(normalizeCandidateCountry).filter((c) => !resolveCountry(c.country, c.titleEn).isChina).filter(isAllowedCandidate); const sourceSummary = { key: source.key, agencyName: source.agencyName, fetched: rawCandidates.length, filtered: rawCandidates.length - candidates.length, inserted: 0, updated: 0, pendingReview: 0, failed: 0 }; fetched += rawCandidates.length; filtered += sourceSummary.filtered;
      for (const c of candidates) { try { const saved = await saveCandidate(c); inserted += saved.inserted; updated += saved.updated; pendingReview += saved.pendingReview; sourceSummary.inserted += saved.inserted; sourceSummary.updated += saved.updated; sourceSummary.pendingReview += saved.pendingReview; records.push({ id: saved.id, title: c.titleEn, gate: saved.gate, officialUrl: c.officialUrl }); } catch (e) { failed += 1; sourceSummary.failed += 1; const message = `${source.agencyName} 保存失败 ${c.titleEn}: ${formatUnknownError(e)}`; errors.push(message); await supabase.from("error_logs").insert({ source_key: source.key, message }); } } sources.push(sourceSummary);
      await supabase.from("data_sources").update({ last_success_at: new Date().toISOString(), consecutive_failures: 0, fetched_count: rawCandidates.length, inserted_count: sourceSummary.inserted }).eq("agency_name", source.agencyName);
    } catch (e) { const message = `${source.agencyName}: ${formatUnknownError(e)}`; errors.push(message); sources.push({ key: source.key, agencyName: source.agencyName, fetched: 0, filtered: 0, inserted: 0, updated: 0, pendingReview: 0, failed: 0, error: message }); await supabase.from("error_logs").insert({ source_key: source.key, message }); await supabase.from("data_sources").update({ last_failure_at: new Date().toISOString() }).eq("agency_name", source.agencyName); }
  }
  const finishedAt = new Date().toISOString(); await supabase.from("run_logs").update({ finished_at: finishedAt, status: errors.length ? "partial_failed" : "success", scanned_sources: officialSourceAdapters.length, fetched_count: fetched, success_count: inserted + updated, new_count: inserted, error: errors.join("\n") || null }).eq("id", run?.id);
  return { startedAt, finishedAt, scannedSources: officialSourceAdapters.filter(s=>s.enabled).length, fetched, filtered, inserted, updated, pendingReview, failed, errors, sources, records };
}

function isAllowedCandidate(c: ProjectCandidate) { const text = `${c.titleEn} ${c.procurementMethod ?? ""} ${c.stage ?? ""} ${c.noticeText ?? ""}`; if (!c.officialUrl || !/^https:\/\//.test(c.officialUrl)) return false; if (CLOSED.test(text) || LOCAL_ONLY.test(text)) return false; if (c.deadlineAt && new Date(c.deadlineAt).getTime() <= Date.now()) return false; return c.section === "pipeline" || isEngineeringProcurement({ procurementType: c.procurementMethod, stage: c.stage, title: c.titleEn, noticeText: c.noticeText }); }
async function saveCandidate(c: ProjectCandidate) { const country = resolveCountry(c.country, c.titleEn); if (country.isChina) throw new Error("安全拦截：中国项目禁止写入 Supabase"); const supabase = getServiceSupabase(); const linkOk = await checkOfficialDetailLink(c.officialUrl); const ai = await analyzeProject(c); const amountUsd = normalizeAmount(c.amount, c.currency); const gateText = decideProjectGate({ isInternationalOpen: true, chinaEligible: country.recognized && ai.chinaParticipation === "可以参与" ? true : null, amountUsd, deadline: c.deadlineAt, officialLinkValid: linkOk, authentic: true, procurementType: c.procurementMethod, stage: c.stage, title: c.titleEn, noticeText: c.noticeText, country: country.country }); const gate = !country.recognized ? "pending_review" : gateText === "正式项目库" ? "official" : gateText === "禁止推送" ? "blocked" : "pending_review"; const key = buildSourceKey(c);
  const payload = {
    section: c.section,
    gate,
    title_zh: requiredText(ai.titleZh, c.titleEn),
    title_en: requiredText(c.titleEn, "待人工核实"),
    country: country.country,
    financier: requiredText(c.financier, "待人工核实"),
    owner: nullableText(c.owner),
    procurement_no: nullableText(c.procurementNo),
    package_no: nullableText(c.packageNo),
    amount_usd: amountUsd,
    amount_currency: c.currency?.toUpperCase() || "USD",
    amount_is_official: amountUsd !== null,
    deadline_at: nullableIsoDate(c.deadlineAt),
    published_at: nullableIsoDate(c.publishedAt),
    procurement_method: nullableText(c.procurementMethod),
    stage: nullableText(c.stage),
    status: gate === "blocked" ? "待人工核实" : "未截止",
    china_eligible: ai.chinaParticipation === "可以参与" ? true : ai.chinaParticipation === "不可参与" ? false : null,
    joint_venture_requirements: requiredText(ai.jointVentureRequirement, "待人工核实"),
    local_registration_requirements: requiredText(ai.localRegistrationRequirement, "待人工核实"),
    qualification_requirements_zh: requiredText(ai.qualificationRequirementsZh, "待人工核实"),
    scope_zh: requiredText(ai.scopeZh, "待人工核实"),
    summary_zh: requiredText(ai.summaryZh, "待人工核实"),
    risks_zh: Array.isArray(ai.riskTipsZh) ? ai.riskTipsZh.map(String) : [],
    ai_score: boundedInt(ai.score, 0, 100, 45),
    credibility: boundedInt(ai.credibility, 0, 100, 40),
    ai_analyzed_at: ai.aiAnalysisStatus === "success" ? new Date().toISOString() : null,
    ai_analysis_status: ai.aiAnalysisStatus,
    translation_status: ai.translationStatus,
    source_unique_key: key,
    review_status: gate === "official" ? "approved" : "pending",
  };
  const existed = await supabase.from("projects").select("id").eq("source_unique_key", key).maybeSingle();
  if (existed.error) throw new Error(`Supabase projects 查重失败: ${formatSupabaseError(existed.error)}`);
  const { data, error } = await supabase.from("projects").upsert(payload, { onConflict: "source_unique_key" }).select("id").single();
  if (error) throw new Error(`Supabase projects 写入失败: ${formatSupabaseError(error)}; payload=${JSON.stringify(payload)}`);
  const linkPayload = { project_id: data.id, link_type: "官方公告详情页", url: c.officialUrl, is_official: true, http_status: linkOk ? 200 : 0, is_pdf: false, last_checked_at: new Date().toISOString() };
  const linkResult = await supabase.from("project_links").upsert(linkPayload, { onConflict: "project_id,url" });
  if (linkResult.error) throw new Error(`Supabase project_links 写入失败: ${formatSupabaseError(linkResult.error)}; payload=${JSON.stringify(linkPayload)}`);
  const historyResult = await supabase.from("project_status_history").insert({ project_id: data.id, status: payload.status, gate });
  if (historyResult.error) throw new Error(`Supabase project_status_history 写入失败: ${formatSupabaseError(historyResult.error)}`);
  return { id: data.id, gate, inserted: existed.data ? 0 : 1, updated: existed.data ? 1 : 0, pendingReview: gate === "pending_review" ? 1 : 0 };
}
async function checkOfficialDetailLink(url: string) { try { const parsed = new URL(url); if (parsed.protocol !== "https:" || /\/($|search|tenders$|procurement$)/i.test(parsed.pathname)) return false; const controller = new AbortController(); const timeout = setTimeout(() => controller.abort(), 15_000); try { let res = await fetch(url, { method: "HEAD", signal: controller.signal }); if (res.status === 405) res = await fetch(url, { method: "GET", signal: controller.signal }); return res.ok; } finally { clearTimeout(timeout); } } catch { return false; } }
async function withRetry<T>(fn: () => Promise<T>, attempts: number): Promise<T> { let last: unknown; for (let i=0;i<attempts;i++) { try { return await fn(); } catch (e) { last=e; await new Promise(r=>setTimeout(r, 500*(i+1))); } } throw last; }
function normalizeAmount(amount?: string, currency = "USD") { if (!amount) return null; const n = Number(amount.replace(/[^0-9.]/g, "")); if (!Number.isFinite(n) || n <= 0) return null; return n; }

function buildSourceKey(c: ProjectCandidate) { return `${c.sourceKey}:${c.procurementNo || c.officialUrl}`.slice(0, 500); }
function normalizeCandidateCountry(c: ProjectCandidate): ProjectCandidate { return { ...c, country: resolveCountry(c.country, c.titleEn).country }; }
function requiredText(value: unknown, fallback: string) { const normalized = nullableText(value); return normalized ?? fallback; }
function nullableText(value: unknown) { const normalized = String(value ?? "").replace(/\s+/g, " ").trim(); return normalized || null; }
function nullableIsoDate(value: unknown) { const text = nullableText(value); if (!text) return null; const time = Date.parse(text); return Number.isFinite(time) ? new Date(time).toISOString() : null; }
function boundedInt(value: unknown, min: number, max: number, fallback: number) { const n = Math.round(Number(value)); return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback; }
