export const procurementSections = [
  { key: "prequalification", label: "资格预审", terms: ["Prequalification", "PQ", "Invitation for Prequalification", "Request for Prequalification", "PPP资格预审"] },
  { key: "tender", label: "正式招标", terms: ["Invitation for Bids", "Invitation for Tender", "Request for Bids", "ICB", "EPC", "Civil Works", "Design and Build"] },
  { key: "pipeline", label: "前瞻项目", terms: ["General Procurement Notice", "GPN", "Advance Procurement Notice", "Project Pipeline", "Procurement Plan", "PPP Pipeline"] },
] as const;

export const monitoredRegions = [
  { region: "东南亚", countries: ["越南", "印度尼西亚", "马来西亚", "泰国", "菲律宾", "新加坡", "柬埔寨", "东帝汶", "老挝", "缅甸", "文莱"] },
  { region: "中亚", countries: ["哈萨克斯坦", "吉尔吉斯斯坦", "乌兹别克斯坦", "蒙古国"] },
  { region: "南亚", countries: ["斯里兰卡", "马尔代夫"] },
  { region: "非洲", countries: ["几内亚", "阿尔及利亚", "摩洛哥", "赞比亚", "坦桑尼亚", "刚果民主共和国"] },
  { region: "拉丁美洲", countries: ["巴西", "阿根廷", "智利", "哥伦比亚", "秘鲁", "厄瓜多尔", "玻利维亚", "巴拿马", "乌拉圭", "巴拉圭", "哥斯达黎加", "危地马拉", "洪都拉斯", "尼加拉瓜", "萨尔瓦多"] },
  { region: "加勒比", countries: ["牙买加", "圭亚那", "巴哈马", "巴巴多斯", "特立尼达和多巴哥", "伯利兹", "苏里南", "多米尼加共和国"] },
  { region: "南太平洋", countries: ["斐济", "巴布亚新几内亚", "所罗门群岛", "瓦努阿图", "萨摩亚", "汤加", "库克群岛", "图瓦卢", "基里巴斯", "纽埃"] },
];

export const financingInstitutions = ["世界银行", "亚洲开发银行", "非洲开发银行", "伊斯兰开发银行", "亚洲基础设施投资银行", "欧洲复兴开发银行", "欧洲投资银行", "CAF", "Inter American Development Bank", "Caribbean Development Bank", "UNOPS", "UNDP", "UNGM", "JICA", "KfW", "KOICA", "FCDO", "DFAT", "MCC", "USAID"];
