# 华道出海 HUADAO OVERSEAS 官网

这是一个纯静态企业官网项目，可直接部署到 Cloudflare Pages。

## 文件结构

- `index.html`：官网首页、咨询转化入口与基础 SEO 结构
- `styles.css` / `styles.addon.css`：统一变量、PC 样式、移动端响应式样式和 SEO 落地页样式
- `script.js`：原生 JS 导航交互、拉美进入评估自测与在线咨询提交交互
- `functions/api/leads.js`：Cloudflare Pages Functions 线索提交 API
- `schema/leads.sql`：Cloudflare D1 线索表结构
- `docs/`：Cloudflare D1 绑定与内容维护说明
- `assets/images/`：生产图片资源
- `_headers`：Cloudflare Pages 缓存与安全响应头
- `robots.txt` / `sitemap.xml`：SEO 基础文件
- `_redirects`：SEO URL 301 跳转
- `assessment/`：拉美市场进入评估入口
- `solutions/`：解决方案体系
- `insights/`：拉美市场情报与 SEO 内容体系
- `mexico/`：墨西哥市场专题页
- `brazil/`：巴西市场专题页
- `mexico-company-registration/`：墨西哥公司注册 SEO 页面
- `mexico-rfc/`：墨西哥 RFC 税号申请 SEO 页面
- `mercado-libre-mexico-local/`：墨西哥美客多本土店 SEO 页面
- `tiktok-shop-mexico/`：TikTok Shop 墨西哥 SEO 页面
- `brazil-market-entry/`：巴西市场进入 SEO 页面
- `contact/`：独立联系我们页面

## Cloudflare Pages 设置

- 构建命令：留空
- 输出目录：项目根目录

项目不需要 `server.js`、传统后台管理、CRM 或 PM2。官网主体仍由 Cloudflare Pages 发布；咨询表单通过 Pages Functions 写入 Cloudflare D1 绑定 `LEADS_DB`。

配置线索数据库请参考 `docs/cloudflare-leads-setup.md`。

正式域名：`https://www.huadaoguoji.com/`

如果后续更换域名，需要同步更新 `index.html`、各落地页、`robots.txt` 和 `sitemap.xml` 中的域名。
