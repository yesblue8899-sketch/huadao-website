# Cloudflare Pages 咨询线索 API 配置

本项目的咨询表单通过 Cloudflare Pages Functions 提交到 `/api/leads`，并写入 D1 数据库绑定 `LEADS_DB`。

## 线上配置

1. 在 Cloudflare 控制台创建 D1 数据库，例如 `huadao_leads`。
2. 在 D1 控制台执行 `schema/leads.sql` 中的建表语句。
3. 进入 Pages 项目 `huadao-website` 的 Settings -> Functions -> D1 database bindings。
4. 添加绑定：
   - Variable name: `LEADS_DB`
   - D1 database: 选择刚创建的 `huadao_leads`
5. 重新部署 Pages 项目。

## 保存字段

- 提交时间 `submitted_at`
- 公司名称 `company`
- 联系人 `contact_name`
- 联系方式 `contact_method`
- 需求市场 `market`
- 当前阶段 `stage`
- 当前业务情况 `business_status`
- 来源渠道 `source_channel`
- 页面来源 `page_url`
- Referrer `referrer`
- User Agent `user_agent`
- IP `ip`
- 跟进状态 `status`

## 前端行为

- 表单提交不会打开邮箱客户端。
- 表单提交不会刷新页面。
- 成功后弹窗提示“提交成功，我们将在12小时内联系您。”
- 提交失败会在当前表单下方显示错误提示。
