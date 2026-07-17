import { amountThresholdsUsd, defaultRunTimesLondon } from "@/lib/config";
import { officialSourceAdapters } from "@/lib/official-sources";
const modules=["Dashboard","项目管理","收藏","重点项目","已联系业主","已购买标书","已报名资格预审","已投标","已放弃","已授标","项目完成","待人工核实","数据源管理","人工审核","重新抓取","链接检查","运行日志","错误日志","AI日志","推送日志","系统设置","管理员设置","金额门槛设置","国家管理","区域管理","行业管理","用户权限"];
export default function AdminPage(){return <main className="shell"><h1>后台管理</h1><div className="grid">{modules.map(x=><div className="card" key={x}>{x}</div>)}</div><section className="card"><h2>真实官方数据源</h2><ul>{officialSourceAdapters.map(s=><li key={s.key}>{s.agencyName}：{s.crawlEntry}</li>)}</ul></section><p>默认运行时间（英国）：{defaultRunTimesLondon.join("、")}；金额门槛：{amountThresholdsUsd.map(v=>`$${v/1_000_000}M`).join("、")}</p></main>}
