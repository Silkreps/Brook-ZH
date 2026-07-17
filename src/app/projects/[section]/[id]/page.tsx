import Link from "next/link";
import { notFound } from "next/navigation";
import { getProjectById, sectionLabels } from "@/lib/projects";
import type { ProcurementSection } from "@/lib/types";

export default function ProjectDetailPage({ params }: { params: { section: ProcurementSection; id: string } }) {
  const project = getProjectById(params.id);
  if (!project || project.section !== params.section) notFound();

  const fields = [
    ["中文项目名称", project.titleZh], ["英文项目名称", project.titleEn], ["国家", project.country], ["区域", project.region], ["行业", project.industry],
    ["项目编号", project.procurementNo ?? "待人工核实"], ["合同包编号", project.packageNo ?? project.contractNo ?? "待人工核实"],
    ["项目总投资", project.totalInvestmentUsd ? money(project.totalInvestmentUsd) : "待人工核实"], ["合同包金额", project.amountUsd ? money(project.amountUsd) : "待人工核实"],
    ["金额来源", project.amountSource], ["采购阶段", project.stage], ["业主", project.owner], ["融资机构", project.financier],
    ["联合体要求", project.jointVentureRequirement], ["本地注册要求", project.localRegistrationRequirement], ["投标保证金", project.bidSecurity ?? "不适用/待核实"],
    ["标书费用", project.tenderFee ?? "不适用/待核实"], ["发布时间", project.publishedAt ?? "待人工核实"], ["截止日期", project.deadlineAt ?? "待人工核实"],
    ["开标时间", project.openingAt ?? "不适用/待核实"], ["当前状态", project.status], ["中国企业是否可以参与", project.chinaParticipation],
    ["AI评分", `${project.score}/100 ${project.stars}`], ["可信度", `${project.credibility}%`], ["AI更新时间", project.aiUpdatedAt],
  ];

  return (
    <main className="shell">
      <Link href={`/projects/${project.section}`}>← 返回{sectionLabels[project.section]}</Link>
      <article className="detail">
        <header className="card">
          <p className="eyebrow">{sectionLabels[project.section]}</p>
          <h1>{project.titleZh}</h1>
          <p>{project.summaryZh}</p>
          <div className="badges"><span>{project.stars}</span><span>{project.status}</span><span>{project.chinaParticipation}</span></div>
        </header>

        <section className="card"><h2>项目详情</h2><dl className="definition-grid">{fields.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl></section>
        <section className="card"><h2>工程范围（中文）</h2><p>{project.scopeZh}</p></section>
        <section className="card"><h2>主要资格要求（中文）</h2><p>{project.qualificationRequirementsZh}</p></section>
        <section className="card"><h2>AI风险提示</h2><ul>{project.riskTipsZh.map((risk) => <li key={risk}>{risk}</li>)}</ul></section>
        <section className="card"><h2>官方链接</h2><table className="table compact"><thead><tr><th>类型</th><th>名称</th><th>状态</th><th>链接</th></tr></thead><tbody>{project.links.map((link) => <tr key={link.url}><td>{link.type}</td><td>{link.label}</td><td>{link.isOfficial && link.isValid ? "官方有效" : "待重新核验"}</td><td><a href={link.url}>{link.url}</a></td></tr>)}</tbody></table></section>
      </article>
    </main>
  );
}

function money(value: number) {
  return `$${(value / 1_000_000).toFixed(0)}M`;
}
