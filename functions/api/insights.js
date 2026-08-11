const COUNTRY_VALUES = new Set(["Mexico", "Brazil", "LATAM"]);
const CATEGORY_VALUES = new Set(["platform", "tax", "business", "logistics", "brand"]);
const STATUS_VALUES = new Set(["draft", "published"]);

const json = (body, status = 200) => new Response(JSON.stringify(body), {
    status,
    headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "no-store"
    }
});

const clean = (value, max = 1000) => String(value || "").trim().slice(0, max);

const getDb = (env) => env.INSIGHTS_DB || env.LEADS_DB;

const parseTags = (value) => {
    try {
        const tags = JSON.parse(value || "[]");
        return Array.isArray(tags) ? tags : [];
    } catch (error) {
        return [];
    }
};

const parseContent = (value) => {
    try {
        return JSON.parse(value || "{}");
    } catch (error) {
        return {};
    }
};

const publicFields = (row) => ({
    title: row.title,
    slug: row.slug,
    url: `/insights/${row.slug}/`,
    country: row.country,
    category: row.category,
    tags: parseTags(row.tags),
    summary: row.summary,
    publish_date: row.publish_date,
    update_date: row.update_date
});

export async function onRequestGet(context) {
    const { request, env } = context;
    const db = getDb(env);
    if (!db) {
        return json({ success: false, error: "市场情报数据库尚未配置。" }, 503);
    }

    const url = new URL(request.url);
    const slug = clean(url.searchParams.get("slug"), 120);
    const country = clean(url.searchParams.get("country"), 20);
    const category = clean(url.searchParams.get("category"), 30);
    const limit = Math.min(Math.max(Number(url.searchParams.get("limit") || 20), 1), 50);

    try {
        if (slug) {
            const row = await db.prepare(`
                SELECT title, slug, country, category, tags, summary, content, source, publish_date, update_date
                FROM market_insights
                WHERE slug = ? AND status = 'published'
                LIMIT 1
            `).bind(slug).first();

            if (!row) {
                return json({ success: false, error: "未找到已发布情报。" }, 404);
            }

            return json({
                success: true,
                insight: {
                    ...publicFields(row),
                    source: row.source,
                    content: parseContent(row.content)
                }
            });
        }

        const clauses = ["status = 'published'"];
        const values = [];
        if (COUNTRY_VALUES.has(country)) {
            clauses.push("country = ?");
            values.push(country);
        }
        if (CATEGORY_VALUES.has(category)) {
            clauses.push("category = ?");
            values.push(category);
        }

        const query = `
            SELECT title, slug, country, category, tags, summary, publish_date, update_date
            FROM market_insights
            WHERE ${clauses.join(" AND ")}
            ORDER BY publish_date DESC, update_date DESC, id DESC
            LIMIT ?
        `;
        const { results } = await db.prepare(query).bind(...values, limit).all();

        return json({
            success: true,
            count: results.length,
            insights: results.map(publicFields)
        });
    } catch (error) {
        return json({ success: false, error: "市场情报读取失败，请稍后重试。" }, 500);
    }
}

export async function onRequestPost(context) {
    const { request, env } = context;
    const db = getDb(env);
    if (!db) {
        return json({ success: false, error: "市场情报数据库尚未配置。" }, 503);
    }
    if (!env.INSIGHTS_WRITE_TOKEN) {
        return json({ success: false, error: "市场情报发布接口已预留，当前未开放公开写入。" }, 501);
    }

    const auth = request.headers.get("authorization") || "";
    if (auth !== `Bearer ${env.INSIGHTS_WRITE_TOKEN}`) {
        return json({ success: false, error: "Unauthorized" }, 401);
    }

    let payload;
    try {
        payload = await request.json();
    } catch (error) {
        return json({ success: false, error: "提交内容格式不正确。" }, 400);
    }

    const insight = {
        title: clean(payload.title, 180),
        slug: clean(payload.slug, 120),
        country: clean(payload.country, 20),
        category: clean(payload.category, 30),
        tags: Array.isArray(payload.tags) ? JSON.stringify(payload.tags.slice(0, 12).map((tag) => clean(tag, 40)).filter(Boolean)) : "[]",
        summary: clean(payload.summary, 500),
        content: typeof payload.content === "string" ? payload.content : JSON.stringify(payload.content || {}),
        source: clean(payload.source || "华道出海研究团队", 80),
        publish_date: clean(payload.publish_date || new Date().toISOString().slice(0, 10), 20),
        update_date: clean(payload.update_date || new Date().toISOString().slice(0, 10), 20),
        status: clean(payload.status || "draft", 20)
    };

    if (!insight.title || !insight.slug || !insight.summary || !insight.content) {
        return json({ success: false, error: "请填写标题、slug、摘要和正文内容。" }, 400);
    }
    if (!COUNTRY_VALUES.has(insight.country)) {
        return json({ success: false, error: "country 必须为 Mexico、Brazil 或 LATAM。" }, 400);
    }
    if (!CATEGORY_VALUES.has(insight.category)) {
        return json({ success: false, error: "category 必须为 platform、tax、business、logistics 或 brand。" }, 400);
    }
    if (!STATUS_VALUES.has(insight.status)) {
        return json({ success: false, error: "status 必须为 draft 或 published。" }, 400);
    }

    try {
        await db.prepare(`
            INSERT INTO market_insights (
                title,
                slug,
                country,
                category,
                tags,
                summary,
                content,
                source,
                publish_date,
                update_date,
                status
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(slug) DO UPDATE SET
                title = excluded.title,
                country = excluded.country,
                category = excluded.category,
                tags = excluded.tags,
                summary = excluded.summary,
                content = excluded.content,
                source = excluded.source,
                publish_date = excluded.publish_date,
                update_date = excluded.update_date,
                status = excluded.status,
                updated_at = datetime('now')
        `).bind(
            insight.title,
            insight.slug,
            insight.country,
            insight.category,
            insight.tags,
            insight.summary,
            insight.content,
            insight.source,
            insight.publish_date,
            insight.update_date,
            insight.status
        ).run();

        return json({ success: true, slug: insight.slug, status: insight.status });
    } catch (error) {
        return json({ success: false, error: "市场情报保存失败，请稍后重试。" }, 500);
    }
}

export async function onRequestOptions() {
    return new Response(null, { status: 204 });
}
