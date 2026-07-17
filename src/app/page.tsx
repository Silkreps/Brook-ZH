import Link from "next/link";
import { defaultRunTimesLondon } from "@/lib/config";
import { dashboardMetrics, demoProjects, sectionLabels } from "@/lib/projects";
import { financingInstitutions, monitoredRegions } from "@/lib/taxonomy";

export default function Home() {
  const metrics = dashboardMetrics();
  const topProjects = [...demoProjects].sort((a, b) => b.score - a.score).slice(0, 5);

  return (
    <main className="shell">
      <div className="hero">
        <div>
          <p className="eyebrow">内部管理员系统</p>
          <h1>全球国际工程招标预警系统</h1>
          <p>默认中文展示，按英国时间 {defaultRunTimesLondon.join("、")} 自动扫描、AI 核验、去重、翻译和推送。</p>
        </div>
        <Link className="button" href="/admin">进入后台管理</Link>
      </div>

      <section className="grid metrics" aria-label="首页仪表盘指标">
        {metrics.map((metric) => (
          <article className={`card ${metric.tone ?? "normal"}`} key={metric.label}>
            <span>{metric.label}</span>
            <strong>{metric.value}</strong>
          </article>
        ))}
      </section>

      <section className="section-nav">
        <Link href="/projects/prequalification">资格预审</Link>
        <Link href="/projects/tender">正式招标</Link>
        <Link href="/projects/pipeline">前瞻项目</Link>
      </section>

      <section className="card">
        <h2>AI 重点推荐项目</h2>
        <table className="table">
          <thead>
            <tr>
              <th>评分</th>
              <th>板块</th>
              <th>中文项目名称</th>
              <th>国家</th>
              <th>金额</th>
              <th>状态</th>
              <th>中国企业</th>
            </tr>
          </thead>
          <tbody>
            {topProjects.map((project) => (
              <tr key={project.id}>
                <td>{project.stars}</td>
                <td>{sectionLabels[project.section]}</td>
                <td><Link href={`/projects/${project.section}/${project.id}`}>{project.titleZh}</Link></td>
                <td>{project.country}</td>
                <td>{project.amountUsd ? `$${(project.amountUsd / 1_000_000).toFixed(0)}M` : "待核实"}</td>
                <td>{project.status}</td>
                <td>{project.chinaParticipation}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="grid">
        <div className="card"><h2>监控区域</h2><p>{monitoredRegions.map((item) => `${item.region}（${item.countries.length}国）`).join("、")}</p></div>
        <div className="card"><h2>重点融资机构</h2><p>{financingInstitutions.join("、")}</p></div>
      </section>
    </main>
  );
}
