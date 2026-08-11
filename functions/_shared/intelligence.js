export const COUNTRY_VALUES = new Set(["Mexico", "Brazil", "LATAM"]);
export const CATEGORY_VALUES = new Set(["platform", "tax", "business", "logistics", "brand"]);

export const COUNTRY_LABELS = {
    Mexico: "墨西哥",
    Brazil: "巴西",
    LATAM: "拉美"
};

export const CATEGORY_LABELS = {
    platform: "平台动态",
    tax: "税务合规",
    business: "商业环境",
    logistics: "供应链与物流",
    brand: "品牌本地化"
};

export const KEYWORD_LIBRARY = {
    Mexico: [
        "Mercado Libre Mexico",
        "Mercado Libre MX",
        "TikTok Shop Mexico",
        "RFC Mexico",
        "SAT Mexico",
        "Mexico ecommerce",
        "Mexico import tax"
    ],
    Brazil: [
        "Mercado Livre Brazil",
        "TikTok Shop Brazil",
        "CNPJ Brazil",
        "Brazil tax reform",
        "Brazil ecommerce",
        "ICMS",
        "CBS",
        "IBS"
    ],
    LATAM: [
        "LATAM ecommerce",
        "China Latin America trade",
        "Chinese brands Latin America"
    ]
};

const PLATFORM_TERMS = ["mercado libre", "mercado livre", "tiktok shop", "temu", "shein", "marketplace", "platform", "平台", "美客多"];
const TAX_TERMS = ["rfc", "sat", "cnpj", "icms", "cbs", "ibs", "tax", "税", "合规", "发票"];
const LOGISTICS_TERMS = ["import", "customs", "logistics", "warehouse", "fulfillment", "清关", "物流", "仓"];
const BRAND_TERMS = ["brand", "consumer", "marketing", "creator", "influencer", "品牌", "达人", "内容", "消费者"];
const SELLER_IMPACT_TERMS = ["seller", "merchant", "cross-border", "ecommerce", "shop", "store", "中国", "卖家", "跨境", "电商", "本土店"];

export const clean = (value, max = 1000) => String(value || "").trim().slice(0, max);

export const json = (body, status = 200) => new Response(JSON.stringify(body), {
    status,
    headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "no-store"
    }
});

export const getDb = (env) => env.INSIGHTS_DB || env.LEADS_DB;

export const parseJson = (value, fallback) => {
    try {
        return JSON.parse(value || "");
    } catch (error) {
        return fallback;
    }
};

export const normalizeDate = (value) => {
    const raw = clean(value, 40);
    if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
    const parsed = raw ? new Date(raw) : new Date();
    if (Number.isNaN(parsed.getTime())) return new Date().toISOString().slice(0, 10);
    return parsed.toISOString().slice(0, 10);
};

export const normalizeNewsItem = (payload = {}) => ({
    title: clean(payload.title, 240),
    source: clean(payload.source || "未标注来源", 120),
    url: clean(payload.url, 600),
    country: clean(payload.country, 20),
    category: clean(payload.category, 30),
    published_date: normalizeDate(payload.published_date || payload.publish_date || payload.date),
    content: clean(payload.content || payload.summary || payload.description, 5000)
});

const lower = (value) => String(value || "").toLowerCase();

const hasAny = (text, terms) => terms.some((term) => text.includes(lower(term)));

export const inferCountry = (item) => {
    if (COUNTRY_VALUES.has(item.country)) return item.country;
    const text = lower(`${item.title} ${item.source} ${item.url} ${item.content}`);
    if (text.includes("brazil") || text.includes("brasil") || text.includes("cnpj") || text.includes("icms")) return "Brazil";
    if (text.includes("mexico") || text.includes("méxico") || text.includes("rfc") || text.includes("sat mexico")) return "Mexico";
    return "LATAM";
};

export const inferCategory = (item) => {
    if (CATEGORY_VALUES.has(item.category)) return item.category;
    const text = lower(`${item.title} ${item.content}`);
    if (hasAny(text, PLATFORM_TERMS)) return "platform";
    if (hasAny(text, TAX_TERMS)) return "tax";
    if (hasAny(text, LOGISTICS_TERMS)) return "logistics";
    if (hasAny(text, BRAND_TERMS)) return "brand";
    return "business";
};

export const matchKeywords = (item) => {
    const text = lower(`${item.title} ${item.source} ${item.url} ${item.content}`);
    const matches = [];
    for (const keywords of Object.values(KEYWORD_LIBRARY)) {
        for (const keyword of keywords) {
            if (text.includes(lower(keyword))) matches.push(keyword);
        }
    }
    return [...new Set(matches)];
};

export const scoreNews = (item) => {
    const country = inferCountry(item);
    const category = inferCategory(item);
    const text = lower(`${item.title} ${item.source} ${item.url} ${item.content}`);
    const matched_keywords = matchKeywords(item);
    const platformHit = hasAny(text, PLATFORM_TERMS);
    const taxHit = hasAny(text, TAX_TERMS);
    const logisticsHit = hasAny(text, LOGISTICS_TERMS);
    const brandHit = hasAny(text, BRAND_TERMS);
    const sellerHit = hasAny(text, SELLER_IMPACT_TERMS);

    const impact_score = Math.min(10, (sellerHit ? 4 : 1) + (platformHit ? 2 : 0) + (taxHit ? 2 : 0) + (logisticsHit ? 1 : 0) + Math.min(2, matched_keywords.length));
    const business_score = Math.min(10, (country !== "LATAM" ? 2 : 1) + (platformHit ? 2 : 0) + (taxHit ? 2 : 0) + (brandHit ? 1 : 0) + Math.min(3, matched_keywords.length));
    const content_score = Math.min(10, (item.title ? 2 : 0) + (item.url ? 2 : 0) + (item.source ? 1 : 0) + (item.content.length > 180 ? 3 : item.content.length > 60 ? 2 : 1) + (item.published_date ? 1 : 0));
    const total_score = impact_score + business_score + content_score;

    let impact_level = "ignored";
    if (total_score >= 25) impact_level = "S";
    else if (total_score >= 18) impact_level = "A";
    else if (total_score >= 10) impact_level = "B";

    return {
        country,
        category,
        matched_keywords,
        impact_score,
        business_score,
        content_score,
        total_score,
        impact_level
    };
};

const hashString = (value) => {
    let hash = 0;
    for (let i = 0; i < value.length; i += 1) {
        hash = ((hash << 5) - hash + value.charCodeAt(i)) | 0;
    }
    return Math.abs(hash).toString(36).slice(0, 6).padStart(6, "0");
};

export const buildDraftSlug = (item, score) => {
    const date = normalizeDate(item.published_date).replaceAll("-", "");
    return `ai-${score.country.toLowerCase()}-${score.category}-${date}-${hashString(`${item.title}|${item.url}`)}`;
};

const platformName = (item) => {
    const text = lower(`${item.title} ${item.content}`);
    if (text.includes("tiktok")) return "TikTok Shop";
    if (text.includes("mercado livre")) return "Mercado Livre";
    if (text.includes("mercado libre")) return "Mercado Libre";
    if (text.includes("temu")) return "Temu";
    if (text.includes("shein")) return "SHEIN";
    return "平台";
};

export const buildDraftAnalysis = (item, score) => {
    const countryLabel = COUNTRY_LABELS[score.country] || "拉美";
    const categoryLabel = CATEGORY_LABELS[score.category] || "市场动态";
    const platform = platformName(item);
    const title = `${countryLabel}${categoryLabel}观察：${item.title}`;
    const shortSource = item.source ? `来自 ${item.source} 的信息显示，` : "";
    const eventText = item.content || item.title;

    const content = {
        sections: {
            background: [
                `${shortSource}${eventText}`,
                `从拉美市场进入角度看，这类变化需要结合${countryLabel}的主体、税务、平台资料和履约能力一起判断，不能只按单条新闻理解。`
            ],
            why: [
                `${countryLabel}市场的${categoryLabel}变化，往往会影响中国企业的平台准入、资料审核、税务衔接和长期经营稳定性。`,
                `如果企业已经在评估 ${platform}、本土店或品牌出海，这条信息值得纳入进入路径和资源投入判断。`
            ],
            impact: [
                `对中国卖家而言，影响重点在于是否需要提前准备本地主体、税号、平台资料、收付款和售后履约能力。`,
                `已有跨境店铺、准备升级本土店、或希望通过内容电商进入${countryLabel}的企业，应关注后续规则、平台入口和合规要求。`
            ],
            observation: [
                `华道观察认为，这类情报的价值不在于短期追热点，而在于帮助企业判断本地化经营底座是否已经准备充分。主体、税务和平台资料越早前置，越能降低后续经营中断风险。`
            ],
            actions: [
                `核对企业现阶段是否已经具备${countryLabel}本地主体或税号准备路径。`,
                `评估该变化对 ${platform} 店铺、内容运营、收款、履约和售后流程的影响。`,
                "将主体搭建、平台落地和财税合规放入同一张执行清单。",
                "在人工审核后再决定是否发布为正式市场情报，避免未验证信息直接公开。"
            ]
        },
        source_news: {
            title: item.title,
            source: item.source,
            url: item.url,
            published_date: item.published_date
        },
        scores: {
            impact_score: score.impact_score,
            business_score: score.business_score,
            content_score: score.content_score,
            total_score: score.total_score,
            impact_level: score.impact_level
        }
    };

    return {
        title,
        summary: `${countryLabel}${categoryLabel}更新可能影响中国企业在拉美的平台、本土主体、税务和长期经营准备，建议纳入进入方案评估。`,
        content,
        country: score.country,
        category: score.category,
        impact_level: score.impact_level
    };
};
