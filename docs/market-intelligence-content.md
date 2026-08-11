# 拉美市场情报内容维护说明

本项目不使用后台管理系统。新增内容时保持静态 SEO 页面结构，适合 Cloudflare Pages 直接部署。

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

## 推荐分类

- 巴西市场动态
- 墨西哥市场动态
- 平台观察
- 中国企业出海案例

## 内容原则

- 不写普通企业新闻。
- 不堆砌夸张数据。
- 重点输出市场变化、平台趋势、卖家机会、经营路径和合规提醒。
