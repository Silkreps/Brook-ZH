import Link from "next/link";
import { notFound } from "next/navigation";
import { getProjectsBySection, sectionLabels } from "@/lib/projects";
import type { ProcurementSection } from "@/lib/types";

const columns: Record<ProcurementSection, string[]> = {
  prequalification: ["中文项目名称", "英文项目名称", "国家", "行业", "业主", "融资机构", "采购编号", "金额", "截止日期", "联合体要求", "本地注册要求", "中国企业", "可信度", "当前状态"],
  tender: ["中文项目名称", "英文项目名称", "国家", "行业", "项目编号", "合同包", "金额", "投标保证金", "标书费用", "截止日期", "开标时间", "采购方式", "可信度", "当前状态"],
  pipeline: ["中文名称", "英文名称", "国家", "行业", "项目总投资", "预计合同金额", "业主", "融资来源", "当前阶段", "预计招标时间", "中国企业参与可能", "可信度"],
};

export default function SectionPage({ params }: { params: { section: ProcurementSection } }) {
  if (!sectionLabels[params.section]) notFound();
  const projects = getProjectsBySection(params.section);

  return (
    <main className="shell">
      <Link href="/">← 返回仪表盘</Link>
      <h1>{sectionLabels[params.section]}</h1>
      <p>本板块仅展示已通过官方链接保存、去重、中文翻译、AI 可信度评估后的项目；无法确认的项目进入待人工核实。</p>
      <div className="wide-table">
        <table className="table compact">
          <thead><tr>{columns[params.section].map((column) => <th key={column}>{column}</th>)}</tr></thead>
          <tbody>
            {projects.map((project) => (
              <tr key={project.id}>
                <td><Link href={`/projects/${project.section}/${project.id}`}>{project.titleZh}</Link></td>
                <td>{project.titleEn}</td>
                <td>{project.country}</td>
                <td>{project.industry}</td>
                {params.section === "prequalification" && <>
                  <td>{project.owner}</td><td>{project.financier}</td><td>{project.procurementNo}</td><td>{formatMoney(project.amountUsd, project.amountSource)}</td><td>{project.deadlineAt}</td><td>{project.jointVentureRequirement}</td><td>{project.localRegistrationRequirement}</td><td>{project.chinaParticipation}</td><td>{project.credibility}%</td><td>{project.status}</td>
                </>}
                {params.section === "tender" && <>
                  <td>{project.procurementNo}</td><td>{project.packageNo}</td><td>{formatMoney(project.amountUsd, project.amountSource)}</td><td>{project.bidSecurity}</td><td>{project.tenderFee}</td><td>{project.deadlineAt}</td><td>{project.openingAt}</td><td>{project.procurementMethod}</td><td>{project.credibility}%</td><td>{project.status}</td>
                </>}
                {params.section === "pipeline" && <>
                  <td>{formatMoney(project.totalInvestmentUsd, "官方金额")}</td><td>{formatMoney(project.amountUsd, project.amountSource)}</td><td>{project.owner}</td><td>{project.financier}</td><td>{project.stage}</td><td>{project.expectedTenderTime}</td><td>{project.chinaParticipation}</td><td>{project.credibility}%</td>
                </>}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}

function formatMoney(value: number | undefined, source: string) {
  if (!value) return "待人工核实";
  return `$${(value / 1_000_000).toFixed(0)}M（${source}）`;
}
