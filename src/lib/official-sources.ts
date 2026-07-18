import type { ProjectCandidate, SourceAdapter } from "./types";
import { classifyProcurementSection } from "./rules";

const USER_AGENT = "Brook-ZH tender monitor (official-source crawler)";

type AnyRow = Record<string, any>;

async function fetchText(url: string, accept = "text/html,application/xhtml+xml,application/xml,text/xml,*/*") {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30_000);
  try {
    const res = await fetch(url, { headers: { accept, "user-agent": USER_AGENT }, signal: controller.signal, next: { revalidate: 0 } });
    if (!res.ok) throw new Error(`${url} ${res.status}`);
    return res.text();
  } finally { clearTimeout(timeout); }
}
async function fetchJson(url: string) { return JSON.parse(await fetchText(url, "application/json,text/plain,*/*")); }
function official(candidate: ProjectCandidate) { return candidate; }
function text(value: unknown) { return String(value ?? "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim(); }
function first(row: AnyRow, keys: string[]) { for (const key of keys) { const value = row[key]; if (value !== undefined && value !== null && String(value).trim()) return text(value); } return undefined; }
function absoluteUrl(url: string | undefined, base: string) { if (!url) return undefined; try { return new URL(url, base).toString(); } catch { return undefined; } }
function inferSection(row: AnyRow) { return classifyProcurementSection({ procurementType: first(row, ["procurementMethod", "procurement_method", "method", "category"]), stage: first(row, ["stage", "noticeType", "notice_type", "type"]), title: first(row, ["title", "notice_title"]), noticeText: first(row, ["noticeText", "description", "body", "summary"]) }) ?? "tender"; }
function genericCandidate(key: string, financier: string, row: AnyRow, base: string): ProjectCandidate | null {
  const officialUrl = absoluteUrl(first(row, ["officialUrl", "url", "link", "guid", "notice_url", "path"]), base);
  const titleEn = first(row, ["title", "titleEn", "notice_title", "name", "subject"]);
  if (!titleEn || !officialUrl) return null;
  return official({
    sourceKey: key, section: inferSection(row), titleEn, officialUrl,
    country: first(row, ["country", "country_name", "countryName", "country_code", "countryCode", "iso2", "iso3", "borrower_country"]),
    owner: first(row, ["owner", "borrower", "executing_agency", "agency"]), financier,
    procurementNo: first(row, ["procurementNo", "notice_number", "noticeid", "id", "nid", "reference", "ref"]),
    packageNo: first(row, ["packageNo", "package_no", "contract_no"]), amount: first(row, ["amount", "estimated_amount"]),
    currency: first(row, ["currency"]) || "USD", publishedAt: first(row, ["publishedAt", "publication_date", "published", "created"]),
    deadlineAt: first(row, ["deadlineAt", "deadline", "submission_deadline_date", "submission_deadline", "closing_date"]),
    procurementMethod: first(row, ["procurementMethod", "procurement_method", "method", "category"]),
    stage: first(row, ["stage", "noticeType", "notice_type", "type"]), documentUrl: first(row, ["documentUrl", "document_url"]),
    noticeText: first(row, ["noticeText", "description", "body", "summary"]),
  });
}
function parseRss(xml: string, sourceKey: string, financier: string, base: string) {
  return [...xml.matchAll(/<item[\s\S]*?<\/item>/gi)].map((m) => {
    const item = m[0];
    const pick = (tag: string) => text(item.match(new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tag}>`, "i"))?.[1]?.replace(/<!\[CDATA\[|\]\]>/g, ""));
    return genericCandidate(sourceKey, financier, { title: pick("title"), link: pick("link") || pick("guid"), guid: pick("guid"), published: pick("pubDate"), description: pick("description") }, base);
  }).filter(Boolean) as ProjectCandidate[];
}
async function fetchOfficialFeed(sourceKey: string, financier: string, urls: string[]) {
  const errors: string[] = [];
  for (const url of urls) {
    try {
      const body = await fetchText(url);
      const trimmed = body.trim();
      if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
        const data = JSON.parse(trimmed); const rows = Array.isArray(data) ? data : (data.items || data.results || data.data || data.nodes || []);
        const candidates = rows.map((r: AnyRow) => genericCandidate(sourceKey, financier, r, url)).filter(Boolean) as ProjectCandidate[];
        if (candidates.length) return candidates;
      }
      const rss = parseRss(body, sourceKey, financier, url); if (rss.length) return rss;
      const links = [...body.matchAll(/<a[^>]+href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)].map((m) => genericCandidate(sourceKey, financier, { link: m[1], title: m[2] }, url)).filter(Boolean) as ProjectCandidate[];
      if (links.length) return links.slice(0, 50);
      errors.push(`${url}: 未解析到公告条目`);
    } catch (e) { errors.push(`${url}: ${e instanceof Error ? e.message : String(e)}`); }
  }
  throw new Error(errors.join("; "));
}

async function fetchWorldBankCandidates() {
  const url = "https://search.worldbank.org/api/procnotices?format=json&rows=50&os=0&apilang=en";
  const data = await fetchJson(url);
  const container = data?.procnotices ?? data?.documents ?? data?.results ?? data;
  const rows = (Array.isArray(container) ? container : Object.values(container ?? {})).filter((row): row is AnyRow => Boolean(row) && typeof row === "object");
  return rows.map((r) => {
    const id = first(r, ["id", "noticeid", "notice_id", "guid", "notice_number"]);
    const detailUrl = absoluteUrl(first(r, ["url", "notice_url", "link"]), url) || (id ? `https://projects.worldbank.org/en/projects-operations/procurement-detail/${encodeURIComponent(id)}` : undefined);
    return genericCandidate("world-bank", "World Bank", { ...r, title: first(r, ["notice_title", "project_name", "bid_description", "title"]), url: detailUrl, country: first(r, ["country", "country_name", "country_code", "countrycode", "iso2", "iso3", "borrower_country"]), owner: first(r, ["borrower_country", "borrower", "agency"]), description: first(r, ["notice_text", "bid_description", "project_name"]), deadline: first(r, ["submission_deadline_date", "deadline_date"]), publishedAt: first(r, ["publication_date"]), procurementMethod: first(r, ["procurement_method", "procurement_category"]), noticeType: first(r, ["notice_type"]), procurementNo: id }, url);
  }).filter(Boolean) as ProjectCandidate[];
}

export const officialSourceAdapters: SourceAdapter[] = [
  { key: "world-bank", agencyName: "World Bank Procurement", homepage: "https://projects.worldbank.org/en/projects-operations/procurement", crawlEntry: "https://search.worldbank.org/api/procnotices", kind: "api", enabled: true, fetchCandidates: fetchWorldBankCandidates },
  { key: "adb", agencyName: "Asian Development Bank Business Opportunities", homepage: "https://www.adb.org/business/project-procurement", crawlEntry: "https://www.adb.org/business/project-procurement/rss", kind: "rss", enabled: process.env.SOURCE_ADB_ENABLED !== "false", fetchCandidates: () => fetchOfficialFeed("adb", "Asian Development Bank", [process.env.SOURCE_ADB_JSON_URL, process.env.SOURCE_ADB_RSS_URL, "https://www.adb.org/business/project-procurement/rss", "https://www.adb.org/projects/tenders/rss", "https://www.adb.org/business/project-procurement"].filter(Boolean) as string[]) },
  { key: "afdb", agencyName: "African Development Bank Procurement Notices", homepage: "https://www.afdb.org/en/projects-and-operations/procurement", crawlEntry: "https://www.afdb.org/en/documents/project-related-procurement/procurement-notices/specific-procurement-notices", kind: "html", enabled: process.env.SOURCE_AFDB_ENABLED !== "false", fetchCandidates: () => fetchOfficialFeed("afdb", "African Development Bank", [process.env.SOURCE_AFDB_JSON_URL, process.env.SOURCE_AFDB_RSS_URL, "https://www.afdb.org/en/documents/project-related-procurement/procurement-notices/specific-procurement-notices", "https://www.afdb.org/en/documents/category/specific-procurement-notices"].filter(Boolean) as string[]) },
  { key: "isdb", agencyName: "Islamic Development Bank Procurement", homepage: "https://www.isdb.org/project-procurement", crawlEntry: "https://www.isdb.org/project-procurement", kind: "html", enabled: process.env.SOURCE_ISDB_ENABLED !== "false", fetchCandidates: () => fetchOfficialFeed("isdb", "Islamic Development Bank", [process.env.SOURCE_ISDB_JSON_URL, process.env.SOURCE_ISDB_RSS_URL, "https://www.isdb.org/project-procurement"].filter(Boolean) as string[]) },
  { key: "ebrd", agencyName: "European Bank for Reconstruction and Development Client e-Procurement", homepage: "https://ecepp.ebrd.com/", crawlEntry: "https://ecepp.ebrd.com/delta/noticeSearchResults.html", kind: "html", enabled: process.env.SOURCE_EBRD_ENABLED !== "false", fetchCandidates: () => fetchOfficialFeed("ebrd", "European Bank for Reconstruction and Development", [process.env.SOURCE_EBRD_JSON_URL, process.env.SOURCE_EBRD_RSS_URL, "https://ecepp.ebrd.com/delta/noticeSearchResults.html", "https://ecepp.ebrd.com/latest-news/"].filter(Boolean) as string[]) },
];
