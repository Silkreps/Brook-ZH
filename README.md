# 全球国际工程招标预警系统

生产级内部管理员系统，用于自动抓取多边开发银行和官方采购平台的国际公开工程招标、资格预审和前瞻项目，执行准入规则、去重、中文化、提醒和后台人工审核。系统不使用假项目填充页面。

## 已实现功能
- 中文首页仪表盘、三大项目板块、项目列表、项目详情、收藏/重点项目字段、已参与企业、完成后移除、运行日志、错误日志、数据源管理入口。
- 项目搜索、筛选、排序、分页：支持国家、地区、行业、采购阶段、金额、发布日期、截止日期、融资机构、中国企业可参与状态和项目状态。
- 官方链接有效性检查：列表“详情”按钮直达真实官方公告/采购包详情页；无效链接项目不会进入正式项目库。
- 统一抓取流程：World Bank API 已接入；ADB、AfDB、IsDB、EBRD 为可配置官方 JSON/API 适配器，未配置时记录“未配置”，不会伪造成功或虚假项目。
- 准入规则：仅保留国际公开工程招标/资格预审/前瞻项目；全球金额门槛 1000 万美元，加勒比地区 400 万美元；剔除已截止、已授标、已取消、仅限本国企业、监理咨询和非工程项目。
- 管理员登录与权限保护：`/admin` 需服务端 HttpOnly Cookie；服务密钥、OpenAI Key、Telegram Token、SMTP 密码仅在服务端环境变量读取。
- Telegram、电子邮件、每日汇总、截止提醒和抓取失败告警基础能力；未配置密钥时安全跳过并在后台显示“未配置”。
- Vercel Cron、失败重试、超时控制、去重、错误日志、运行日志、健康检查。
- Supabase 迁移脚本与 Vercel 配置。

## 仍需用户提供的密钥或账户
- `SUPABASE_URL`、`SUPABASE_SERVICE_ROLE_KEY`
- `CRON_SECRET`
- `ADMIN_PASSWORD`、`ADMIN_SESSION_TOKEN`（随机长字符串）
- 可选：`OPENAI_API_KEY`
- 可选：`TELEGRAM_BOT_TOKEN`、`TELEGRAM_CHAT_ID`
- 可选：`SMTP_URL`、`ALERT_EMAIL_TO`
- 可选数据源入口：`SOURCE_ADB_JSON_URL`、`SOURCE_AFDB_JSON_URL`、`SOURCE_ISDB_JSON_URL`、`SOURCE_EBRD_JSON_URL`；可用 `SOURCE_*_ENABLED=false` 暂停某源。

## 部署步骤
1. 在 Supabase SQL Editor 执行 `supabase/schema.sql`。
2. 在 Vercel 导入仓库并设置上述环境变量，不要提交任何真实密钥。
3. 部署后访问 `/api/health` 确认健康检查返回 `ok: true`。
4. Vercel Cron 已在 `vercel.json` 配置为 00:00、06:00、12:00、18:00 UTC 调用 `/api/cron/run`；外部调用需带 `x-cron-secret`。
5. 管理员访问 `/admin/login` 登录，进入 `/admin` 查看配置状态、数据源、日志和审核入口。

## 上线后的访问方式
- 首页：`https://你的域名/`
- 项目板块：`/projects/prequalification`、`/projects/tender`、`/projects/pipeline`
- 项目详情：列表内项目名称进入站内详情，列表“详情”按钮进入官方公告。
- 后台：`/admin/login` → `/admin`
- 健康检查：`/api/health`

## 尚未直接接入的平台
ADB、AfDB、IsDB、EBRD 的公开页面通常存在动态检索、登录或反爬限制。本系统已提供生产可配置适配器，需用户提供官方 JSON/API/RSS 入口或授权采购平台 API 后启用；未配置前不会写入项目，也不会报告虚假成功。
