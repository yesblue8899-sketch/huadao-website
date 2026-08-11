# 拉美市场情报中心 V1 内容维护说明

本项目不使用后台管理系统，不接入新闻 API，不做自动抓取。当前阶段以静态 SEO 页面 + Cloudflare D1 内容表 + `/api/insights` 预留接口作为基础，适合 Cloudflare Pages 直接部署。

## 内容中心定位

`/insights/` 是“拉美市场情报中心”，不是普通企业新闻列表。内容应围绕墨西哥、巴西和拉美平台环境，为中国企业进入拉美提供决策参考。

首页固定模块：

- 今日热点
- 墨西哥市场观察
- 巴西市场观察
- 平台动态
- 企业出海观察
- 深度分析

## 新增一篇文章

1. 在 `insights/` 下新建目录，例如：
   - `insights/brazil-ecommerce-2026/`
   - `insights/mexico-platform-rules/`
2. 在目录内创建 `index.html`。
3. 页面必须包含：
   - 独立 `title`
   - `meta description`
   - `canonical`
   - 唯一 `h1`
   - 发布时间
   - 分类标签
   - 摘要
   - 相关指南
   - 底部 CTA 指向 `/assessment/`
4. 在 `insights/index.html` 对应分类下新增卡片。
5. 在 `sitemap.xml` 增加独立 URL。
6. 在 `data/market-insights.json` 增加结构化内容。
7. 在 `schema/market_insights.sql` 增加或更新对应 seed 记录，然后执行远端 D1 初始化。

## 文章固定结构

情报文章正文统一使用五段结构：

1. 一、事件背景
2. 二、为什么值得关注？
3. 三、对中国卖家的影响
4. 四、华道观察
5. 五、建议动作

“华道观察”必须体现行业判断，避免只复述事件。

## 推荐分类

- `platform`：平台动态
- `tax`：税务合规
- `business`：商业环境
- `logistics`：供应链与物流
- `brand`：品牌本地化

国家字段：

- `Mexico`
- `Brazil`
- `LATAM`

发布状态：

- `draft`
- `published`

## D1 数据表

表名：`market_insights`

字段：

- `id`
- `title`
- `slug`
- `country`
- `category`
- `tags`
- `summary`
- `content`
- `source`
- `publish_date`
- `update_date`
- `status`

当前与咨询线索系统共用 Cloudflare D1 数据库绑定，Functions 会优先读取 `INSIGHTS_DB`，未配置时回退到现有 `LEADS_DB`。

## API 预留

`GET /api/insights`

返回已发布情报，可选参数：

- `country=Mexico|Brazil|LATAM`
- `category=platform|tax|business|logistics|brand`
- `slug=article-slug`
- `limit=1-50`

`POST /api/insights`

为未来 AI 生成文章、新闻采集和人工发布预留。当前必须配置 `INSIGHTS_WRITE_TOKEN` 才允许写入，未配置时返回预留提示，避免公网直接写库。

## 内容原则

- 不写普通企业新闻。
- 不堆砌夸张数据。
- 重点输出市场变化、平台趋势、卖家机会、经营路径和合规提醒。
