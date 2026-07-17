import Link from "next/link";
import { redirect } from "next/navigation";
import { adminConfigStatus, isAdminSession } from "@/lib/admin-auth";
import { amountThresholdsUsd, defaultRunTimesLondon } from "@/lib/config";
import { officialSourceAdapters } from "@/lib/official-sources";
import { adminModules } from "@/lib/admin-modules";

export default async function AdminPage(){
  if(!(await isAdminSession())) redirect("/admin/login");
  const status=adminConfigStatus();
  return <main className="shell"><h1>后台管理</h1><p>服务端密钥仅在服务端读取，不会暴露到浏览器端。未配置的通知或 AI 能力会安全跳过并显示“未配置”。</p><section className="grid">{Object.entries(status).map(([k,v])=><div className={`card ${v?"success":"warning"}`} key={k}><span>{k}</span><strong>{v?"已配置":"未配置"}</strong></div>)}</section><div className="grid">{adminModules.map((x)=><Link className="card admin-module" href={`/admin/${x.slug}`} key={x.slug}><strong>{x.label}</strong><span>{x.desc}</span></Link>)}</div><section className="card"><h2>真实官方数据源</h2><ul>{officialSourceAdapters.map(s=><li key={s.key}><strong>{s.agencyName}</strong>：{s.crawlEntry}；状态：{s.enabled?"启用":"停用"}；类型：{s.kind}</li>)}</ul><p>ADB、AfDB、IsDB、EBRD 采用可配置官方 JSON/API 入口；未配置时记录失败并显示“未配置”，不会伪造抓取成功或生成虚假项目。</p></section><p>默认运行时间（英国）：{defaultRunTimesLondon.join("、")}；金额门槛：{amountThresholdsUsd.map(v=>`$${v/1_000_000}M`).join("、")}，加勒比地区自动按 $4M 执行。</p></main>
}
