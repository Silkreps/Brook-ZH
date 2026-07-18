const UNKNOWN_COUNTRY = "国家未识别";

const COUNTRY_ALIASES: ReadonlyArray<readonly [string, readonly string[]]> = [
  ["中国", ["china", "people's republic of china", "pr china", "prc", "cn", "chn", "中国"]],
  ["阿根廷", ["argentina", "argentine republic", "ar", "arg"]],
  ["墨西哥", ["mexico", "united mexican states", "mx", "mex"]],
  ["土耳其", ["turkey", "türkiye", "turkiye", "tr", "tur"]],
  ["印度", ["india", "in", "ind"]], ["印度尼西亚", ["indonesia", "id", "idn"]],
  ["孟加拉国", ["bangladesh", "bd", "bgd"]], ["巴基斯坦", ["pakistan", "pk", "pak"]],
  ["越南", ["vietnam", "viet nam", "vn", "vnm"]], ["菲律宾", ["philippines", "ph", "phl"]],
  ["蒙古", ["mongolia", "mn", "mng"]], ["哈萨克斯坦", ["kazakhstan", "kz", "kaz"]],
  ["乌兹别克斯坦", ["uzbekistan", "uz", "uzb"]], ["格鲁吉亚", ["georgia", "ge", "geo"]],
  ["埃及", ["egypt", "eg", "egy"]], ["尼日利亚", ["nigeria", "ng", "nga"]],
  ["肯尼亚", ["kenya", "ke", "ken"]], ["坦桑尼亚", ["tanzania", "tz", "tza"]],
  ["埃塞俄比亚", ["ethiopia", "et", "eth"]], ["南非", ["south africa", "za", "zaf"]],
  ["摩洛哥", ["morocco", "ma", "mar"]], ["突尼斯", ["tunisia", "tn", "tun"]],
  ["巴西", ["brazil", "br", "bra"]], ["哥伦比亚", ["colombia", "co", "col"]],
  ["秘鲁", ["peru", "pe", "per"]], ["智利", ["chile", "cl", "chl"]],
  ["厄瓜多尔", ["ecuador", "ec", "ecu"]], ["玻利维亚", ["bolivia", "bo", "bol"]],
  ["巴拉圭", ["paraguay", "py", "pry"]], ["乌拉圭", ["uruguay", "uy", "ury"]],
  ["多米尼加共和国", ["dominican republic", "do", "dom"]], ["牙买加", ["jamaica", "jm", "jam"]],
  ["乌克兰", ["ukraine", "ua", "ukr"]], ["罗马尼亚", ["romania", "ro", "rou"]],
  ["塞尔维亚", ["serbia", "rs", "srb"]], ["阿尔巴尼亚", ["albania", "al", "alb"]],
  ["约旦", ["jordan", "jo", "jor"]], ["伊拉克", ["iraq", "iq", "irq"]],
  ["沙特阿拉伯", ["saudi arabia", "saudi", "sa", "sau"]], ["阿联酋", ["united arab emirates", "uae", "ae", "are"]],
  ["尼泊尔", ["nepal", "np", "npl"]], ["斯里兰卡", ["sri lanka", "lk", "lka"]],
];

const CHINA_LOCATIONS = /\b(?:heilongjiang|beijing|shanghai|tianjin|chongqing|hebei|henan|shandong|shanxi|shaanxi|liaoning|jilin|jiangsu|zhejiang|anhui|fujian|jiangxi|hubei|hunan|guangdong|hainan|sichuan|guizhou|yunnan|gansu|qinghai|taiwan|inner mongolia|guangxi|tibet|xinjiang|ningxia|hong kong|macao|macau)\b|(?:黑龙江|北京|上海|天津|重庆|河北|河南|山东|山西|陕西|辽宁|吉林|江苏|浙江|安徽|福建|江西|湖北|湖南|广东|海南|四川|贵州|云南|甘肃|青海|台湾|内蒙古|广西|西藏|新疆|宁夏|香港|澳门)/i;

export type CountryResolution = { country: string; recognized: boolean; isChina: boolean; evidence: "structured" | "title" | "unknown" };

function aliasMatch(value: string) {
  const normalized = value.normalize("NFKC").toLowerCase().trim();
  for (const [country, aliases] of COUNTRY_ALIASES) {
    if (aliases.some((alias) => normalized === alias || (alias.length > 3 && new RegExp(`(^|[^\\p{L}])${escapeRegExp(alias)}([^\\p{L}]|$)`, "iu").test(normalized)))) return country;
  }
  return undefined;
}

function escapeRegExp(value: string) { return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); }

/** Structured official data is authoritative; titles are only a fallback. */
export function resolveCountry(structuredCountry?: string | null, title?: string | null): CountryResolution {
  const structured = String(structuredCountry ?? "").trim();
  if (structured) {
    const country = aliasMatch(structured);
    if (country) return { country, recognized: true, isChina: country === "中国", evidence: "structured" };
    if (CHINA_LOCATIONS.test(structured)) return { country: "中国", recognized: true, isChina: true, evidence: "structured" };
  }
  const fallback = String(title ?? "").trim();
  const country = aliasMatch(fallback);
  if (country) return { country, recognized: true, isChina: country === "中国", evidence: "title" };
  if (CHINA_LOCATIONS.test(fallback)) return { country: "中国", recognized: true, isChina: true, evidence: "title" };
  return { country: UNKNOWN_COUNTRY, recognized: false, isChina: false, evidence: "unknown" };
}

export function isChinaCountry(country?: string | null, title?: string | null) { return resolveCountry(country, title).isChina; }
/** Shared fail-closed visibility rule for both official and review lists. */
export function canAppearInProjectLists(country?: string | null, title?: string | null) { return !isChinaCountry(country, title); }
export { UNKNOWN_COUNTRY };
