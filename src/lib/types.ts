export type ProcurementSection = "prequalification" | "tender" | "pipeline";
export type ProjectStatus = "未截止" | "延期" | "补遗" | "澄清" | "已授标" | "已取消" | "待人工核实";
export type ParticipationStatus = "可以参与" | "不可参与" | "待人工核实";

export type OfficialLink = {
  label: string;
  url: string;
  type:
    | "官方公告详情页"
    | "官方PDF"
    | "官方招标文件"
    | "官方资格预审文件"
    | "官方补遗"
    | "官方澄清"
    | "官方采购计划"
    | "官方GPN"
    | "官方业主公告";
  isOfficial: boolean;
  isValid: boolean;
  isPdf?: boolean;
};

export type TenderProject = {
  id: string;
  section: ProcurementSection;
  titleZh: string;
  titleEn: string;
  country: string;
  region: string;
  industry: string;
  owner: string;
  financier: string;
  procurementNo?: string;
  contractNo?: string;
  packageNo?: string;
  totalInvestmentUsd?: number;
  amountUsd?: number;
  amountSource: "官方金额" | "AI估算" | "待人工核实";
  bidSecurity?: string;
  tenderFee?: string;
  publishedAt?: string;
  deadlineAt?: string;
  openingAt?: string;
  procurementMethod: string;
  stage: string;
  jointVentureRequirement: string;
  localRegistrationRequirement: string;
  chinaParticipation: ParticipationStatus;
  qualificationRequirementsZh: string;
  scopeZh: string;
  summaryZh: string;
  riskTipsZh: string[];
  score: number;
  stars: string;
  credibility: number;
  aiUpdatedAt: string;
  status: ProjectStatus;
  links: OfficialLink[];
  addendaCount: number;
  clarificationCount: number;
  expectedTenderTime?: string;
  knownConsultant?: string;
  knownDesigner?: string;
  knownContractor?: string;
};

export type DashboardMetric = {
  label: string;
  value: string | number;
  tone?: "normal" | "success" | "warning" | "danger";
};
