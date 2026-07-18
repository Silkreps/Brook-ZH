import Link from "next/link";
import { reviewProject } from "@/app/admin/admin-actions";
import { isAdminSession } from "@/lib/admin-auth";
import { getPendingReviewProjects } from "@/lib/projects";

export default async function PendingReviewPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const { page } = await searchParams;
  const result = await getPendingReviewProjects({ page: page ? Number(page) : 1 });
  const admin = await isAdminSession();
  return <main className="shell">
    <Link href="/">← 返回仪表盘</Link>
    <div className="list-heading"><div><p className="eyebrow">实时读取 Supabase</p><h1>待人工核实</h1><p>这里仅显示 review_status=pending 且 gate=pending_review 的真实项目；审核通过后进入对应的正式项目列表。</p></div><strong className="count">{result.total} 个项目</strong></div>
    {!admin && <div className="card review-notice">执行批准或驳回前需要<Link href="/admin/login">登录管理员账号</Link>。</div>}
    <div className="project-list">{result.rows.length === 0 ? <div className="card empty">暂无待人工核实项目</div> : result.rows.map((project) => <article className="card project-card" key={project.id}>
      <div className="project-title"><div><h2><Link href={`/projects/${project.section}/${project.id}`}>{project.titleZh}</Link></h2><span className="status urgent">待人工核实</span></div></div>
      <dl className="project-facts"><div><dt>国家</dt><dd>{project.country}</dd></div><div><dt>项目编号</dt><dd>{project.procurementNo ?? "官方未公布"}</dd></div><div><dt>原始名称</dt><dd>{project.titleEn}</dd></div><div><dt>截止日期</dt><dd>{project.deadlineAt ? new Date(project.deadlineAt).toLocaleDateString("zh-CN") : "官方未公布"}</dd></div></dl>
      <div className="card-actions review-actions">
        <form action={reviewProject}><input type="hidden" name="id" value={project.id}/><input type="hidden" name="decision" value="rejected"/><button className="review-button reject">驳回</button></form>
        <form action={reviewProject}><input type="hidden" name="id" value={project.id}/><input type="hidden" name="decision" value="approved"/><button className="review-button approve">批准</button></form>
      </div>
    </article>)}</div>
    <nav className="pager">{result.page > 1 && <Link href={`?page=${result.page - 1}`}>上一页</Link>}<span>第 {result.page} 页</span>{result.total > result.page * result.pageSize && <Link href={`?page=${result.page + 1}`}>下一页</Link>}</nav>
  </main>;
}
