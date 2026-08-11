import {
    KEYWORD_LIBRARY,
    clean,
    getDb,
    json,
    normalizeNewsItem,
    scoreNews
} from "../_shared/intelligence.js";

const isAuthorized = (request, env) => {
    if (!env.INSIGHTS_WRITE_TOKEN) return false;
    const auth = request.headers.get("authorization") || "";
    const token = request.headers.get("x-admin-token") || "";
    return auth === `Bearer ${env.INSIGHTS_WRITE_TOKEN}` || token === env.INSIGHTS_WRITE_TOKEN;
};

const requireAdmin = (request, env) => {
    if (!env.INSIGHTS_WRITE_TOKEN) {
        return json({ success: false, error: "情报采集接口已预留，请先配置 INSIGHTS_WRITE_TOKEN。" }, 501);
    }
    if (!isAuthorized(request, env)) {
        return json({ success: false, error: "Unauthorized" }, 401);
    }
    return null;
};

export async function onRequestGet() {
    return json({
        success: true,
        module: "collect-insights",
        status: "ready",
        supported_sources: ["RSS", "News API", "Official announcements"],
        data_shape: {
            title: "",
            source: "",
            url: "",
            country: "Mexico | Brazil | LATAM",
            category: "platform | tax | business | logistics | brand",
            published_date: "YYYY-MM-DD"
        },
        keywords: KEYWORD_LIBRARY
    });
}

export async function onRequestPost(context) {
    const { request, env } = context;
    const adminError = requireAdmin(request, env);
    if (adminError) return adminError;

    const db = getDb(env);
    if (!db) {
        return json({ success: false, error: "市场情报数据库尚未配置。" }, 503);
    }

    let payload;
    try {
        payload = await request.json();
    } catch (error) {
        return json({ success: false, error: "提交内容格式不正确。" }, 400);
    }

    const rawItems = Array.isArray(payload.items) ? payload.items : [payload];
    const items = rawItems.slice(0, 20).map(normalizeNewsItem).filter((item) => item.title || item.url);
    if (!items.length) {
        return json({ success: false, error: "请提交至少一条新闻源数据。" }, 400);
    }

    const collected = [];
    const ignored = [];

    for (const item of items) {
        const score = scoreNews(item);
        const status = score.impact_level === "ignored" ? "ignored" : "collected";
        const row = {
            ...item,
            country: score.country,
            category: score.category,
            matched_keywords: score.matched_keywords,
            impact_score: score.impact_score,
            business_score: score.business_score,
            content_score: score.content_score,
            total_score: score.total_score,
            impact_level: score.impact_level,
            status
        };

        await db.prepare(`
            INSERT INTO insight_sources (
                title,
                source,
                url,
                country,
                category,
                published_date,
                matched_keywords,
                impact_score,
                business_score,
                content_score,
                total_score,
                impact_level,
                status
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(url) DO UPDATE SET
                title = excluded.title,
                source = excluded.source,
                country = excluded.country,
                category = excluded.category,
                published_date = excluded.published_date,
                matched_keywords = excluded.matched_keywords,
                impact_score = excluded.impact_score,
                business_score = excluded.business_score,
                content_score = excluded.content_score,
                total_score = excluded.total_score,
                impact_level = excluded.impact_level,
                status = excluded.status,
                updated_at = datetime('now')
        `).bind(
            row.title,
            row.source,
            row.url || `manual:${clean(row.title, 180)}`,
            row.country,
            row.category,
            row.published_date,
            JSON.stringify(row.matched_keywords),
            row.impact_score,
            row.business_score,
            row.content_score,
            row.total_score,
            row.impact_level,
            row.status
        ).run();

        if (status === "ignored") ignored.push(row);
        else collected.push(row);
    }

    return json({
        success: true,
        collected_count: collected.length,
        ignored_count: ignored.length,
        next_step: "/api/analyze-insight",
        collected,
        ignored
    });
}

export async function onRequestOptions() {
    return new Response(null, { status: 204 });
}
