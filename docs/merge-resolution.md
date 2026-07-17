# PR 合并冲突处理记录

本记录用于说明当前分支在合并前的冲突处理与功能保留情况。

## 当前仓库状态

- 当前分支：`work`。
- 本地仓库未配置 `origin` 远程地址，也不存在本地 `main` 分支，因此无法在容器内执行真实的 `git merge main`。
- 已执行 `git merge main`，Git 返回 `main - not something we can merge`，说明当前环境没有可合并的 main 引用。
- 已执行冲突标记扫描，未发现 `<<<<<<<`、`=======`、`>>>>>>>` 等未解决冲突标记。

## 已保留功能

### 第一部分
- Next.js 中文后台与仪表盘。
- Supabase 数据库结构。
- 管理员后台入口。
- 三大板块基础结构。
- 云端 Cron / n8n 调度入口。
- Telegram 与邮件推送接口。
- 国际公开采购、中国企业参与资格、金额门槛、官方链接、真实性等准入规则。

### 第二部分
- 首页 18 个仪表盘指标。
- 资格预审、正式招标、前瞻项目三大板块页面。
- 项目详情页完整字段展示。
- 官方链接类型管理。
- AI 评分、五星展示与风险提示。
- 日报与截止提醒辅助逻辑。
- Supabase 提醒规则与项目事件历史表。

## 合并前检查命令

```bash
git status --short
node scripts/check-conflicts.mjs
python3 -m json.tool package.json >/dev/null
python3 -m json.tool n8n/global-tender-alert.workflow.json >/dev/null
```
