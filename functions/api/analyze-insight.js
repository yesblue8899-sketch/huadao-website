import {
    buildDraftAnalysis,
    buildDraftSlug,
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
        return json({ success: false, error: "AI情报分析接口已预留，请先配置 INSIGHTS_WRITE_TOKEN。" }, 501);
    }
    if (!isAuthorized(request, env)) {
        return json({ success: false, error: "Unauthorized" }, 401);
    }
    return null;
};

const normalizeDraft = (draft, item, score) => ({
    title: clean(draft.title || item.title, 220),
    summary: clean(draft.summary, 600),
    content: draft.content && typeof draft.content === "object" ? draft.content : buildDraftAnalysis(item, score).content,
    country: score.country,
    category: score.category,
    impact_level: score.impact_level
});

const extractJson = (value) => {
    const text = String(value || "").trim();
    if (!text) return null;
    const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
    const raw = fenced ? fenced[1] : text;
    const start = raw.indexOf("{");
    const end = raw.lastIndexOf("}");
    if (start === -1 || end === -1 || end <= start) return null;

    try {
        return JSON.parse(raw.slice(start, end + 1));
    } catch (error) {
        return null;
    }
};

const buildWorkersAiPrompt = (item, score) => `
You are Huadao's LATAM market intelligence analyst.
Generate a Chinese draft insight for Chinese companies entering Mexico, Brazil, or LATAM.
Do not invent statistics, customers, policies, or news facts.
Keep the draft suitable for human review before publishing.

Return strict JSON only:
{
  "title": "",
  "summary": "",
  "content": {
    "sections": {
      "background": [],
      "why": [],
      "impact": [],
      "observation": [],
      "actions": []
    }
  }
}

News:
Title: ${item.title}
Source: ${item.source}
URL: ${item.url}
Published date: ${item.published_date}
Country: ${score.country}
Category: ${score.category}
Matched keywords: ${score.matched_keywords.join(", ")}
Scores: impact ${score.impact_score}, business ${score.business_score}, content ${score.content_score}, total ${score.total_score}, level ${score.impact_level}
Content: ${item.content}
`.trim();

const buildProviderDraft = async (env, item, score) => {
    if (!env.AI || typeof env.AI.run !== "function") return null;

    try {
        const model = env.INSIGHTS_AI_MODEL || "@cf/meta/llama-3.1-8b-instruct";
        const response = await env.AI.run(model, {
            messages: [
                {
                    role: "system",
                    content: "Return only valid JSON. The article must stay draft-only and require human review."
                },
                {
                    role: "user",
                    content: buildWorkersAiPrompt(item, score)
                }
            ]
        });
        const text = response?.response || response?.text || response?.result || "";
        const parsed = extractJson(typeof text === "string" ? text : JSON.stringify(text));
        return parsed ? normalizeDraft(parsed, item, score) : null;
    } catch (error) {
        return null;
    }
};

export async function onRequestGet() {
    return json({
        success: true,
        module: "analyze-insight",
        status: "ready",
        output_shape: {
            title: "",
            summary: "",
            content: {
                sections: {
                    background: [],
                    why: [],
                    impact: [],
                    observation: [],
                    actions: []
                }
            },
            country: "Mexico | Brazil | LATAM",
            category: "platform | tax | business | logistics | brand",
            impact_level: "S | A | B | ignored"
        },
        ai_provider: "Cloudflare Workers AI binding named AI is supported when configured; otherwise the Function uses server-side structured draft generation.",
        publishing_rule: "AI生成内容只保存为 draft，review_status 默认为 pending。"
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

    const item = normalizeNewsItem(payload);
    if (!item.title || !item.content) {
        return json({ success: false, error: "请提交新闻标题和正文内容。" }, 400);
    }

    const score = scoreNews(item);
    if (score.impact_level === "ignored") {
        return json({
            success: true,
            ignored: true,
            reason: "综合评分低于10，未生成草稿。",
            scores: score
        });
    }

    const providerDraft = await buildProviderDraft(env, item, score);
    const draft = providerDraft || normalizeDraft(buildDraftAnalysis(item, score), item, score);
    const slug = clean(payload.slug, 120) || buildDraftSlug(item, score);
    const today = new Date().toISOString().slice(0, 10);
    const publishDate = item.published_date || today;
    const tags = [
        item.source,
        score.country,
        score.category,
        ...score.matched_keywords
    ].filter(Boolean).slice(0, 12);

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
                status = 'draft',
                impact_level = excluded.impact_level,
                impact_score = excluded.impact_score,
                business_score = excluded.business_score,
                content_score = excluded.content_score,
                total_score = excluded.total_score,
                ai_generated = 1,
                review_status = 'pending',
                source_url = excluded.source_url,
                source_published_date = excluded.source_published_date,
                updated_at = datetime('now')
        `).bind(
            draft.title,
            slug,
            draft.country,
            draft.category,
            JSON.stringify(tags),
            draft.summary,
            JSON.stringify(draft.content),
            item.source || "AI拉美市场情报助手",
            publishDate,
            today,
            "draft",
            draft.impact_level,
            score.impact_score,
            score.business_score,
            score.content_score,
            score.total_score,
            1,
            "pending",
            item.url,
            item.published_date
        ).run();

        await db.prepare(`
            UPDATE insight_sources
            SET status = 'analyzed', updated_at = datetime('now')
            WHERE url = ?
        `).bind(item.url || `manual:${clean(item.title, 180)}`).run().catch(() => null);

        return json({
            success: true,
            status: "draft",
            review_status: "pending",
            slug,
            generated: draft,
            scores: score,
            source_news: {
                title: item.title,
                source: item.source,
                url: item.url,
                published_date: item.published_date
            }
        });
    } catch (error) {
        return json({ success: false, error: "AI情报草稿保存失败，请稍后重试。" }, 500);
    }
}

export async function onRequestOptions() {
    return new Response(null, { status: 204 });
}
