import {
    CATEGORY_VALUES,
    COUNTRY_VALUES,
    clean,
    getDb,
    json,
    parseJson
} from "../_shared/intelligence.js";

const STATUS_VALUES = new Set(["draft", "published"]);
const REVIEW_VALUES = new Set(["pending", "approved", "rejected"]);

const isAuthorized = (request, env) => {
    if (!env.INSIGHTS_WRITE_TOKEN) return false;
    const auth = request.headers.get("authorization") || "";
    const token = request.headers.get("x-admin-token") || "";
    return auth === `Bearer ${env.INSIGHTS_WRITE_TOKEN}` || token === env.INSIGHTS_WRITE_TOKEN;
};

const requireAdmin = (request, env) => {
    if (!env.INSIGHTS_WRITE_TOKEN) {
        return json({ success: false, error: "市场情报管理接口已预留，请先配置 INSIGHTS_WRITE_TOKEN。" }, 501);
    }
    if (!isAuthorized(request, env)) {
        return json({ success: false, error: "Unauthorized" }, 401);
    }
    return null;
};

const parseTags = (value) => {
    const tags = parseJson(value, []);
    return Array.isArray(tags) ? tags : [];
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
    update_date: row.update_date,
    impact_level: row.impact_level || null
});

const adminFields = (row) => ({
    ...publicFields(row),
    id: row.id,
    source: row.source,
    source_url: row.source_url || "",
    source_published_date: row.source_published_date || "",
    content: parseJson(row.content, {}),
    status: row.status,
    ai_generated: Boolean(row.ai_generated),
    review_status: row.review_status || "pending",
    impact_score: Number(row.impact_score || 0),
    business_score: Number(row.business_score || 0),
    content_score: Number(row.content_score || 0),
    total_score: Number(row.total_score || 0),
    created_at: row.created_at,
    updated_at: row.updated_at
});

const tagsToJson = (tags) => Array.isArray(tags) ? JSON.stringify(tags.slice(0, 12).map((tag) => clean(tag, 40)).filter(Boolean)) : "[]";

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
    const requestedStatus = clean(url.searchParams.get("status") || "published", 20);
    const requestedReview = clean(url.searchParams.get("review_status"), 20);
    const adminMode = requestedStatus !== "published" || Boolean(requestedReview) || url.searchParams.get("admin") === "1";
    const limit = Math.min(Math.max(Number(url.searchParams.get("limit") || 20), 1), 100);

    if (adminMode) {
        const adminError = requireAdmin(request, env);
        if (adminError) return adminError;
    }

    try {
        if (slug) {
            const row = await db.prepare(`
                SELECT *
                FROM market_insights
                WHERE slug = ?
                ${adminMode ? "" : "AND status = 'published'"}
                LIMIT 1
            `).bind(slug).first();

            if (!row) {
                return json({ success: false, error: "未找到情报。" }, 404);
            }

            return json({
                success: true,
                insight: adminMode ? adminFields(row) : {
                    ...publicFields(row),
                    source: row.source,
                    content: parseJson(row.content, {})
                }
            });
        }

        const clauses = [];
        const values = [];
        if (adminMode) {
            if (STATUS_VALUES.has(requestedStatus)) {
                clauses.push("status = ?");
                values.push(requestedStatus);
            }
            if (REVIEW_VALUES.has(requestedReview)) {
                clauses.push("review_status = ?");
                values.push(requestedReview);
            }
        } else {
            clauses.push("status = 'published'");
        }
        if (COUNTRY_VALUES.has(country)) {
            clauses.push("country = ?");
            values.push(country);
        }
        if (CATEGORY_VALUES.has(category)) {
            clauses.push("category = ?");
            values.push(category);
        }

        const query = `
            SELECT *
            FROM market_insights
            WHERE ${clauses.length ? clauses.join(" AND ") : "1 = 1"}
            ORDER BY publish_date DESC, update_date DESC, id DESC
            LIMIT ?
        `;
        const { results } = await db.prepare(query).bind(...values, limit).all();

        return json({
            success: true,
            count: results.length,
            insights: results.map(adminMode ? adminFields : publicFields)
        });
    } catch (error) {
        return json({ success: false, error: "市场情报读取失败，请稍后重试。" }, 500);
    }
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

    const insight = normalizeInsightPayload(payload);
    const validation = validateInsight(insight);
    if (validation) return validation;

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
                status,
                impact_level,
                impact_score,
                business_score,
                content_score,
                total_score,
                ai_generated,
                review_status,
                source_url,
                source_published_date
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
                impact_level = excluded.impact_level,
                impact_score = excluded.impact_score,
                business_score = excluded.business_score,
                content_score = excluded.content_score,
                total_score = excluded.total_score,
                ai_generated = excluded.ai_generated,
                review_status = excluded.review_status,
                source_url = excluded.source_url,
                source_published_date = excluded.source_published_date,
                updated_at = datetime('now')
        `).bind(...bindInsight(insight)).run();

        return json({ success: true, slug: insight.slug, status: insight.status, review_status: insight.review_status });
    } catch (error) {
        return json({ success: false, error: "市场情报保存失败，请稍后重试。" }, 500);
    }
}

export async function onRequestPatch(context) {
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

    const slug = clean(payload.slug, 120);
    const action = clean(payload.action, 30);
    if (!slug) return json({ success: false, error: "请提供 slug。" }, 400);

    try {
        if (action === "approve") {
            await db.prepare("UPDATE market_insights SET review_status = 'approved', updated_at = datetime('now') WHERE slug = ?").bind(slug).run();
            return json({ success: true, slug, review_status: "approved" });
        }
        if (action === "reject") {
            await db.prepare("UPDATE market_insights SET review_status = 'rejected', status = 'draft', updated_at = datetime('now') WHERE slug = ?").bind(slug).run();
            return json({ success: true, slug, status: "draft", review_status: "rejected" });
        }
        if (action === "publish") {
            await db.prepare(`
                UPDATE market_insights
                SET review_status = 'approved',
                    status = 'published',
                    update_date = ?,
                    updated_at = datetime('now')
                WHERE slug = ?
            `).bind(new Date().toISOString().slice(0, 10), slug).run();
            return json({ success: true, slug, status: "published", review_status: "approved" });
        }

        const current = await db.prepare("SELECT * FROM market_insights WHERE slug = ? LIMIT 1").bind(slug).first();
        if (!current) return json({ success: false, error: "未找到情报。" }, 404);

        const insight = normalizeInsightPayload({
            ...current,
            ...payload,
            slug,
            tags: payload.tags || parseTags(current.tags),
            content: payload.content || parseJson(current.content, {}),
            ai_generated: current.ai_generated
        });
        const validation = validateInsight(insight);
        if (validation) return validation;

        await db.prepare(`
            UPDATE market_insights SET
                title = ?,
                country = ?,
                category = ?,
                tags = ?,
                summary = ?,
                content = ?,
                source = ?,
                publish_date = ?,
                update_date = ?,
                status = ?,
                impact_level = ?,
                impact_score = ?,
                business_score = ?,
                content_score = ?,
                total_score = ?,
                ai_generated = ?,
                review_status = ?,
                source_url = ?,
                source_published_date = ?,
                updated_at = datetime('now')
            WHERE slug = ?
        `).bind(...bindInsight(insight).filter((_, index) => index !== 1), slug).run();

        return json({ success: true, slug, status: insight.status, review_status: insight.review_status });
    } catch (error) {
        return json({ success: false, error: "市场情报更新失败，请稍后重试。" }, 500);
    }
}

export async function onRequestDelete(context) {
    const { request, env } = context;
    const adminError = requireAdmin(request, env);
    if (adminError) return adminError;

    const db = getDb(env);
    if (!db) {
        return json({ success: false, error: "市场情报数据库尚未配置。" }, 503);
    }

    const url = new URL(request.url);
    const slug = clean(url.searchParams.get("slug"), 120);
    if (!slug) return json({ success: false, error: "请提供 slug。" }, 400);

    try {
        const result = await db.prepare("DELETE FROM market_insights WHERE slug = ?").bind(slug).run();
        return json({ success: true, slug, changes: result.meta?.changes || 0 });
    } catch (error) {
        return json({ success: false, error: "市场情报删除失败，请稍后重试。" }, 500);
    }
}

export async function onRequestOptions() {
    return new Response(null, { status: 204 });
}

function normalizeInsightPayload(payload) {
    const status = clean(payload.status || "draft", 20);
    return {
        title: clean(payload.title, 220),
        slug: clean(payload.slug, 120),
        country: clean(payload.country, 20),
        category: clean(payload.category, 30),
        tags: tagsToJson(payload.tags),
        summary: clean(payload.summary, 600),
        content: typeof payload.content === "string" ? payload.content : JSON.stringify(payload.content || {}),
        source: clean(payload.source || "华道出海研究团队", 120),
        publish_date: clean(payload.publish_date || new Date().toISOString().slice(0, 10), 20),
        update_date: clean(payload.update_date || new Date().toISOString().slice(0, 10), 20),
        status,
        impact_level: clean(payload.impact_level || "B", 20),
        impact_score: Math.min(Math.max(Number(payload.impact_score || 0), 0), 10),
        business_score: Math.min(Math.max(Number(payload.business_score || 0), 0), 10),
        content_score: Math.min(Math.max(Number(payload.content_score || 0), 0), 10),
        total_score: Math.min(Math.max(Number(payload.total_score || 0), 0), 30),
        ai_generated: payload.ai_generated ? 1 : 0,
        review_status: clean(payload.review_status || (status === "published" ? "approved" : "pending"), 20),
        source_url: clean(payload.source_url, 600),
        source_published_date: clean(payload.source_published_date, 20)
    };
}

function validateInsight(insight) {
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
    if (!REVIEW_VALUES.has(insight.review_status)) {
        return json({ success: false, error: "review_status 必须为 pending、approved 或 rejected。" }, 400);
    }
    return null;
}

function bindInsight(insight) {
    return [
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
        insight.status,
        insight.impact_level,
        insight.impact_score,
        insight.business_score,
        insight.content_score,
        insight.total_score,
        insight.ai_generated,
        insight.review_status,
        insight.source_url,
        insight.source_published_date
    ];
}
